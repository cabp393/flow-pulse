import type { RunResult } from '../models/domain';

export const maxHeatValue = (run?: RunResult): number => Math.max(0, ...(run?.heatmapSteps.flat() ?? [0]));

export const normalizeHeatmap = (heatmap: number[][], sourceMax: number, targetMax: number): number[][] => {
  if (!sourceMax || sourceMax === targetMax) return heatmap;
  return heatmap.map((row) => row.map((value) => (value / sourceMax) * targetMax));
};

export const validateComparableRuns = (runA?: RunResult, runB?: RunResult): string[] => {
  if (!runA || !runB) return [];
  const errors: string[] = [];
  if (runA.layoutId !== runB.layoutId) errors.push('Layout diferente');
  return errors;
};
