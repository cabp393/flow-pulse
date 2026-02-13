import { createLayout } from '../models/defaults';
import type { AppState, PlayerComparePreferences } from '../models/domain';

const STORAGE_KEY = 'flowpulse.state';
const PLAYER_COMPARE_STORAGE_KEY = 'flowpulse.player.compare';

const initialState = (): AppState => ({
  layouts: [createLayout('Layout 1')],
  activeLayoutId: undefined,
  skuMasters: [],
  activeSkuMasterId: undefined,
  runs: [],
});

const isValidState = (raw: unknown): raw is AppState => {
  if (!raw || typeof raw !== 'object') return false;
  const data = raw as Partial<AppState>;
  return Array.isArray(data.layouts) && Array.isArray(data.skuMasters) && Array.isArray(data.runs);
};

export const defaultPlayerComparePreferences = (): PlayerComparePreferences => ({
  runAId: undefined,
  runBId: undefined,
  palletIndex: 0,
  speedMs: 40,
  autoContinue: true,
});

export const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialState();
    const parsed = JSON.parse(stored);
    if (!isValidState(parsed)) return initialState();
    return parsed.layouts.length ? parsed : initialState();
  } catch {
    return initialState();
  }
};

export const saveState = (state: AppState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
      speedMs: Math.max(40, Math.floor(raw.speedMs ?? 40)),
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
