import { useMemo } from 'react';
import type { Coord, Layout, PalletBatch, RunResult, SkuMaster } from '../models/domain';
import { resolvePallets, buildGraph, findPath } from '../routing/pathfinding';
import { findSingleCell, hashLayout, keyOf } from '../utils/layout';
import { GridCanvas } from '../ui/GridCanvas';

const routeCache = new Map<string, Coord[]>();

const buildPath = (layout: Layout, run: RunResult, masters: SkuMaster[], batches: PalletBatch[], palletId: string): Coord[] => {
  const master = masters.find((item) => item.skuMasterId === run.skuMasterId);
  const batch = batches.find((item) => item.palletBatchId === run.palletBatchId);
  if (!master || !batch) return [];
  const resolved = resolvePallets(batch.lines, master.mapping, layout).pallets.find((item) => item.palletId === palletId);
  if (!resolved) return [];
  const start = findSingleCell(layout, 'START');
  const end = findSingleCell(layout, 'END');
  if (!start || !end) return [];
  const access = new Map<string, Coord>();
  for (let y = 0; y < layout.height; y += 1) for (let x = 0; x < layout.width; x += 1) {
    const c = layout.grid[y][x];
    if (c.type === 'PICK' && c.pick) access.set(c.pick.locationId, c.pick.accessCell);
  }
  const graph = buildGraph(layout);
  const stops = [start, ...resolved.picks.map((pick) => access.get(pick.locationId)).filter(Boolean), end] as Coord[];
  const out: Coord[] = [];
  const layoutId = hashLayout(layout);
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    const key = `${run.runId}:${palletId}:${keyOf(a)}->${keyOf(b)}:${layoutId}`;
    let path = routeCache.get(key);
    if (!path) {
      path = findPath(graph, a, b) ?? [];
      routeCache.set(key, path);
    }
    path.forEach((coord, idx) => {
      if (idx === 0 && out.length) return;
      out.push(coord);
    });
  }
  return out;
};

export function PlayerCompare({
  layout,
  runA,
  runB,
  masters,
  batches,
  palletIndex,
  stepIndex,
}: {
  layout: Layout;
  runA?: RunResult;
  runB?: RunResult;
  masters: SkuMaster[];
  batches: PalletBatch[];
  palletIndex: number;
  stepIndex: number;
}) {
  const palletId = runA?.palletOrder[palletIndex] ?? runB?.palletOrder[palletIndex] ?? '';
  const pathA = useMemo(() => (runA && palletId ? buildPath(layout, runA, masters, batches, palletId) : []), [batches, layout, masters, palletId, runA]);
  const pathB = useMemo(() => (runB && palletId ? buildPath(layout, runB, masters, batches, palletId) : []), [batches, layout, masters, palletId, runB]);

  return (
    <div className="compare-grid-wrap">
      <div>
        <GridCanvas layout={layout} zoom={17} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} path={pathA} pickerPosition={pathA[Math.min(stepIndex, Math.max(pathA.length - 1, 0))]} />
        {stepIndex >= pathA.length && pathA.length > 0 && <p>Run A finalizado</p>}
      </div>
      <div>
        <GridCanvas layout={layout} zoom={17} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} path={pathB} pickerPosition={pathB[Math.min(stepIndex, Math.max(pathB.length - 1, 0))]} />
        {stepIndex >= pathB.length && pathB.length > 0 && <p>Run B finalizado</p>}
      </div>
    </div>
  );
}
