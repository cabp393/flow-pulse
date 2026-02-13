import type { RunResult } from '../models/domain';

const DEFAULT_MAX_RUNS = 20;

export const insertRun = (runs: RunResult[], run: RunResult, maxRuns = DEFAULT_MAX_RUNS): RunResult[] => [run, ...runs].slice(0, maxRuns);

export const clearOldRuns = (runs: RunResult[], keep = 4): RunResult[] => runs.slice(0, keep);

export const findRun = (runs: RunResult[], runId?: string): RunResult | undefined => runs.find((run) => run.runId === runId);

export const removeRun = (runs: RunResult[], runId: string): RunResult[] => runs.filter((run) => run.runId !== runId);

export const getMaxRuns = (): number => DEFAULT_MAX_RUNS;
