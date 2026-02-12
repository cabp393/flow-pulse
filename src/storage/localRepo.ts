import { createLayout } from '../models/defaults';
import type { AppState } from '../models/domain';

const STORAGE_KEY = 'flowpulse.state';
const SCHEMA_VERSION = 1;

const initialState = (): AppState => ({
  schemaVersion: SCHEMA_VERSION,
  layout: createLayout(),
  skuMap: {},
  lastRun: undefined,
});

const migrate = (raw: unknown): AppState => {
  if (!raw || typeof raw !== 'object') return initialState();
  const data = raw as Partial<AppState>;
  if (!data.schemaVersion || data.schemaVersion < 1) return initialState();
  return {
    schemaVersion: SCHEMA_VERSION,
    layout: data.layout ?? createLayout(),
    skuMap: data.skuMap ?? {},
    lastRun: data.lastRun,
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

export const clearState = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getSchemaVersion = (): number => SCHEMA_VERSION;
