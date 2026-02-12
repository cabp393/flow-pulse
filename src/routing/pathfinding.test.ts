import { describe, expect, it } from 'vitest';
import { createLayout, defaultMovement } from '../models/defaults';
import { buildGraph, findPath } from './pathfinding';

describe('pathfinding', () => {
  it('finds path on straight aisle', () => {
    const layout = createLayout(3, 1);
    layout.grid[0].forEach((c) => {
      c.type = 'AISLE';
      c.movement = defaultMovement();
    });
    const graph = buildGraph(layout);
    const path = findPath(graph, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(path?.length).toBe(3);
  });

  it('respects one-way direction', () => {
    const layout = createLayout(2, 1);
    layout.grid[0][0] = { type: 'AISLE', movement: { allowUp: false, allowDown: false, allowLeft: false, allowRight: true } };
    layout.grid[0][1] = { type: 'AISLE', movement: { allowUp: false, allowDown: false, allowLeft: false, allowRight: false } };
    const graph = buildGraph(layout);
    expect(findPath(graph, { x: 0, y: 0 }, { x: 1, y: 0 })).not.toBeNull();
    expect(findPath(graph, { x: 1, y: 0 }, { x: 0, y: 0 })).toBeNull();
  });
});
