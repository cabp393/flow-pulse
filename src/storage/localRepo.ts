import { createLayout } from '../models/defaults';
import type { AppState, PlayerComparePreferences } from '../models/domain';
import { buildRunPersistenceNotice, deserializeRun, estimateStorageSize, serializeRun } from './runRepo';
import { compressToUTF16, decompressFromUTF16 } from '../utils/lzString';

const STORAGE_KEY = 'flowpulse.state';
const PLAYER_COMPARE_STORAGE_KEY = 'flowpulse.player.compare';
const STORAGE_NOTICE_KEY = 'flowpulse.state.notice';
const STORAGE_MAX_BYTES = 4_500_000;

interface PersistedStateV2 {
  v: 2;
  layouts: AppState['layouts'];
  activeLayoutId?: string;
  skuMasters: AppState['skuMasters'];
  activeSkuMasterId?: string;
  runs: unknown[];
}

interface PersistedStateV3 {
  v: 3;
  encoding: 'lz-string-utf16';
  data: string;
}

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

const isPersistedStateV2 = (raw: unknown): raw is PersistedStateV2 => {
  if (!raw || typeof raw !== 'object') return false;
  const data = raw as Partial<PersistedStateV2>;
  return data.v === 2 && Array.isArray(data.layouts) && Array.isArray(data.skuMasters) && Array.isArray(data.runs);
};

const isPersistedStateV3 = (raw: unknown): raw is PersistedStateV3 => {
  if (!raw || typeof raw !== 'object') return false;
  const data = raw as Partial<PersistedStateV3>;
  return data.v === 3 && data.encoding === 'lz-string-utf16' && typeof data.data === 'string';
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
      const payload = JSON.parse(decompressFromUTF16(parsed.data));
      if (!isPersistedStateV2(payload)) return initialState();
      const restored: AppState = {
        layouts: payload.layouts,
        activeLayoutId: payload.activeLayoutId,
        skuMasters: payload.skuMasters,
        activeSkuMasterId: payload.activeSkuMasterId,
        runs: payload.runs.map((run) => deserializeRun(run)).filter((run): run is NonNullable<typeof run> => Boolean(run)),
      };
      return restored.layouts.length ? restored : initialState();
    }
    if (isPersistedStateV2(parsed)) {
      const restored: AppState = {
        layouts: parsed.layouts,
        activeLayoutId: parsed.activeLayoutId,
        skuMasters: parsed.skuMasters,
        activeSkuMasterId: parsed.activeSkuMasterId,
        runs: parsed.runs.map((run) => deserializeRun(run)).filter((run): run is NonNullable<typeof run> => Boolean(run)),
      };
      return restored.layouts.length ? restored : initialState();
    }

    if (!isValidState(parsed)) return initialState();
    return parsed.layouts.length ? parsed : initialState();
  } catch {
    return initialState();
  }
};

export const saveState = (state: AppState): void => {
  const notice = buildRunPersistenceNotice(state.runs);
  const compactRuns = state.runs.map((run) => serializeRun(run));

  const persisted: PersistedStateV2 = {
    v: 2,
    layouts: state.layouts,
    activeLayoutId: state.activeLayoutId,
    skuMasters: state.skuMasters,
    activeSkuMasterId: state.activeSkuMasterId,
    runs: compactRuns,
  };

  const size = estimateStorageSize(persisted);
  const payload = JSON.stringify(persisted);
  if (size > STORAGE_MAX_BYTES) {
    const reduced: PersistedStateV2 = { ...persisted, runs: state.runs.map((run) => serializeRun(run, { forceUltraCompact: true })) };
    const compressedReduced: PersistedStateV3 = {
      v: 3,
      encoding: 'lz-string-utf16',
      data: compressToUTF16(JSON.stringify(reduced)),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compressedReduced));
    localStorage.setItem(STORAGE_NOTICE_KEY, 'Run guardada en modo ultra compacto para no exceder almacenamiento. Algunas vistas pueden recalcular detalles bajo demanda.');
    return;
  }

  const compressedPayload: PersistedStateV3 = {
    v: 3,
    encoding: 'lz-string-utf16',
    data: compressToUTF16(payload),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(compressedPayload));
  if (notice) {
    localStorage.setItem(STORAGE_NOTICE_KEY, notice);
    return;
  }
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
