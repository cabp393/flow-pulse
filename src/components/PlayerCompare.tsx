import { useMemo } from 'react';
import type { Coord, Layout, RunResult } from '../models/domain';
import { buildGraph, findPath } from '../routing/pathfinding';
import { findSingleCell, keyOf } from '../utils/layout';
import { GridCanvas } from '../ui/GridCanvas';

const routeCache = new Map<string, Coord[]>();

const isPlayablePallet = (run: RunResult | undefined, palletId: string): boolean => {
  if (!run) return false;
  const pallet = run.palletResults.find((item) => item.palletId === palletId);
  if (!pallet) return false;
  return pallet.hasPath && pallet.stops.length > 0;
};

const buildPath = (layout: Layout, run: RunResult, palletId: string): Coord[] => {
  const pallet = run.palletResults.find((item) => item.palletId === palletId);
  if (!pallet || !pallet.hasPath || pallet.stops.length === 0) return [];
  const start = findSingleCell(layout, 'START');
  const end = findSingleCell(layout, 'END');
  if (!start || !end) return [];

  const access = new Map<string, Coord>();
  for (let y = 0; y < layout.height; y += 1) for (let x = 0; x < layout.width; x += 1) {
    const c = layout.gridData[y][x];
    if (c.type === 'PICK' && c.pick) access.set(c.pick.locationId, c.pick.accessCell);
  }

  const graph = buildGraph(layout);
  const stops = [start, ...pallet.stops.map((stop) => access.get(stop.locationId)).filter(Boolean), end] as Coord[];
  const out: Coord[] = [];
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    const key = `${run.runId}:${palletId}:${keyOf(a)}->${keyOf(b)}`;
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

const buildVisitCounts = (path: Coord[], stepIndex: number): Record<string, number> => {
  if (!path.length) return {};
  const lastStep = Math.min(stepIndex, path.length - 1);
  const counts: Record<string, number> = {};
  for (let i = 0; i <= lastStep; i += 1) {
    const key = keyOf(path[i]);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

export function PlayerCompare({ layout, runA, runB, palletIndex, stepIndex, onlyPlayable = false }: { layout: Layout; runA?: RunResult; runB?: RunResult; palletIndex: number; stepIndex: number; onlyPlayable?: boolean }) {
  const palletId = runA?.palletOrder[palletIndex] ?? runB?.palletOrder[palletIndex] ?? '';
  const canPlayA = !onlyPlayable || isPlayablePallet(runA, palletId);
  const canPlayB = !onlyPlayable || isPlayablePallet(runB, palletId);
  const pathA = useMemo(() => (runA && palletId && canPlayA ? buildPath(layout, runA, palletId) : []), [canPlayA, layout, palletId, runA]);
  const pathB = useMemo(() => (runB && palletId && canPlayB ? buildPath(layout, runB, palletId) : []), [canPlayB, layout, palletId, runB]);
  const visitCountsA = useMemo(() => buildVisitCounts(pathA, stepIndex), [pathA, stepIndex]);
  const visitCountsB = useMemo(() => buildVisitCounts(pathB, stepIndex), [pathB, stepIndex]);

  return (
    <div className="compare-grid-wrap">
      <div>
        <GridCanvas layout={layout} zoom={17} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} pickerPosition={pathA[Math.min(stepIndex, Math.max(pathA.length - 1, 0))]} visitCounts={visitCountsA} />
      </div>
      <div>
        <GridCanvas layout={layout} zoom={17} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} pickerPosition={pathB[Math.min(stepIndex, Math.max(pathB.length - 1, 0))]} visitCounts={visitCountsB} />
      </div>
    </div>
  );
}
