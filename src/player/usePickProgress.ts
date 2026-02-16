import { useMemo } from 'react';
import type { Coord, RunPickPlanItem } from '../models/domain';
import { keyOf } from '../utils/layout';

export interface PickProgressItem {
  index: number;
  sku: string;
  locationId: string;
  sequence: number;
  icon: '🟢' | '🔴' | '⚠️' | '·';
}

const buildCompletedSet = (pickPlan: RunPickPlanItem[], path: Coord[], stepIndex: number): Set<number> => {
  if (!pickPlan.length || !path.length) return new Set<number>();

  const clampedStep = Math.max(0, Math.min(stepIndex, path.length - 1));
  const picksByCell = new Map<string, number[]>();

  pickPlan.forEach((pick, index) => {
    if (pick.status === 'missing') return;
    const key = keyOf({ x: pick.accessX, y: pick.accessY });
    const list = picksByCell.get(key) ?? [];
    list.push(index);
    picksByCell.set(key, list);
  });

  const completed = new Set<number>();
  for (let i = 0; i <= clampedStep; i += 1) {
    const atCell = picksByCell.get(keyOf(path[i]));
    if (!atCell) continue;
    atCell.forEach((pickIndex) => completed.add(pickIndex));
  }

  return completed;
};

export const resolvePickProgress = (pickPlan: RunPickPlanItem[], path: Coord[], stepIndex: number): PickProgressItem[] => {
  const completed = buildCompletedSet(pickPlan, path, stepIndex);
  const nextPickIndex = pickPlan.findIndex((pick, index) => pick.status !== 'missing' && !completed.has(index));

  return pickPlan.map((pick, index) => {
    if (pick.status === 'missing') {
      return { index: index + 1, sku: pick.sku, locationId: pick.locationId, sequence: pick.sequence, icon: '⚠️' };
    }
    if (completed.has(index)) {
      return { index: index + 1, sku: pick.sku, locationId: pick.locationId, sequence: pick.sequence, icon: '🟢' };
    }
    if (index === nextPickIndex) {
      return { index: index + 1, sku: pick.sku, locationId: pick.locationId, sequence: pick.sequence, icon: '🔴' };
    }
    return { index: index + 1, sku: pick.sku, locationId: pick.locationId, sequence: pick.sequence, icon: '·' };
  });
};

export const usePickProgress = (pickPlan: RunPickPlanItem[], path: Coord[], stepIndex: number): PickProgressItem[] => {
  return useMemo(() => resolvePickProgress(pickPlan, path, stepIndex), [path, pickPlan, stepIndex]);
};
