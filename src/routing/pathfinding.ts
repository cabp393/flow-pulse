import type { Coord, Layout } from '../models/domain';
import { keyOf } from '../utils/layout';

const DIRS = [
  { dx: 0, dy: -1, rule: 'allowUp' as const },
  { dx: 0, dy: 1, rule: 'allowDown' as const },
  { dx: -1, dy: 0, rule: 'allowLeft' as const },
  { dx: 1, dy: 0, rule: 'allowRight' as const },
];

type NodeMap = Map<string, Coord[]>;

const isWalkable = (type: string): boolean => ['AISLE', 'START', 'END'].includes(type);

export const buildGraph = (layout: Layout): NodeMap => {
  const map: NodeMap = new Map();
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const c = layout.grid[y][x];
      if (!isWalkable(c.type)) continue;
      const from: Coord = { x, y };
      const neighbors: Coord[] = [];
      for (const d of DIRS) {
        const nx = x + d.dx;
        const ny = y + d.dy;
        if (nx < 0 || ny < 0 || nx >= layout.width || ny >= layout.height) continue;
        const target = layout.grid[ny][nx];
        if (!isWalkable(target.type)) continue;
        if (c.type === 'AISLE' && c.movement && !c.movement[d.rule]) continue;
        neighbors.push({ x: nx, y: ny });
      }
      map.set(keyOf(from), neighbors);
    }
  }
  return map;
};

const h = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const findPath = (graph: NodeMap, start: Coord, goal: Coord): Coord[] | null => {
  const open = new Set<string>([keyOf(start)]);
  const came = new Map<string, string>();
  const g = new Map<string, number>([[keyOf(start), 0]]);
  const f = new Map<string, number>([[keyOf(start), h(start, goal)]]);

  while (open.size > 0) {
    let current = '';
    let best = Number.POSITIVE_INFINITY;
    open.forEach((k) => {
      const score = f.get(k) ?? Number.POSITIVE_INFINITY;
      if (score < best) {
        best = score;
        current = k;
      }
    });

    if (!current) break;
    if (current === keyOf(goal)) {
      const out: Coord[] = [];
      let walk = current;
      while (walk) {
        const [x, y] = walk.split(',').map(Number);
        out.unshift({ x, y });
        walk = came.get(walk) ?? '';
      }
      return out;
    }

    open.delete(current);
    const neighbors = graph.get(current) ?? [];
    for (const n of neighbors) {
      const nk = keyOf(n);
      const tentative = (g.get(current) ?? Number.POSITIVE_INFINITY) + 1;
      if (tentative < (g.get(nk) ?? Number.POSITIVE_INFINITY)) {
        came.set(nk, current);
        g.set(nk, tentative);
        f.set(nk, tentative + h(n, goal));
        open.add(nk);
      }
    }
  }

  return null;
};
