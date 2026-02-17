import type { RunConfig } from '../models/domain';
import { buildRunName } from '../utils/runName';

export const createRunConfig = (layoutName: string, skuMasterName: string, batchName: string, layoutId: string, skuMasterId: string, batchId: string): RunConfig => {
  const now = new Date();
  return {
    runConfigId: crypto.randomUUID(),
    name: buildRunName(now, layoutName, skuMasterName, batchName),
    createdAt: now.toISOString(),
    layoutId,
    skuMasterId,
    batchId,
  };
};

export const insertRunConfig = (configs: RunConfig[], config: RunConfig, max = 40): RunConfig[] => [config, ...configs].slice(0, max);
export const removeRunConfig = (configs: RunConfig[], runConfigId: string): RunConfig[] => configs.filter((item) => item.runConfigId !== runConfigId);
