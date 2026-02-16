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
});
