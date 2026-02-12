import { createLayout } from '../models/defaults';
import type { AppState, PlayerPreferences } from '../models/domain';

const STORAGE_KEY = 'flowpulse.state';
const PLAYER_STORAGE_KEY = 'flowpulse.player';
const SCHEMA_VERSION = 1;

const initialState = (): AppState => ({
  schemaVersion: SCHEMA_VERSION,
  layout: createLayout(),
  skuMap: {},
  lastRun: undefined,
});

export const defaultPlayerPreferences = (): PlayerPreferences => ({
  runId: undefined,
  palletIndex: 0,
  speedMs: 250,
  autoContinue: true,
  followCamera: false,
});

const migrate = (raw: unknown): AppState => {
  if (!raw || typeof raw !== 'object') return initialState();
  const data = raw as Partial<AppState>;
  if (!data.schemaVersion || data.schemaVersion < 1) return initialState();
  return {
    schemaVersion: SCHEMA_VERSION,
    layout: data.layout ?? createLayout(),
    skuMap: data.skuMap ?? {},
    lastRun: data.lastRun
      ? {
          ...data.lastRun,
          runId: data.lastRun.runId ?? data.lastRun.createdAt,
          layoutHash: data.lastRun.layoutHash ?? '',
        }
      : undefined,
  };
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

export const clearState = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PLAYER_STORAGE_KEY);
};

export const getSchemaVersion = (): number => SCHEMA_VERSION;
