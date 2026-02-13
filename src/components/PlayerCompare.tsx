import { useMemo } from 'react';
import type { Coord, Layout, RunResult } from '../models/domain';
import { buildGraph, findPath } from '../routing/pathfinding';
import { findSingleCell, keyOf } from '../utils/layout';
import { GridCanvas } from '../ui/GridCanvas';

const routeCache = new Map<string, Coord[]>();

const buildPath = (layout: Layout, run: RunResult, palletId: string): Coord[] => {
  const pallet = run.palletResults.find((item) => item.palletId === palletId);
  if (!pallet) return [];
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

export function PlayerCompare({ layout, runA, runB, palletIndex, stepIndex }: { layout: Layout; runA?: RunResult; runB?: RunResult; palletIndex: number; stepIndex: number }) {
  const palletId = runA?.palletOrder[palletIndex] ?? runB?.palletOrder[palletIndex] ?? '';
  const pathA = useMemo(() => (runA && palletId ? buildPath(layout, runA, palletId) : []), [layout, palletId, runA]);
  const pathB = useMemo(() => (runB && palletId ? buildPath(layout, runB, palletId) : []), [layout, palletId, runB]);

  return (
    <div className="compare-grid-wrap">
      <div>
        <GridCanvas layout={layout} zoom={17} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} path={pathA} pickerPosition={pathA[Math.min(stepIndex, Math.max(pathA.length - 1, 0))]} />
      </div>
      <div>
        <GridCanvas layout={layout} zoom={17} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} path={pathB} pickerPosition={pathB[Math.min(stepIndex, Math.max(pathB.length - 1, 0))]} />
      </div>
    </div>
  );
}
