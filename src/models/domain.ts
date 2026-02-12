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

export interface PalletLine {
  pallet_id: string;
  sku: string;
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
  palletId: string;
  steps: number;
  visited: Coord[];
  stops: Coord[];
  stopDetails: RunStopDetail[];
  issues: string[];
}

export interface RunResult {
  heatmap: number[][];
  pallets: RunPalletResult[];
  totalSteps: number;
  createdAt: string;
}

export interface AppState {
  schemaVersion: number;
  layout: Layout;
  skuMap: SkuMap;
  lastRun?: RunResult;
}
