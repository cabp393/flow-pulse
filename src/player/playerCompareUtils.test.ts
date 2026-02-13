import { describe, expect, it } from 'vitest';
import type { RunResult } from '../models/domain';
import { buildVisitCounts, hasSamePalletList } from './playerCompareUtils';

const makeRun = (runId: string, palletOrder: string[]): RunResult => ({
  runId,
  name: runId,
  createdAt: new Date().toISOString(),
  layoutId: `layout-${runId}`,
  skuMasterId: `sku-${runId}`,
  layoutHash: 'layout-hash',
  skuMasterHash: 'sku-hash',
  summary: { totalPallets: 0, okPallets: 0, errorPallets: 0, totalSteps: 0, avgSteps: 0 },
  palletOrder,
  palletResults: [],
  heatmapSteps: [],
});

describe('hasSamePalletList', () => {
  it('accepts runs with same pallet list and order', () => {
    const runA = makeRun('a', ['P1', 'P2']);
    const runB = makeRun('b', ['P1', 'P2']);
    expect(hasSamePalletList(runA, runB)).toBe(true);
  });

  it('rejects runs with different pallet list', () => {
    const runA = makeRun('a', ['P1', 'P2']);
    const runB = makeRun('b', ['P1', 'P3']);
    expect(hasSamePalletList(runA, runB)).toBe(false);
  });
});

describe('buildVisitCounts', () => {
  it('counts revisits up to current step', () => {
    const counts = buildVisitCounts([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }], 2);
    expect(counts['0,0']).toBe(2);
    expect(counts['1,0']).toBe(1);
  });
});
