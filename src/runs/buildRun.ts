import type { Coord, Layout, PalletLine, RunPalletResult, RunResult, SkuMaster } from '../models/domain';
import { findSingleCell, hashLayout, keyOf } from '../utils/layout';
import { buildGraph, findPath } from '../routing/pathfinding';
import { createRunBuildError, normalizeRunBuildError, type RunBuildContext } from './errors';
import { buildRunName } from '../utils/runName';

const isDev = import.meta.env.DEV;
const DEFAULT_CHUNK_SIZE = 50;
const ROUTE_CACHE_CAP = 6000;
const ROUTE_CACHE_EVICT_BATCH = 1200;
const UNEXPECTED_ERROR_ABORT_THRESHOLD = 25;

const hashSkuMaster = (master: SkuMaster): string => {
  const serialized = JSON.stringify(master.rows ?? []);
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `sku-${(hash >>> 0).toString(16)}`;
};

const yieldToBrowser = async () => {
  if (typeof window === 'undefined') return;
  await new Promise<void>((resolve) => {
    const fallback = () => window.setTimeout(resolve, 0);
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout: 50 });
      return;
    }
    fallback();
  });
};

const safeCoord = (coord: Coord | undefined): Coord | undefined => {
  if (!coord) return undefined;
  const x = Number(coord.x);
  const y = Number(coord.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return { x, y };
};

const buildAccessByLocation = (layout: Layout): Map<string, Coord> => {
  const map = new Map<string, Coord>();
  for (let y = 0; y < layout.height; y += 1) {
    const row = layout.gridData?.[y];
    if (!row) continue;
    for (let x = 0; x < layout.width; x += 1) {
      const cell = row[x];
      if (!cell || cell.type !== 'PICK' || !cell.pick?.locationId) continue;
      const accessCell = safeCoord(cell.pick.accessCell);
      if (accessCell) map.set(cell.pick.locationId, accessCell);
    }
  }
  return map;
};

const buildStageContext = (stage: string, base?: Partial<RunBuildContext>): RunBuildContext => ({
  stage,
  ...base,
});

const toSerializableHeatmap = (heatmapRows: Uint32Array[]): number[][] => heatmapRows.map((row) => Array.from(row));

const shouldAbortPalletLoop = (unexpectedErrors: number): boolean => unexpectedErrors >= UNEXPECTED_ERROR_ABORT_THRESHOLD;

const createRouteCacheSet = (cache: Map<string, Coord[]>, key: string, value: Coord[]): void => {
  cache.set(key, value);
  if (cache.size <= ROUTE_CACHE_CAP) return;
  for (let i = 0; i < ROUTE_CACHE_EVICT_BATCH; i += 1) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
};

export interface RunBuildWarnings {
  palletsWithIssues: number;
  palletsWithoutPath: number;
  missingSkuMappings: number;
}

export interface RunBuildProgress {
  stage: 'preparando' | 'calculando' | 'guardando';
  processed: number;
  total: number;
}

export interface BuildRunOptions {
  chunkSize?: number;
  onProgress?: (progress: RunBuildProgress) => void;
}

export const buildRun = async (
  layout: Layout,
  skuMaster: SkuMaster,
  lines: PalletLine[],
  xlsxFileName: string,
  options: BuildRunOptions = {},
): Promise<{ run: RunResult; warnings: RunBuildWarnings }> => {
  if (!layout?.layoutId || !Array.isArray(layout.gridData)) {
    throw createRunBuildError('validation', 'Layout inválido.', ['No se encontró estructura de grilla válida.'], buildStageContext('preparando'));
  }
  if (!skuMaster?.skuMasterId || !skuMaster.index) {
    throw createRunBuildError('validation', 'SKU Master inválido.', ['No se encontró índice de mapeo SKU.'], buildStageContext('preparando'));
  }
  if (!Array.isArray(lines) || !lines.length) {
    throw createRunBuildError('validation', 'Debe cargar un XLSX con líneas válidas.', undefined, buildStageContext('preparando'));
  }

  const start = findSingleCell(layout, 'START');
  const end = findSingleCell(layout, 'END');
  if (!start || !end) {
    throw createRunBuildError('validation', 'Layout inválido: se requiere 1 START y 1 END.', undefined, buildStageContext('preparando'));
  }

  const grouped = new Map<string, string[]>();
  lines.forEach((line, index) => {
    const palletId = String(line?.pallet_id ?? '').trim();
    const sku = String(line?.sku ?? '').trim();
    if (!palletId || !sku) {
      throw createRunBuildError('data', 'El XLSX contiene filas inválidas.', [`Fila ${index + 1}: pallet_id o sku vacío.`], buildStageContext('preparando'));
    }
    const current = grouped.get(palletId) ?? [];
    current.push(sku);
    grouped.set(palletId, current);
  });

  if (skuMaster.rows.length === 0 || Object.keys(skuMaster.index).length === 0) {
    throw createRunBuildError('validation', 'SKU Master inválido.', ['No contiene filas para mapear SKUs.'], buildStageContext('preparando'));
  }

  let graph;
  try {
    graph = buildGraph(layout);
  } catch (error) {
    throw createRunBuildError('routing', 'No se pudo inicializar el cálculo de rutas.', [
      error instanceof Error ? error.message : 'Error desconocido en pathfinding.',
    ], buildStageContext('preparando'));
  }

  const palletEntries = Array.from(grouped.entries());
  const totalPallets = palletEntries.length;
  const onProgress = options.onProgress;
  const chunkSize = Math.max(25, Math.min(100, options.chunkSize ?? DEFAULT_CHUNK_SIZE));

  onProgress?.({ stage: 'preparando', processed: 0, total: totalPallets });
  await yieldToBrowser();

  const accessByLocation = buildAccessByLocation(layout);
  const heatmapRows = Array.from({ length: layout.height }, () => new Uint32Array(layout.width));
  const cache = new Map<string, Coord[]>();

  const palletResults: RunPalletResult[] = [];
  let unexpectedErrors = 0;

  for (let palletIndex = 0; palletIndex < palletEntries.length; palletIndex += 1) {
    if (palletIndex % chunkSize === 0) {
      onProgress?.({ stage: 'calculando', processed: palletIndex, total: totalPallets });
      await yieldToBrowser();
    }

    if (isDev && palletIndex > 0 && palletIndex % 100 === 0) {
      console.debug(`[run-builder] Processed ${palletIndex}/${totalPallets}`);
    }

    const [palletId, skus] = palletEntries[palletIndex];

    try {
      const issues: string[] = [];
      const unresolvedPickPlan: { sku: string; locationId: string; sequence: number; accessX: number; accessY: number; status?: 'missing'; orderIndex: number }[] = [];

      const uniqueSkus = [...new Set(skus)];
      let missingSkuCount = 0;
      uniqueSkus.forEach((sku, orderIndex) => {
        const optionsForSku = skuMaster.index?.[sku];
        if (!Array.isArray(optionsForSku) || optionsForSku.length === 0) {
          issues.push(`SKU ${sku} sin mapping en SKU Master`);
          missingSkuCount += 1;
          unresolvedPickPlan.push({ sku, locationId: 'N/A', sequence: Number.MAX_SAFE_INTEGER, accessX: -1, accessY: -1, status: 'missing', orderIndex });
          return;
        }
        const selected = [...optionsForSku].sort((a, b) => {
          const sequenceDelta = ((Number(a.sequence) || Number.MAX_SAFE_INTEGER) - (Number(b.sequence) || Number.MAX_SAFE_INTEGER));
          if (sequenceDelta !== 0) return sequenceDelta;
          return a.locationId.localeCompare(b.locationId);
        })[0];
        const accessCell = accessByLocation.get(selected.locationId);
        if (!accessCell) {
          issues.push(`Ubicación ${selected.locationId} (SKU ${sku}) no existe o no es accesible en layout`);
          unresolvedPickPlan.push({ sku, locationId: selected.locationId, sequence: Number(selected.sequence) || Number.MAX_SAFE_INTEGER, accessX: -1, accessY: -1, status: 'missing', orderIndex });
          return;
        }
        const sequence = Number(selected.sequence);
        const safeSequence = Number.isFinite(sequence) ? sequence : Number.MAX_SAFE_INTEGER;
        unresolvedPickPlan.push({ sku, locationId: selected.locationId, sequence: safeSequence, accessX: accessCell.x, accessY: accessCell.y, orderIndex });
      });

      const pickPlanByLocation = new Map<string, { sku: string; locationId: string; sequence: number; accessX: number; accessY: number; orderIndex: number; status?: 'missing'; skusInLocation: string[] }>();
      unresolvedPickPlan.forEach((pick) => {
        if (pick.status === 'missing') return;
        const current = pickPlanByLocation.get(pick.locationId);
        if (!current) {
          pickPlanByLocation.set(pick.locationId, { ...pick, skusInLocation: [pick.sku] });
          return;
        }

        const nextSkus = current.skusInLocation.includes(pick.sku) ? current.skusInLocation : [...current.skusInLocation, pick.sku].sort((a, b) => a.localeCompare(b));
        const shouldReplace = pick.sequence < current.sequence || (pick.sequence === current.sequence && pick.sku.localeCompare(current.sku) < 0);
        if (shouldReplace) {
          pickPlanByLocation.set(pick.locationId, { ...pick, skusInLocation: nextSkus });
          return;
        }

        pickPlanByLocation.set(pick.locationId, { ...current, skusInLocation: nextSkus });
      });

      const normalizedPickPlan = [
        ...Array.from(pickPlanByLocation.values()),
        ...unresolvedPickPlan.filter((pick) => pick.status === 'missing'),
      ].sort((a, b) => {
        const sequenceDelta = a.sequence - b.sequence;
        if (sequenceDelta !== 0) return sequenceDelta;
        const skuDelta = a.sku.localeCompare(b.sku);
        if (skuDelta !== 0) return skuDelta;
        const locationDelta = a.locationId.localeCompare(b.locationId);
        if (locationDelta !== 0) return locationDelta;
        return a.orderIndex - b.orderIndex;
      });

      const pickPlan = normalizedPickPlan.map(({ orderIndex, ...item }) => item);
      const stops = pickPlan
        .filter((item) => item.status !== 'missing')
        .map((item) => ({
          sku: item.sku,
          locationId: item.locationId,
          sequence: item.sequence,
          accessCell: { x: item.accessX, y: item.accessY },
        }));

      let steps = 0;
      let hasPath = true;
      const pathStops = [start, ...stops.map((stop) => stop.accessCell), end];
      for (let i = 0; i < pathStops.length - 1; i += 1) {
        const a = pathStops[i];
        const b = pathStops[i + 1];
        const segmentKey = `${layout.layoutId}:${keyOf(a)}->${keyOf(b)}`;
        let path = cache.get(segmentKey);
        if (!path) {
          path = findPath(graph, a, b) ?? undefined;
          if (path) createRouteCacheSet(cache, segmentKey, path);
        }

        if (!path) {
          hasPath = false;
          issues.push(`Sin ruta entre ${keyOf(a)} y ${keyOf(b)}`);
          continue;
        }

        path.forEach((coord, idx) => {
          if (idx === 0 && i > 0) return;
          if (!heatmapRows[coord.y]) return;
          heatmapRows[coord.y][coord.x] += 1;
          steps += 1;
        });
      }

      palletResults.push({
        palletId,
        skuCount: uniqueSkus.length,
        missingSkuCount,
        steps,
        hasPath,
        issues,
        stops: stops.map((stop) => ({ locationId: stop.locationId, sequence: stop.sequence })),
        pickPlan,
      });
    } catch (error) {
      unexpectedErrors += 1;
      const normalized = normalizeRunBuildError(error, `Error procesando pallet ${palletId}.`, buildStageContext('calculando', { palletId, palletIndex }));
      const details = normalized.details?.length ? normalized.details : [normalized.message];

      palletResults.push({
        palletId,
        skuCount: new Set(skus).size,
        missingSkuCount: 0,
        steps: 0,
        hasPath: false,
        issues: details,
        stops: [],
      });

      if (isDev) {
        console.error('[run-builder] error en pallet', {
          palletId,
          palletIndex,
          message: normalized.message,
          stack: normalized.stack,
        });
      }

      if (shouldAbortPalletLoop(unexpectedErrors)) {
        throw createRunBuildError(
          'unexpected',
          'Se detectaron demasiados errores inesperados durante el cálculo. Se abortó la generación.',
          ['Revise el diagnóstico para identificar el pallet conflictivo.'],
          buildStageContext('calculando', { palletId, palletIndex }),
          normalized.stack,
        );
      }
    }
  }

  onProgress?.({ stage: 'guardando', processed: totalPallets, total: totalPallets });
  await yieldToBrowser();

  const now = new Date();
  const layoutHash = hashLayout(layout);
  const runId = crypto.randomUUID();
  const run: RunResult = {
    runId,
    name: buildRunName(now, layout.name, skuMaster.name, xlsxFileName),
    createdAt: now.toISOString(),
    layoutId: layout.layoutId,
    skuMasterId: skuMaster.skuMasterId,
    layoutHash,
    skuMasterHash: hashSkuMaster(skuMaster),
    summary: {
      totalPallets: palletResults.length,
      okPallets: palletResults.filter((item) => item.issues.length === 0).length,
      errorPallets: palletResults.filter((item) => item.issues.length > 0).length,
      totalSteps: palletResults.reduce((acc, item) => acc + item.steps, 0),
      avgSteps: palletResults.length ? palletResults.reduce((acc, item) => acc + item.steps, 0) / palletResults.length : 0,
    },
    palletOrder: palletResults.map((item) => item.palletId),
    palletResults,
    heatmapSteps: toSerializableHeatmap(heatmapRows),
  };

  const warnings: RunBuildWarnings = {
    palletsWithIssues: palletResults.filter((item) => item.issues.length > 0).length,
    palletsWithoutPath: palletResults.filter((item) => !item.hasPath).length,
    missingSkuMappings: palletResults.reduce((acc, item) => acc + (item.missingSkuCount ?? 0), 0),
  };

  return { run, warnings };
};
