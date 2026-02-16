import { describe, expect, it } from 'vitest';
import type { Layout, PalletLine, SkuMaster } from '../models/domain';
import { buildRun } from './buildRun';

const createLayout = (): Layout => ({
  layoutId: 'layout-1',
  name: 'layout',
  createdAt: new Date().toISOString(),
  width: 4,
  height: 1,
  movementRules: { allowUp: false, allowDown: false, allowLeft: true, allowRight: true },
  gridData: [
    [
      { type: 'START' },
      { type: 'PICK', pick: { locationId: 'L-C', accessCell: { x: 1, y: 0 } } },
      { type: 'PICK', pick: { locationId: 'L-A', accessCell: { x: 2, y: 0 } } },
      { type: 'END' },
    ],
  ],
});

const createMaster = (): SkuMaster => ({
  skuMasterId: 'master-1',
  name: 'master',
  createdAt: new Date().toISOString(),
  rows: [],
  index: {
    A: [{ locationId: 'L-A', sequence: 1 }],
    B: [{ locationId: 'L-A', sequence: 2 }],
    C: [{ locationId: 'L-C', sequence: 3 }],
  },
});

describe('buildRun', () => {
  it('builds pickPlan ordered by sequence and keeps deterministic dedupe by location', () => {
    const lines: PalletLine[] = [
      { pallet_id: 'P1', sku: 'C' },
      { pallet_id: 'P1', sku: 'A' },
      { pallet_id: 'P1', sku: 'B' },
    ];

    const { run } = buildRun(createLayout(), createMaster(), lines, 'sample.xlsx');
    const pallet = run.palletResults[0];

    expect(pallet.pickPlan?.map((pick) => `${pick.sequence}:${pick.locationId}:${pick.sku}`)).toEqual([
      '1:L-A:A',
      '3:L-C:C',
    ]);

    expect(pallet.pickPlan?.[0].skusInLocation).toEqual(['A', 'B']);
    expect(pallet.stops.map((stop) => `${stop.sequence}:${stop.locationId}`)).toEqual(['1:L-A', '3:L-C']);
  });

  it('selects the minimum sequence option when SKU has multiple mapped locations', () => {
    const master = createMaster();
    master.index.Z = [
      { locationId: 'L-C', sequence: 9 },
      { locationId: 'L-A', sequence: 4 },
    ];

    const { run } = buildRun(createLayout(), master, [{ pallet_id: 'P1', sku: 'Z' }], 'sample.xlsx');
    const pick = run.palletResults[0].pickPlan?.[0];

    expect(pick?.sequence).toBe(4);
    expect(pick?.locationId).toBe('L-A');
  });
});
