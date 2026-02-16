import type { RunPalletResult, RunPickPlanItem, RunResult } from '../models/domain';

const DEFAULT_MAX_RUNS = 20;
const LARGE_RUN_THRESHOLD_CHARS = 3_500_000;

const ISSUE_BITS = {
  missingSkuMapping: 1,
  invalidLocation: 2,
  noRoute: 4,
  unexpected: 8,
} as const;

const decodeIssueBits = (bits: number): string[] => {
  const issues: string[] = [];
  if (bits & ISSUE_BITS.missingSkuMapping) issues.push('SKU sin mapping en SKU Master.');
  if (bits & ISSUE_BITS.invalidLocation) issues.push('Ubicación de pick inválida o inaccesible.');
  if (bits & ISSUE_BITS.noRoute) issues.push('Sin ruta entre nodos del recorrido.');
  if (bits & ISSUE_BITS.unexpected) issues.push('Error inesperado procesando pallet.');
  return issues;
};

const encodeIssueBits = (issues: string[]): number => {
  let bits = 0;
  issues.forEach((issue) => {
    const normalized = issue.toLowerCase();
    if (normalized.includes('sin mapping')) bits |= ISSUE_BITS.missingSkuMapping;
    else if (normalized.includes('no existe') || normalized.includes('inaccesible')) bits |= ISSUE_BITS.invalidLocation;
    else if (normalized.includes('sin ruta')) bits |= ISSUE_BITS.noRoute;
    else bits |= ISSUE_BITS.unexpected;
  });
  return bits;
};

interface CompactHeatmap {
  w: number;
  h: number;
  sparse: Array<[number, number]>;
}

interface CompactRunMeta {
  compact: boolean;
  ultraCompact: boolean;
  omitted: string[];
  estimatedChars: number;
}

interface CompactRun {
  v: 1;
  runId: string;
  name: string;
  createdAt: string;
  layoutId: string;
  skuMasterId: string;
  layoutHash: string;
  skuMasterHash: string;
  summary: RunResult['summary'];
  palletOrder: string[];
  skuDict?: string[];
  locDict?: string[];
  palletResults: Array<{
    palletId: string;
    steps: number;
    skuCount: number;
    missingSkuCount: number;
    hasPath: boolean;
    issuesCode: number;
    issuesCount: number;
    stops?: Array<[number, number]>;
    pickPlan?: Array<[number, number, number, number, number, 0 | 1, number[]?]>;
  }>;
  heatmap?: CompactHeatmap;
  meta: CompactRunMeta;
}

const getOrInsert = (dict: string[], reverse: Map<string, number>, value: string): number => {
  const current = reverse.get(value);
  if (current !== undefined) return current;
  const index = dict.length;
  dict.push(value);
  reverse.set(value, index);
  return index;
};

const compactHeatmap = (heatmap: number[][]): CompactHeatmap | undefined => {
  const h = heatmap.length;
  const w = heatmap[0]?.length ?? 0;
  if (!w || !h) return undefined;

  const sparse: Array<[number, number]> = [];
  for (let y = 0; y < h; y += 1) {
    const row = heatmap[y] ?? [];
    for (let x = 0; x < w; x += 1) {
      const value = row[x] ?? 0;
      if (value > 0) sparse.push([y * w + x, value]);
    }
  }
  return { w, h, sparse };
};

const expandHeatmap = (compact?: CompactHeatmap): number[][] => {
  if (!compact || compact.w <= 0 || compact.h <= 0) return [];
  const flat = new Uint32Array(compact.w * compact.h);
  compact.sparse.forEach(([index, value]) => {
    if (index >= 0 && index < flat.length) flat[index] = value;
  });

  const rows: number[][] = [];
  for (let y = 0; y < compact.h; y += 1) {
    const offset = y * compact.w;
    rows.push(Array.from(flat.slice(offset, offset + compact.w)));
  }
  return rows;
};

