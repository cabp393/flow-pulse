import type { Batch, Layout, RunConfig, RunResult, SkuMaster } from '../models/domain';
import { buildRun } from './buildRun';
import { deserializeBatch } from '../storage/batchRepo';

const runCache = new Map<string, RunResult>();

const cacheKey = (config: RunConfig): string => `${config.runConfigId}:${config.layoutId}:${config.skuMasterId}:${config.batchId}`;

export const buildRunFromConfig = async (
  config: RunConfig,
  layout: Layout,
  skuMaster: SkuMaster,
  batch: Batch,
): Promise<RunResult> => {
  const key = cacheKey(config);
  const cached = runCache.get(key);
  if (cached) return cached;
  const lines = deserializeBatch(batch);
  const { run } = await buildRun(layout, skuMaster, lines, batch.name);
  const resolved: RunResult = { ...run, runId: config.runConfigId, name: config.name, createdAt: config.createdAt };
  runCache.set(key, resolved);
  return resolved;
};

export const clearRunSessionCache = (): void => runCache.clear();
