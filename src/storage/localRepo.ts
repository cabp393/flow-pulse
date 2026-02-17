import { createLayout } from '../models/defaults';
import type { AppState, PlayerComparePreferences } from '../models/domain';

const STORAGE_KEY = 'flowpulse.state';
const PLAYER_COMPARE_STORAGE_KEY = 'flowpulse.player.compare';
const STORAGE_NOTICE_KEY = 'flowpulse.state.notice';

interface PersistedStateV3 extends AppState {
  v: 3;
}

const initialState = (): AppState => ({
  layouts: [createLayout('Layout 1')],
  activeLayoutId: undefined,
  skuMasters: [],
  activeSkuMasterId: undefined,
  batches: [],
  runConfigs: [],
});

const isPersistedStateV3 = (raw: unknown): raw is PersistedStateV3 => {
  if (!raw || typeof raw !== 'object') return false;
  const data = raw as Partial<PersistedStateV3>;
  return data.v === 3 && Array.isArray(data.layouts) && Array.isArray(data.skuMasters) && Array.isArray(data.batches) && Array.isArray(data.runConfigs);
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
    if (isPersistedStateV3(parsed)) {
      return parsed.layouts.length ? parsed : initialState();
    }

    const legacy = parsed as { layouts?: AppState['layouts']; activeLayoutId?: string; skuMasters?: AppState['skuMasters']; activeSkuMasterId?: string };
    if (Array.isArray(legacy.layouts) && Array.isArray(legacy.skuMasters)) {
      return {
        layouts: legacy.layouts.length ? legacy.layouts : initialState().layouts,
        activeLayoutId: legacy.activeLayoutId,
        skuMasters: legacy.skuMasters,
        activeSkuMasterId: legacy.activeSkuMasterId,
        batches: [],
        runConfigs: [],
      };
    }

    return initialState();
  } catch {
    return initialState();
  }
};

export const saveState = (state: AppState): void => {
  const persisted: PersistedStateV3 = { v: 3, ...state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  localStorage.removeItem(STORAGE_NOTICE_KEY);
};

export const loadStorageNotice = (): string | undefined => localStorage.getItem(STORAGE_NOTICE_KEY) ?? undefined;

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
  localStorage.removeItem(STORAGE_NOTICE_KEY);
};
