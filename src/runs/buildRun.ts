import type { Coord, Layout, PalletLine, RunPalletResult, RunResult, SkuMaster } from '../models/domain';
import { findSingleCell, hashLayout, keyOf } from '../utils/layout';
import { buildGraph, findPath } from '../routing/pathfinding';
import { createRunBuildError } from './errors';

const sanitize = (value: string): string => value.replace(/\s+/g, '_').replace(/[^\w-]/g, '_');

const formatRunName = (date: Date, layoutName: string, skuMasterName: string): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}_${sanitize(layoutName)}_${sanitize(skuMasterName)}`;
};

const hashSkuMaster = (master: SkuMaster): string => {
  const serialized = JSON.stringify(master.rows ?? []);
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `sku-${(hash >>> 0).toString(16)}`;
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

export interface RunBuildWarnings {
  palletsWithIssues: number;
  palletsWithoutPath: number;
  missingSkuMappings: number;
}

export const buildRun = (layout: Layout, skuMaster: SkuMaster, lines: PalletLine[]): { run: RunResult; warnings: RunBuildWarnings } => {
  if (!layout?.layoutId || !Array.isArray(layout.gridData)) {
    throw createRunBuildError('validation', 'Layout inválido.', ['No se encontró estructura de grilla válida.']);
  }
  if (!skuMaster?.skuMasterId || !skuMaster.index) {
    throw createRunBuildError('validation', 'SKU Master inválido.', ['No se encontró índice de mapeo SKU.']);
  }
  if (!Array.isArray(lines) || !lines.length) {
    throw createRunBuildError('validation', 'Debe cargar un XLSX con líneas válidas.');
  }

  const start = findSingleCell(layout, 'START');
  const end = findSingleCell(layout, 'END');
  if (!start || !end) {
    throw createRunBuildError('validation', 'Layout inválido: se requiere 1 START y 1 END.');
  }

  const grouped = new Map<string, string[]>();
  lines.forEach((line, index) => {
    const palletId = String(line?.pallet_id ?? '').trim();
    const sku = String(line?.sku ?? '').trim();
    if (!palletId || !sku) {
      throw createRunBuildError('data', 'El XLSX contiene filas inválidas.', [`Fila ${index + 1}: pallet_id o sku vacío.`]);
    }
    const current = grouped.get(palletId) ?? [];
    current.push(sku);
    grouped.set(palletId, current);
  });

  let graph;
  try {
    graph = buildGraph(layout);
  } catch (error) {
    throw createRunBuildError('routing', 'No se pudo inicializar el cálculo de rutas.', [
      error instanceof Error ? error.message : 'Error desconocido en pathfinding.',
    ]);
  }

  const accessByLocation = buildAccessByLocation(layout);
  const heatmap = Array.from({ length: layout.height }, () => Array.from({ length: layout.width }, () => 0));
  const cache = new Map<string, Coord[]>();

  const palletResults: RunPalletResult[] = [];
  grouped.forEach((skus, palletId) => {
    const issues: string[] = [];
    const stops: { sku: string; locationId: string; sequence: number; accessCell: Coord }[] = [];

    const uniqueSkus = [...new Set(skus)];
    let missingSkuCount = 0;
    uniqueSkus.forEach((sku) => {
      const options = skuMaster.index?.[sku];
      if (!Array.isArray(options) || options.length === 0) {
        issues.push(`SKU ${sku} sin mapping en SKU Master`);
        missingSkuCount += 1;
        return;
      }
      const selected = options[0];
      const accessCell = accessByLocation.get(selected.locationId);
      if (!accessCell) {
        issues.push(`Ubicación ${selected.locationId} (SKU ${sku}) no existe o no es accesible en layout`);
        return;
      }
      const sequence = Number(selected.sequence);
      stops.push({ sku, locationId: selected.locationId, sequence: Number.isFinite(sequence) ? sequence : Number.MAX_SAFE_INTEGER, accessCell });
    });

    stops.sort((a, b) => a.sequence - b.sequence);

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
        if (path) cache.set(segmentKey, path);
      }
      if (!path) {
        hasPath = false;
        issues.push(`Sin ruta entre ${keyOf(a)} y ${keyOf(b)}`);
        continue;
      }
      path.forEach((coord, idx) => {
        if (idx === 0 && i > 0) return;
        if (!heatmap[coord.y]?.[coord.x] && heatmap[coord.y]?.[coord.x] !== 0) return;
        heatmap[coord.y][coord.x] += 1;
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
    });
  });

  const now = new Date();
  const layoutHash = hashLayout(layout);
  const runId = crypto.randomUUID();
  const run: RunResult = {
    runId,
    name: formatRunName(now, layout.name, skuMaster.name),
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
    heatmapSteps: heatmap,
  };

  return {
    run,
    warnings: {
      palletsWithIssues: palletResults.filter((item) => item.issues.length > 0).length,
      palletsWithoutPath: palletResults.filter((item) => !item.hasPath).length,
      missingSkuMappings: palletResults.reduce((acc, item) => acc + (item.missingSkuCount ?? 0), 0),
    },
  };
};
