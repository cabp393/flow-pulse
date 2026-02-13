import { useEffect, useState } from 'react';
import type { AppState, Layout, PlayerComparePreferences } from './models/domain';
import { LayoutEditorPage } from './pages/LayoutEditorPage';
import { PalletImportPage } from './pages/PalletImportPage';
import { ResultsPage } from './pages/ResultsPage';
import { SkuMasterPage } from './pages/SkuMasterPage';
import { clearState, defaultPlayerComparePreferences, loadPlayerComparePreferences, loadState, savePlayerComparePreferences, saveState } from './storage/localRepo';
import { insertRun, clearOldRuns, removeRun } from './storage/runRepo';
import { ComparePage } from './compare/ComparePage';
import { PlayerComparePage } from './player/PlayerComparePage';

const tabs = ['home', 'layout', 'sku', 'pallets', 'results', 'compare', 'player-compare'] as const;
type Tab = (typeof tabs)[number];

const pathToTab = (pathname: string): Tab => {
  const clean = pathname.replace(/^\//, '');
  if (!clean || clean === 'home') return 'home';
  if (tabs.includes(clean as Tab)) return clean as Tab;
  return 'home';
};

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [tab, setTab] = useState<Tab>(() => pathToTab(window.location.pathname));
  const [compareRunAId, setCompareRunAId] = useState<string>();
  const [compareRunBId, setCompareRunBId] = useState<string>();
  const [playerComparePrefs, setPlayerComparePrefs] = useState<PlayerComparePreferences>(() => loadPlayerComparePreferences());

  useEffect(() => saveState(state), [state]);
  useEffect(() => savePlayerComparePreferences(playerComparePrefs), [playerComparePrefs]);

  const setLayout = (layout: Layout) => setState((s) => ({ ...s, layout }));

  const navigateTab = (next: Tab) => {
    setTab(next);
    window.history.pushState({}, '', next === 'home' ? '/' : `/${next}`);
  };

  return (
    <div className="app">
      <header>
        <h1>flowpulse</h1>
        <nav>
          {tabs.map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => navigateTab(t)}>{t}</button>)}
        </nav>
      </header>

      {tab === 'home' && <div className="page"><h2>Proyecto</h2><p>Comparación de escenarios de picking con múltiples SKU Masters.</p><div className="toolbar"><button onClick={() => setState((s) => ({ ...s, runs: clearOldRuns(s.runs) }))}>Limpiar runs antiguos</button><button onClick={() => { clearState(); setState(loadState()); setPlayerComparePrefs(defaultPlayerComparePreferences()); }}>Reset localStorage</button></div></div>}
      {tab === 'layout' && <LayoutEditorPage layout={state.layout} setLayout={setLayout} />}
      {tab === 'sku' && <SkuMasterPage layout={state.layout} masters={state.skuMasters} activeSkuMasterId={state.activeSkuMasterId} onChange={(skuMasters, activeSkuMasterId) => setState((s) => ({ ...s, skuMasters, activeSkuMasterId }))} />}
      {tab === 'pallets' && <PalletImportPage layout={state.layout} layoutVersionId={state.layoutVersionId} layoutName={state.layoutName} masters={state.skuMasters} activeSkuMasterId={state.activeSkuMasterId} onGeneratedRun={(run) => setState((s) => ({ ...s, runs: insertRun(s.runs, run) }))} />}
      {tab === 'results' && <ResultsPage layout={state.layout} runs={state.runs} masters={state.skuMasters} onDeleteRun={(runId) => setState((s) => ({ ...s, runs: removeRun(s.runs, runId) }))} />}
      {tab === 'compare' && <ComparePage layout={state.layout} runs={state.runs} runAId={compareRunAId} runBId={compareRunBId} onSelect={(a, b) => { setCompareRunAId(a); setCompareRunBId(b); setPlayerComparePrefs((prev) => ({ ...prev, runAId: a, runBId: b })); }} />}
      {tab === 'player-compare' && <PlayerComparePage layout={state.layout} runs={state.runs} prefs={playerComparePrefs} onChangePrefs={setPlayerComparePrefs} />}
    </div>
  );
}
