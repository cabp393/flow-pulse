import type { Coord, Layout, PalletLine, RunPalletResult, RunResult, SkuMaster } from '../models/domain';
import { buildGraph, findPath } from './pathfinding';
import { findSingleCell, hashLayout, keyOf } from '../utils/layout';

const sanitize = (value: string): string => value.replace(/\s+/g, '_').replace(/[^\w-]/g, '_');

const formatRunName = (date: Date, layoutName: string, skuMasterName: string): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}_${sanitize(layoutName)}_${sanitize(skuMasterName)}`;
};

const hashSkuMaster = (master: SkuMaster): string => {
  const serialized = JSON.stringify(master.rows);
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `sku-${(hash >>> 0).toString(16)}`;
};

const buildAccessByLocation = (layout: Layout): Map<string, Coord> => {
  const map = new Map<string, Coord>();
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const cell = layout.gridData[y][x];
      if (cell.type === 'PICK' && cell.pick?.locationId) {
        map.set(cell.pick.locationId, cell.pick.accessCell);
      }
    }
  }
  return map;
};

export const buildRun = (layout: Layout, skuMaster: SkuMaster, lines: PalletLine[]): RunResult => {
  const start = findSingleCell(layout, 'START');
  const end = findSingleCell(layout, 'END');
  if (!start || !end) throw new Error('Layout requiere START y END.');

  const grouped = new Map<string, string[]>();
  lines.forEach((line) => {
    const current = grouped.get(line.pallet_id) ?? [];
    current.push(line.sku);
    grouped.set(line.pallet_id, current);
  });

  const graph = buildGraph(layout);
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
      const options = skuMaster.index[sku];
      if (!options || options.length === 0) {
        issues.push(`SKU ${sku} sin mapping en SKU Master`);
        missingSkuCount += 1;
        return;
      }
      // Regla MVP: si el SKU tiene múltiples ubicaciones, se usa la de menor sequence.
      const selected = options[0];
      const accessCell = accessByLocation.get(selected.locationId);
      if (!accessCell) {
        issues.push(`Ubicación ${selected.locationId} (SKU ${sku}) no existe en layout`);
        return;
      }
      stops.push({ sku, locationId: selected.locationId, sequence: selected.sequence, accessCell });
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
  return {
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
};
