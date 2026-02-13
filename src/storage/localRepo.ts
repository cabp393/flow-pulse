import { createLayout } from '../models/defaults';
import type { AppState, PlayerComparePreferences, PlayerPreferences } from '../models/domain';

const STORAGE_KEY = 'flowpulse.state';
const PLAYER_STORAGE_KEY = 'flowpulse.player';
const PLAYER_COMPARE_STORAGE_KEY = 'flowpulse.player.compare';
const SCHEMA_VERSION = 2;

const initialState = (): AppState => ({
  schemaVersion: SCHEMA_VERSION,
  layout: createLayout(),
  skuMasters: [],
  activeSkuMasterId: undefined,
  palletBatches: [],
  runs: [],
});

export const defaultPlayerPreferences = (): PlayerPreferences => ({
  runId: undefined,
  palletIndex: 0,
  speedMs: 250,
  autoContinue: true,
  followCamera: false,
});

export const defaultPlayerComparePreferences = (): PlayerComparePreferences => ({
  runAId: undefined,
  runBId: undefined,
  palletIndex: 0,
  speedMs: 250,
  autoContinue: true,
});

const migrate = (raw: unknown): AppState => {
  if (!raw || typeof raw !== 'object') return initialState();
  const data = raw as Partial<AppState> & { skuMap?: Record<string, string> };
  if (!data.schemaVersion || data.schemaVersion < 1) return initialState();

  const migrated = initialState();
  migrated.layout = data.layout ?? createLayout();
  migrated.skuMasters = data.skuMasters ?? [];
  migrated.activeSkuMasterId = data.activeSkuMasterId;
  migrated.palletBatches = data.palletBatches ?? [];
  migrated.runs = data.runs ?? [];

  if (!migrated.skuMasters.length && data.skuMap && Object.keys(data.skuMap).length) {
    const skuMasterId = crypto.randomUUID();
    migrated.skuMasters = [{ skuMasterId, name: 'Migrado', mapping: data.skuMap, createdAt: new Date().toISOString() }];
    migrated.activeSkuMasterId = skuMasterId;
  }

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }));
};

export const loadPlayerPreferences = (): PlayerPreferences => {
  try {
    const stored = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!stored) return defaultPlayerPreferences();
    const raw = JSON.parse(stored) as Partial<PlayerPreferences>;
    return {
      runId: raw.runId,
      palletIndex: Math.max(0, Math.floor(raw.palletIndex ?? 0)),
      speedMs: Math.max(40, Math.floor(raw.speedMs ?? 250)),
      autoContinue: Boolean(raw.autoContinue ?? true),
      followCamera: Boolean(raw.followCamera),
    };
  } catch {
    return defaultPlayerPreferences();
  }
};

export const savePlayerPreferences = (preferences: PlayerPreferences): void => {
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(preferences));
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
  localStorage.removeItem(PLAYER_STORAGE_KEY);
  localStorage.removeItem(PLAYER_COMPARE_STORAGE_KEY);
};

export const getSchemaVersion = (): number => SCHEMA_VERSION;
