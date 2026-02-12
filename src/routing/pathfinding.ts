import type { Coord, Layout, PalletResolved, RunPalletResult, RunResult, SkuMap } from '../models/domain';
import { keyOf, findSingleCell, hashLayout } from '../utils/layout';

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

export const resolvePallets = (
  lines: { pallet_id: string; sku: string }[],
  skuMap: SkuMap,
  layout: Layout,
): { pallets: PalletResolved[]; issues: string[] } => {
  const pickByLocation = new Map<string, { sequence: number; accessCell: Coord }>();
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const cell = layout.grid[y][x];
      if (cell.type === 'PICK' && cell.pick) {
        pickByLocation.set(cell.pick.locationId, { sequence: cell.pick.sequence, accessCell: cell.pick.accessCell });
      }
    }
  }

  const grouped = new Map<string, string[]>();
  lines.forEach((line) => {
    const current = grouped.get(line.pallet_id) ?? [];
    current.push(line.sku);
    grouped.set(line.pallet_id, current);
  });

  const issues: string[] = [];
  const pallets: PalletResolved[] = [];

  grouped.forEach((skus, palletId) => {
    const errors: string[] = [];
    const locationToPick = new Map<string, { sku: string; locationId: string; sequence: number }>();

    for (const sku of skus) {
      const location = skuMap[sku];
      if (!location) {
        errors.push(`SKU ${sku} sin mapping`);
        continue;
      }
      if (!pickByLocation.has(location)) {
        errors.push(`Location ${location} del SKU ${sku} no existe en layout`);
        continue;
      }
      const sequence = pickByLocation.get(location)?.sequence ?? 0;
      if (!locationToPick.has(location)) {
        locationToPick.set(location, { sku, locationId: location, sequence });
      }
    }

    const picks = [...locationToPick.values()].sort((a, b) => a.sequence - b.sequence);
    const locationIds = picks.map((pick) => pick.locationId);

    if (errors.length) {
      issues.push(`Pallet ${palletId}: ${errors.join('; ')}`);
    }

    pallets.push({ palletId, skus, locationIds, picks, issues: errors });
  });

  return { pallets, issues };
};

export const simulate = (
  layout: Layout,
  pallets: PalletResolved[],
): RunResult => {
  const heatmap = Array.from({ length: layout.height }, () => Array.from({ length: layout.width }, () => 0));
  const graph = buildGraph(layout);
  const start = findSingleCell(layout, 'START');
  const end = findSingleCell(layout, 'END');
  if (!start || !end) throw new Error('Layout requiere START y END.');

  const cache = new Map<string, Coord[]>();
  const layoutHash = hashLayout(layout);
  const pickAccess = new Map<string, Coord>();

  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const c = layout.grid[y][x];
      if (c.type === 'PICK' && c.pick) pickAccess.set(c.pick.locationId, c.pick.accessCell);
    }
  }

  const results: RunPalletResult[] = pallets.map((pallet) => {
    const issues = [...pallet.issues];
    const stopDetails: RunPalletResult['stopDetails'] = pallet.picks
      .map((pick, index) => {
        const accessCell = pickAccess.get(pick.locationId);
        if (!accessCell) {
          issues.push(`Sin accessCell para location ${pick.locationId}`);
          return undefined;
        }
        return {
          order: index + 1,
          sku: pick.sku,
          locationId: pick.locationId,
          sequence: pick.sequence,
          accessCell,
        };
      })
      .filter((stop): stop is RunPalletResult['stopDetails'][number] => Boolean(stop));

    const pickStops = stopDetails.map((stop) => stop.accessCell);
    const stops = [start, ...pickStops, end];
    const visited: Coord[] = [];

    for (let i = 0; i < stops.length - 1; i += 1) {
      const a = stops[i];
      const b = stops[i + 1];
      const key = `${keyOf(a)}->${keyOf(b)}|${layoutHash}`;
      const path = cache.get(key) ?? findPath(graph, a, b) ?? null;
      if (!path) {
        issues.push(`Sin ruta entre ${keyOf(a)} y ${keyOf(b)}`);
        continue;
      }
      cache.set(key, path);
      path.forEach((coord, idx) => {
        if (idx === 0 && visited.length) return;
        visited.push(coord);
        heatmap[coord.y][coord.x] += 1;
      });
    }

    return {
      palletId: pallet.palletId,
      visited,
      steps: visited.length,
      stops,
      stopDetails,
      issues,
    };
  });

  return {
    heatmap,
    pallets: results,
    totalSteps: results.reduce((acc, p) => acc + p.steps, 0),
    createdAt: new Date().toISOString(),
  };
};
