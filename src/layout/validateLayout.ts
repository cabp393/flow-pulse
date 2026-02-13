import { buildGraph } from '../routing/pathfinding';
import type { Coord, Layout, MovementRules } from '../models/domain';
import { adjacent, keyOf } from '../utils/layout';

export interface LayoutValidationIssue {
  id: string;
  level: 'error' | 'warning';
  message: string;
  cell?: Coord;
}

export interface LayoutValidationResult {
  errors: LayoutValidationIssue[];
  warnings: LayoutValidationIssue[];
}

const canLeaveGrid = (movementRules: MovementRules): boolean =>
  movementRules.allowUp || movementRules.allowDown || movementRules.allowLeft || movementRules.allowRight;

export const validateLayout = (layout: Layout): LayoutValidationResult => {
  const errors: LayoutValidationIssue[] = [];
  const warnings: LayoutValidationIssue[] = [];

  const starts: Coord[] = [];
  const ends: Coord[] = [];
  const pickIds = new Map<string, Coord>();
  const picks: { coord: Coord; locationId: string; accessCell?: Coord }[] = [];

  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const cell = layout.gridData[y][x];
      if (cell.type === 'START') starts.push({ x, y });
      if (cell.type === 'END') ends.push({ x, y });
      if (cell.type !== 'PICK') continue;

      const locationId = cell.pick?.locationId?.trim() ?? '';
      if (!locationId) {
        errors.push({
          id: `pick-location-required-${x}-${y}`,
          level: 'error',
          message: `PICK en (${x},${y}) sin locationId.`,
          cell: { x, y },
        });
      } else if (pickIds.has(locationId)) {
        errors.push({
          id: `pick-location-duplicated-${locationId}-${x}-${y}`,
          level: 'error',
          message: `locationId duplicado: ${locationId}.`,
          cell: { x, y },
        });
      } else {
        pickIds.set(locationId, { x, y });
      }

      picks.push({ coord: { x, y }, locationId: locationId || `(${x},${y})`, accessCell: cell.pick?.accessCell });
    }
  }

  if (starts.length !== 1) {
    errors.push({
      id: 'start-count',
      level: 'error',
      message: `Debe existir exactamente 1 START (actual: ${starts.length}).`,
      cell: starts[0],
    });
  }

  if (ends.length !== 1) {
    errors.push({
      id: 'end-count',
      level: 'error',
      message: `Debe existir exactamente 1 END (actual: ${ends.length}).`,
      cell: ends[0],
    });
  }

  if (canLeaveGrid(layout.movementRules)) {
    warnings.push({
      id: 'movement-rules-outside-grid',
      level: 'warning',
      message: 'movementRules globales están en true, pero actualmente no se usan en el pathfinding.',
    });
  }

  for (const pick of picks) {
    if (!pick.accessCell) {
      errors.push({
        id: `pick-access-missing-${pick.coord.x}-${pick.coord.y}`,
        level: 'error',
        message: `PICK ${pick.locationId} sin accessCell.`,
        cell: pick.coord,
      });
      continue;
    }

    if (pick.accessCell.x < 0 || pick.accessCell.y < 0 || pick.accessCell.x >= layout.width || pick.accessCell.y >= layout.height) {
      errors.push({
        id: `pick-access-outside-${pick.coord.x}-${pick.coord.y}`,
        level: 'error',
        message: `accessCell de PICK ${pick.locationId} está fuera del grid.`,
        cell: pick.coord,
      });
      continue;
    }

    const accessCell = layout.gridData[pick.accessCell.y][pick.accessCell.x];
    if (accessCell.type !== 'AISLE') {
      errors.push({
        id: `pick-access-not-aisle-${pick.coord.x}-${pick.coord.y}`,
        level: 'error',
        message: `accessCell de PICK ${pick.locationId} debe ser AISLE.`,
        cell: pick.accessCell,
      });
    }

    if (!adjacent(pick.coord, pick.accessCell)) {
      errors.push({
        id: `pick-access-not-adjacent-${pick.coord.x}-${pick.coord.y}`,
        level: 'error',
        message: `accessCell de PICK ${pick.locationId} debe ser adyacente (4-neighbors).`,
        cell: pick.coord,
      });
    }
  }

  if (starts.length === 1 && picks.length > 0) {
    const graph = buildGraph(layout);
    const reachable = new Set<string>();
    const queue: Coord[] = [starts[0]];

    while (queue.length) {
      const next = queue.shift()!;
      const key = keyOf(next);
      if (reachable.has(key)) continue;
      reachable.add(key);
      for (const neighbor of graph.get(key) ?? []) {
        if (!reachable.has(keyOf(neighbor))) queue.push(neighbor);
      }
    }

    for (const pick of picks) {
      if (!pick.accessCell) continue;
      if (!reachable.has(keyOf(pick.accessCell))) {
        warnings.push({
          id: `pick-unreachable-${pick.coord.x}-${pick.coord.y}`,
          level: 'warning',
          message: `PICK ${pick.locationId} no es alcanzable desde START según el grafo dirigido.`,
          cell: pick.coord,
        });
      }
    }
  }

  return { errors, warnings };
};
