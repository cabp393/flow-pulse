import type { Layout, PalletLine, RunPalletResult, RunResult, SkuMap } from '../models/domain';
import { buildGraph, findPath, resolvePallets } from './pathfinding';
import { findSingleCell, hashLayout, keyOf } from '../utils/layout';

export const ROUTING_PARAMS_HASH = 'astar-v1';

export const buildRun = (
  layout: Layout,
  palletBatchId: string,
  skuMasterId: string,
  skuMap: SkuMap,
  lines: PalletLine[],
): RunResult => {
  const resolved = resolvePallets(lines, skuMap, layout);
  const start = findSingleCell(layout, 'START');
  const end = findSingleCell(layout, 'END');
  if (!start || !end) throw new Error('Layout requiere START y END.');

  const layoutVersionId = hashLayout(layout);
  const graph = buildGraph(layout);
  const heatmap = Array.from({ length: layout.height }, () => Array.from({ length: layout.width }, () => 0));
  const accessByLocation = new Map<string, { x: number; y: number }>();
  const cache = new Map<string, { x: number; y: number }[]>();

  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const cell = layout.grid[y][x];
      if (cell.type === 'PICK' && cell.pick) accessByLocation.set(cell.pick.locationId, cell.pick.accessCell);
    }
  }

  const palletResults: RunPalletResult[] = [];
  for (const pallet of resolved.pallets) {
    let steps = 0;
    let hasPath = true;
    const issues = [...pallet.issues];
    const stops = [start, ...pallet.picks.map((pick) => accessByLocation.get(pick.locationId)).filter(Boolean), end] as { x: number; y: number }[];

    for (let i = 0; i < stops.length - 1; i += 1) {
      const a = stops[i];
      const b = stops[i + 1];
      const cacheKey = `${keyOf(a)}->${keyOf(b)}:${layoutVersionId}`;
      let path = cache.get(cacheKey);
      if (!path) {
        path = findPath(graph, a, b) ?? undefined;
        if (path) cache.set(cacheKey, path);
      }
      if (!path) {
        hasPath = false;
        issues.push(`Sin ruta ${cacheKey}`);
        continue;
      }
      path.forEach((coord, idx) => {
        if (idx === 0 && i > 0) return;
        heatmap[coord.y][coord.x] += 1;
        steps += 1;
      });
    }

    palletResults.push({
      runId: '',
      palletId: pallet.palletId,
      steps,
      hasPath,
      issuesCount: issues.length,
      stopDetails: [],
      issues,
    });
  }

  const runId = crypto.randomUUID();
  const run: RunResult = {
    runId,
    layoutVersionId,
    palletBatchId,
    skuMasterId,
    routingParamsHash: ROUTING_PARAMS_HASH,
    createdAt: new Date().toISOString(),
    summary: {
      totalPallets: palletResults.length,
      totalSteps: palletResults.reduce((acc, item) => acc + item.steps, 0),
      avgSteps: palletResults.length ? palletResults.reduce((acc, item) => acc + item.steps, 0) / palletResults.length : 0,
      errorCount: palletResults.reduce((acc, item) => acc + item.issuesCount, 0),
    },
    heatmapSteps: heatmap,
    palletOrder: palletResults.map((item) => item.palletId),
    palletResults: palletResults.map((item) => ({ ...item, runId })),
  };

  return run;
};
