import { describe, expect, it } from 'vitest';
import type { RunResult } from '../models/domain';
import { deserializeRun, estimateStorageSize, serializeRun } from './runRepo';

const sampleRun = (): RunResult => ({
  runId: 'run-1',
  name: 'Run sample',
  createdAt: '2025-01-01T00:00:00.000Z',
  layoutId: 'layout-1',
  skuMasterId: 'sku-1',
  layoutHash: 'layout-hash',
  skuMasterHash: 'sku-hash',
  summary: {
    totalPallets: 1,
    okPallets: 0,
    errorPallets: 1,
    totalSteps: 4,
    avgSteps: 4,
  },
  palletOrder: ['P-1'],
  palletResults: [
    {
      palletId: 'P-1',
      skuCount: 2,
      missingSkuCount: 1,
      steps: 4,
      hasPath: false,
      issues: ['SKU A sin mapping en SKU Master', 'Sin ruta entre 0,0 y 2,2'],
      stops: [{ locationId: 'L-1', sequence: 1 }],
      pickPlan: [
        { sku: 'A', locationId: 'L-1', sequence: 1, accessX: 1, accessY: 2 },
        { sku: 'B', locationId: 'L-2', sequence: 2, accessX: 3, accessY: 2, status: 'missing' },
      ],
    },
  ],
  heatmapSteps: [
    [0, 1, 0],
    [0, 0, 0],
    [2, 0, 3],
  ],
});

describe('runRepo compact serialization', () => {
  it('serializes and deserializes preserving minimal fields', () => {
    const run = sampleRun();
    const compact = serializeRun(run);
    const restored = deserializeRun(compact);

    expect(restored).toBeDefined();
    expect(restored?.runId).toBe(run.runId);
    expect(restored?.palletResults[0].steps).toBe(4);
    expect(restored?.palletResults[0].issues.length).toBeGreaterThan(0);
    expect(restored?.heatmapSteps[2][2]).toBe(3);
    expect(restored?.palletResults[0].pickPlan?.length).toBe(2);
  });

  it('forces ultra compact mode when requested', () => {
    const compact = serializeRun(sampleRun(), { forceUltraCompact: true });
    expect(compact.meta.ultraCompact).toBe(true);
    expect(compact.heatmap).toBeUndefined();
    expect(compact.palletResults[0].pickPlan).toBeUndefined();
  });

  it('estimates serialized bytes', () => {
    expect(estimateStorageSize({ a: 1, b: 2 })).toBeGreaterThan(0);
  });
});
