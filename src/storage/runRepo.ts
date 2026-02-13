import type { RunResult } from '../models/domain';

const MAX_RUNS = 12;

export const insertRun = (runs: RunResult[], run: RunResult): RunResult[] => [run, ...runs].slice(0, MAX_RUNS);

export const clearOldRuns = (runs: RunResult[], keep = 4): RunResult[] => runs.slice(0, keep);

export const findRun = (runs: RunResult[], runId?: string): RunResult | undefined => runs.find((run) => run.runId === runId);
