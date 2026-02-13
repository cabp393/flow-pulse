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
  accessCell: Coord;
}

export interface Cell {
  type: CellType;
  movement?: MovementRules;
  pick?: PickMeta;
}

export interface Layout {
  layoutId: string;
  name: string;
  createdAt: string;
  width: number;
  height: number;
  gridData: Cell[][];
  movementRules: MovementRules;
  startCell?: Coord;
  endCell?: Coord;
}

export interface SkuMasterRow {
  sku: string;
  locationId: string;
  sequence: number;
}

export interface SkuLocationSequence {
  locationId: string;
  sequence: number;
}

export interface SkuMaster {
  skuMasterId: string;
  name: string;
  createdAt: string;
  rows: SkuMasterRow[];
  index: Record<string, SkuLocationSequence[]>;
}

export interface PalletLine {
  pallet_id: string;
  sku: string;
}

export interface RunPalletStop {
  locationId: string;
  sequence: number;
}

export interface RunPalletResult {
  palletId: string;
  steps: number;
  hasPath: boolean;
  issues: string[];
  stops: RunPalletStop[];
  visited?: Coord[];
}

export interface RunSummary {
  totalPallets: number;
  okPallets: number;
  errorPallets: number;
  totalSteps: number;
  avgSteps: number;
}

export interface RunResult {
  runId: string;
  name: string;
  createdAt: string;
  layoutId: string;
  skuMasterId: string;
  layoutHash: string;
  skuMasterHash: string;
  summary: RunSummary;
  palletOrder: string[];
  palletResults: RunPalletResult[];
  heatmapSteps: number[][];
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
  layouts: Layout[];
  activeLayoutId?: string;
  skuMasters: SkuMaster[];
  activeSkuMasterId?: string;
  runs: RunResult[];
}
