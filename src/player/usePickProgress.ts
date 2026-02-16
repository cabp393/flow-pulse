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

const resolveNextPickIndex = (pickPlan: RunPickPlanItem[], path: Coord[], stepIndex: number): number => {
  if (!pickPlan.length || !path.length) return -1;

  const clampedStep = Math.max(0, Math.min(stepIndex, path.length - 1));
  let nextPickIndex = 0;

  while (nextPickIndex < pickPlan.length) {
    const candidate = pickPlan[nextPickIndex];
    if (candidate.status !== 'missing') break;
    nextPickIndex += 1;
  }

  for (let i = 0; i <= clampedStep && nextPickIndex < pickPlan.length; i += 1) {
    const currentCell = path[i];
    while (nextPickIndex < pickPlan.length && pickPlan[nextPickIndex].status === 'missing') {
      nextPickIndex += 1;
    }
    if (nextPickIndex >= pickPlan.length) break;

    const expectedPick = pickPlan[nextPickIndex];
    if (keyOf(currentCell) === keyOf({ x: expectedPick.accessX, y: expectedPick.accessY })) {
      nextPickIndex += 1;
    }
  }

  return nextPickIndex;
};

export const resolvePickProgress = (pickPlan: RunPickPlanItem[], path: Coord[], stepIndex: number): PickProgressItem[] => {
  const nextPickIndex = resolveNextPickIndex(pickPlan, path, stepIndex);

  return pickPlan.map((pick, index) => {
    if (pick.status === 'missing') {
      return { index: index + 1, sku: pick.sku, locationId: pick.locationId, sequence: pick.sequence, icon: '⚠️' };
    }
    if (nextPickIndex >= 0 && index < nextPickIndex) {
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
