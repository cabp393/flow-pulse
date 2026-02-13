import type { Layout, PlayerPreferences, RunResult } from '../models/domain';

interface Props {
  layout: Layout;
  run?: RunResult;
  savedPreferences: PlayerPreferences;
  onPreferencesChange: (prefs: PlayerPreferences) => void;
  preselectedPalletId?: string;
}

export function PlayerPage({ run }: Props) {
  return <div className="page">Player legado. Usa la nueva pantalla <strong>player-compare</strong>. Run actual: {run?.runId ?? 'n/a'}</div>;
}
