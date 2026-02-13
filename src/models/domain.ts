export type CellType = 'WALL' | 'AISLE' | 'PICK' | 'START' | 'END';

export interface Coord {
  x: number;
  y: number;
}

export interface MovementRules {
  allowUp: boolean;
  allowDown: boolean;
  allowLeft: boolean;
  allowRight: boolean;
}

export interface PickMeta {
  locationId: string;
  sequence: number;
  accessCell: Coord;
}

export interface Cell {
  type: CellType;
  movement?: MovementRules;
  pick?: PickMeta;
}

export interface Layout {
  width: number;
  height: number;
  grid: Cell[][];
}

export type SkuMap = Record<string, string>;

export interface SkuMaster {
  skuMasterId: string;
  name: string;
  mapping: SkuMap;
  createdAt: string;
}

export interface PalletLine {
  pallet_id: string;
  sku: string;
}

export interface PalletBatch {
  palletBatchId: string;
  name: string;
  lines: PalletLine[];
  createdAt: string;
}

export interface PalletResolved {
  palletId: string;
  skus: string[];
  locationIds: string[];
  picks: { sku: string; locationId: string; sequence: number }[];
  issues: string[];
}

export interface RunStopDetail {
  order: number;
  sku: string;
  locationId: string;
  sequence: number;
  accessCell: Coord;
}

export interface RunPalletResult {
  runId: string;
  palletId: string;
  steps: number;
  hasPath: boolean;
  issuesCount: number;
  visited?: Coord[];
  stops?: Coord[];
  stopDetails: RunStopDetail[];
  issues: string[];
}

export interface RunSummary {
  totalPallets: number;
  totalSteps: number;
  avgSteps: number;
  errorCount: number;
}

export interface RunResult {
  runId: string;
  layoutVersionId: string;
  palletBatchId: string;
  skuMasterId: string;
  routingParamsHash: string;
  createdAt: string;
  summary: RunSummary;
  heatmapSteps: number[][];
  palletOrder: string[];
  palletResults: RunPalletResult[];
}

export interface PlayerPreferences {
  runId?: string;
  palletIndex: number;
  speedMs: number;
  autoContinue: boolean;
  followCamera: boolean;
}

export interface PlayerComparePreferences {
  runAId?: string;
  runBId?: string;
  palletIndex: number;
  speedMs: number;
  autoContinue: boolean;
}

export interface AppState {
  schemaVersion: number;
  layout: Layout;
  skuMasters: SkuMaster[];
  activeSkuMasterId?: string;
  palletBatches: PalletBatch[];
  runs: RunResult[];
}