const estimateChars = (value: unknown): number => {
  try {
    return JSON.stringify(value).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
};

const toCompactPickPlan = (
  pickPlan: RunPickPlanItem[] | undefined,
  skuDict: string[],
  locDict: string[],
  skuReverse: Map<string, number>,
  locReverse: Map<string, number>,
): Array<[number, number, number, number, number, 0 | 1, number[]?]> | undefined => {
  if (!pickPlan?.length) return undefined;
  return pickPlan.map((item) => {
    const skuIdx = getOrInsert(skuDict, skuReverse, item.sku);
    const locIdx = getOrInsert(locDict, locReverse, item.locationId);
    const status: 0 | 1 = item.status === 'missing' ? 1 : 0;
    const skusInLocation = item.skusInLocation?.length
      ? item.skusInLocation.map((sku) => getOrInsert(skuDict, skuReverse, sku))
      : undefined;
    return [item.sequence, skuIdx, locIdx, item.accessX, item.accessY, status, skusInLocation];
  });
};

const fromCompactPickPlan = (
  compact: Array<[number, number, number, number, number, 0 | 1, number[]?]> | undefined,
  skuDict: string[],
  locDict: string[],
): RunPickPlanItem[] | undefined => {
  if (!compact?.length) return undefined;
  return compact.map(([sequence, skuIdx, locIdx, accessX, accessY, status, skusInLocation]) => ({
    sequence,
    sku: skuDict[skuIdx] ?? '',
    locationId: locDict[locIdx] ?? '',
    accessX,
    accessY,
    status: status === 1 ? 'missing' : undefined,
    skusInLocation: skusInLocation?.map((idx) => skuDict[idx] ?? '').filter(Boolean),
  }));
};

const toCompactStops = (
  stops: RunPalletResult['stops'],
  locDict: string[],
  locReverse: Map<string, number>,
): Array<[number, number]> | undefined => {
  if (!stops.length) return undefined;
  return stops.map((stop) => [stop.sequence, getOrInsert(locDict, locReverse, stop.locationId)]);
};

const fromCompactStops = (stops: Array<[number, number]> | undefined, locDict: string[]) => {
  if (!stops?.length) return [];
  return stops.map(([sequence, locIdx]) => ({ sequence, locationId: locDict[locIdx] ?? '' }));
};

export interface SerializeRunOptions {
  forceUltraCompact?: boolean;
}

export const serializeRun = (run: RunResult, options: SerializeRunOptions = {}): CompactRun => {
  const skuDict: string[] = [];
  const locDict: string[] = [];
  const skuReverse = new Map<string, number>();
  const locReverse = new Map<string, number>();

  const compact: CompactRun = {
    v: 1,
    runId: run.runId,
    name: run.name,
    createdAt: run.createdAt,
    layoutId: run.layoutId,
    skuMasterId: run.skuMasterId,
    layoutHash: run.layoutHash,
    skuMasterHash: run.skuMasterHash,
    summary: run.summary,
    palletOrder: run.palletOrder,
    palletResults: run.palletResults.map((item) => ({
      palletId: item.palletId,
      steps: item.steps,
      skuCount: item.skuCount ?? 0,
      missingSkuCount: item.missingSkuCount ?? 0,
      hasPath: item.hasPath,
      issuesCode: encodeIssueBits(item.issues),
      issuesCount: item.issues.length,
      stops: toCompactStops(item.stops, locDict, locReverse),
      pickPlan: toCompactPickPlan(item.pickPlan, skuDict, locDict, skuReverse, locReverse),
    })),
    heatmap: compactHeatmap(run.heatmapSteps),
    meta: { compact: true, ultraCompact: false, omitted: [], estimatedChars: 0 },
  };

  if (skuDict.length) compact.skuDict = skuDict;
  if (locDict.length) compact.locDict = locDict;

  compact.meta.estimatedChars = estimateChars(compact);

  const shouldUltraCompact = options.forceUltraCompact || compact.meta.estimatedChars > LARGE_RUN_THRESHOLD_CHARS;
  if (shouldUltraCompact) {
    compact.palletResults = compact.palletResults.map((item) => ({ ...item, pickPlan: undefined }));
    compact.heatmap = undefined;
    compact.meta.ultraCompact = true;
    compact.meta.omitted = ['pickPlan', 'heatmap'];
    compact.meta.estimatedChars = estimateChars(compact);
  }

  return compact;
};

const isCompactRun = (value: unknown): value is CompactRun => {
  if (!value || typeof value !== 'object') return false;
  return (value as { v?: number }).v === 1 && typeof (value as { runId?: string }).runId === 'string';
};

export const deserializeRun = (data: unknown): RunResult | undefined => {
  if (!isCompactRun(data)) {
    return data as RunResult;
  }

  const skuDict = data.skuDict ?? [];
  const locDict = data.locDict ?? [];

  return {
    runId: data.runId,
    name: data.name,
    createdAt: data.createdAt,
    layoutId: data.layoutId,
    skuMasterId: data.skuMasterId,
    layoutHash: data.layoutHash,
    skuMasterHash: data.skuMasterHash,
    summary: data.summary,
    palletOrder: data.palletOrder,
    palletResults: data.palletResults.map((item) => ({
      palletId: item.palletId,
      steps: item.steps,
      skuCount: item.skuCount,
      missingSkuCount: item.missingSkuCount,
      hasPath: item.hasPath,
      issues: decodeIssueBits(item.issuesCode),
      stops: fromCompactStops(item.stops, locDict),
      pickPlan: fromCompactPickPlan(item.pickPlan, skuDict, locDict),
    })),
    heatmapSteps: expandHeatmap(data.heatmap),
  };
};

export const estimateStorageSize = (value: unknown): number => estimateChars(value) * 2;

export const insertRun = (runs: RunResult[], run: RunResult, maxRuns = DEFAULT_MAX_RUNS): RunResult[] => [run, ...runs].slice(0, maxRuns);

export const clearOldRuns = (runs: RunResult[], keep = 4): RunResult[] => runs.slice(0, keep);

export const findRun = (runs: RunResult[], runId?: string): RunResult | undefined => runs.find((run) => run.runId === runId);

export const removeRun = (runs: RunResult[], runId: string): RunResult[] => runs.filter((run) => run.runId !== runId);

export const getMaxRuns = (): number => DEFAULT_MAX_RUNS;

export const buildRunPersistenceNotice = (runs: RunResult[]): string | undefined => {
  const compacted = runs.map((run) => serializeRun(run));
  const ultra = compacted.filter((run) => run.meta.ultraCompact).length;
  if (!ultra) return undefined;
  return `Se guardaron ${ultra} runs en modo ultra compacto para evitar exceder localStorage. Algunas vistas pueden recalcular o mostrar menos detalle.`;
};
