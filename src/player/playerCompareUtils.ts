import type { Coord, Layout, RunResult } from '../models/domain';
import { buildGraph, findPath } from '../routing/pathfinding';
import { findSingleCell, keyOf } from '../utils/layout';

const pathCache = new Map<string, Coord[]>();

export const hasSamePalletList = (runA?: RunResult, runB?: RunResult): boolean => {
  if (!runA || !runB) return true;
  if (runA.palletOrder.length !== runB.palletOrder.length) return false;
  return runA.palletOrder.every((palletId, index) => palletId === runB.palletOrder[index]);
};

const buildLocationAccessMap = (layout: Layout): Map<string, Coord> => {
  const access = new Map<string, Coord>();
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const cell = layout.gridData[y][x];
      if (cell.type === 'PICK' && cell.pick) {
        access.set(cell.pick.locationId, cell.pick.accessCell);
      }
    }
  }
  return access;
};

export const buildRunPath = (layout: Layout, run: RunResult, palletId: string): Coord[] => {
  const pallet = run.palletResults.find((item) => item.palletId === palletId);
  if (!pallet || !pallet.hasPath || pallet.stops.length === 0) return [];

  const start = findSingleCell(layout, 'START');
  const end = findSingleCell(layout, 'END');
  if (!start || !end) return [];

  const graph = buildGraph(layout);
  const accessMap = buildLocationAccessMap(layout);
  const routeStops: Coord[] = [start];

  pallet.stops.forEach((stop) => {
    const accessCell = accessMap.get(stop.locationId);
    if (accessCell) routeStops.push(accessCell);
  });

  routeStops.push(end);

  const fullPath: Coord[] = [];
  for (let index = 0; index < routeStops.length - 1; index += 1) {
    const from = routeStops[index];
    const to = routeStops[index + 1];
    const cacheKey = `${run.runId}:${palletId}:${keyOf(from)}->${keyOf(to)}`;
    let segment = pathCache.get(cacheKey);

    if (!segment) {
      segment = findPath(graph, from, to) ?? [];
      pathCache.set(cacheKey, segment);
    }

    segment.forEach((coord, segmentIndex) => {
      if (segmentIndex === 0 && fullPath.length > 0) return;
      fullPath.push(coord);
    });
  }

  return fullPath;
};

export const buildVisitCounts = (path: Coord[], stepIndex: number): Record<string, number> => {
  if (!path.length) return {};
  const lastIndex = Math.max(0, Math.min(stepIndex, path.length - 1));
  const visitCounts: Record<string, number> = {};
  for (let index = 0; index <= lastIndex; index += 1) {
    const key = keyOf(path[index]);
    visitCounts[key] = (visitCounts[key] ?? 0) + 1;
  }
  return visitCounts;
};
