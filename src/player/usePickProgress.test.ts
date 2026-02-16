import { describe, expect, it } from 'vitest';
import type { Coord, RunPickPlanItem } from '../models/domain';
import { resolvePickProgress } from './usePickProgress';

const plan: RunPickPlanItem[] = [
  { sku: 'A', locationId: 'L1', sequence: 1, accessX: 1, accessY: 1 },
  { sku: 'B', locationId: 'L2', sequence: 2, accessX: 2, accessY: 1 },
  { sku: 'C', locationId: 'N/A', sequence: 3, accessX: -1, accessY: -1, status: 'missing' },
];

const path: Coord[] = [
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 2 },
  { x: 2, y: 1 },
];

describe('resolvePickProgress', () => {
  it('marks completed, next and missing picks', () => {
    const items = resolvePickProgress(plan, path, 1);
    expect(items.map((item) => item.icon)).toEqual(['🟢', '🔴', '⚠️']);
  });

  it('keeps first valid pick as current when no pick was reached', () => {
    const items = resolvePickProgress(plan, path, 0);
    expect(items.map((item) => item.icon)).toEqual(['🔴', '·', '⚠️']);
  });

  it('completes picks only when the next sequence pick is reached', () => {
    const orderedPlan: RunPickPlanItem[] = [
      { sku: 'A', locationId: 'LA', sequence: 1, accessX: 2, accessY: 0 },
      { sku: 'B', locationId: 'LB', sequence: 2, accessX: 3, accessY: 0 },
      { sku: 'C', locationId: 'LC', sequence: 3, accessX: 1, accessY: 0 },
    ];
    const pathCrossingFuturePick: Coord[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];

    const beforeFirstPick = resolvePickProgress(orderedPlan, pathCrossingFuturePick, 1);
    expect(beforeFirstPick.map((item) => item.icon)).toEqual(['🔴', '·', '·']);

    const atFirstPick = resolvePickProgress(orderedPlan, pathCrossingFuturePick, 2);
    expect(atFirstPick.map((item) => item.icon)).toEqual(['🟢', '🔴', '·']);
  });

  it('skips missing picks without blocking next actionable pick', () => {
    const missingFirst: RunPickPlanItem[] = [
      { sku: 'X', locationId: 'N/A', sequence: 1, accessX: -1, accessY: -1, status: 'missing' },
      { sku: 'A', locationId: 'LA', sequence: 2, accessX: 1, accessY: 1 },
    ];

    const items = resolvePickProgress(missingFirst, [{ x: 0, y: 0 }], 0);
    expect(items.map((item) => item.icon)).toEqual(['⚠️', '🔴']);
  });
});
