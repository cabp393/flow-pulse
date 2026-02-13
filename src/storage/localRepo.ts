import { createLayout } from '../models/defaults';
import type { AppState, PlayerComparePreferences, SkuMaster } from '../models/domain';
import { hashLayout } from '../utils/layout';
import { buildSkuIndex } from './skuMasterRepo';

const STORAGE_KEY = 'flowpulse.state';
const PLAYER_COMPARE_STORAGE_KEY = 'flowpulse.player.compare';
const SCHEMA_VERSION = 3;

const normalizeMaster = (raw: Partial<SkuMaster>): SkuMaster | undefined => {
  if (!raw.skuMasterId || !raw.name || !raw.createdAt) return undefined;
  if (Array.isArray(raw.rows)) {
    return { ...raw, rows: raw.rows, index: buildSkuIndex(raw.rows) } as SkuMaster;
  }
  const mapping = (raw as unknown as { mapping?: Record<string, string> }).mapping;
  if (!mapping) return undefined;
  const rows = Object.entries(mapping).map(([sku, locationId], i) => ({ sku, locationId, sequence: (i + 1) * 10 }));
  return { skuMasterId: raw.skuMasterId, name: raw.name, createdAt: raw.createdAt, rows, index: buildSkuIndex(rows) };
};

const initialState = (): AppState => {
  const layout = createLayout();
  return {
    schemaVersion: SCHEMA_VERSION,
    layout,
    layoutVersionId: 'layoutV1',
    layoutName: 'layoutV1',
    skuMasters: [],
    activeSkuMasterId: undefined,
    runs: [],
  };
};

export const defaultPlayerComparePreferences = (): PlayerComparePreferences => ({
  runAId: undefined,
  runBId: undefined,
  palletIndex: 0,
  speedMs: 250,
  autoContinue: true,
});

const migrate = (raw: unknown): AppState => {
  if (!raw || typeof raw !== 'object') return initialState();
  const data = raw as Partial<AppState>;
  const migrated = initialState();
  migrated.layout = data.layout ?? createLayout();
  migrated.layoutVersionId = data.layoutVersionId ?? 'layoutV1';
  migrated.layoutName = data.layoutName ?? migrated.layoutVersionId;
  migrated.skuMasters = (data.skuMasters ?? []).map(normalizeMaster).filter((v): v is SkuMaster => Boolean(v));
  migrated.activeSkuMasterId = data.activeSkuMasterId;
  migrated.runs = data.runs ?? [];
  return migrated;
};

export const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialState();
    return migrate(JSON.parse(stored));
  } catch {
    return initialState();
  }
};

export const saveState = (state: AppState): void => {
  const layoutHash = hashLayout(state.layout);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION, layoutHash }));
};

export const loadPlayerComparePreferences = (): PlayerComparePreferences => {
  try {
    const stored = localStorage.getItem(PLAYER_COMPARE_STORAGE_KEY);
    if (!stored) return defaultPlayerComparePreferences();
    const raw = JSON.parse(stored) as Partial<PlayerComparePreferences>;
    return {
      runAId: raw.runAId,
      runBId: raw.runBId,
      palletIndex: Math.max(0, Math.floor(raw.palletIndex ?? 0)),
      speedMs: Math.max(40, Math.floor(raw.speedMs ?? 250)),
      autoContinue: Boolean(raw.autoContinue ?? true),
    };
  } catch {
    return defaultPlayerComparePreferences();
  }
};

export const savePlayerComparePreferences = (preferences: PlayerComparePreferences): void => {
  localStorage.setItem(PLAYER_COMPARE_STORAGE_KEY, JSON.stringify(preferences));
};

export const clearState = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PLAYER_COMPARE_STORAGE_KEY);
};

export const getSchemaVersion = (): number => SCHEMA_VERSION;
