import { useEffect, useMemo, useState } from 'react';
import type { AppState, Layout, PlayerComparePreferences } from './models/domain';
import { LayoutEditorPage } from './pages/LayoutEditorPage';
import { LayoutsPage } from './pages/LayoutsPage';
import { PalletImportPage } from './pages/PalletImportPage';
import { ResultsPage } from './pages/ResultsPage';
import { SkuMasterPage } from './pages/SkuMasterPage';
import { clearState, defaultPlayerComparePreferences, loadPlayerComparePreferences, loadState, savePlayerComparePreferences, saveState } from './storage/localRepo';
import { insertRun, clearOldRuns, removeRun } from './storage/runRepo';
import { ComparePage } from './compare/ComparePage';
import { PlayerComparePage } from './player/PlayerComparePage';
import { createNewLayout, duplicateLayout, insertLayout, removeLayout, renameLayout, updateLayout } from './storage/layoutRepo';

const tabs = ['home', 'layouts', 'layout-editor', 'sku', 'pallets', 'results', 'compare', 'player-compare'] as const;
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

  const activeLayout = useMemo(
    () => state.layouts.find((layout) => layout.layoutId === state.activeLayoutId) ?? state.layouts[0],
    [state.activeLayoutId, state.layouts],
  );

  const setLayout = (layout: Layout) => setState((s) => ({ ...s, layouts: updateLayout(s.layouts, layout) }));

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
      {tab === 'layouts' && <LayoutsPage layouts={state.layouts} activeLayoutId={activeLayout?.layoutId} onCreate={() => {
        const next = createNewLayout(state.layouts);
        setState((s) => ({ ...s, layouts: insertLayout(s.layouts, next), activeLayoutId: next.layoutId }));
      }} onSelect={(layoutId) => setState((s) => ({ ...s, activeLayoutId: layoutId }))} onEdit={(layoutId) => {
        setState((s) => ({ ...s, activeLayoutId: layoutId }));
        navigateTab('layout-editor');
      }} onDuplicate={(layoutId) => {
        const duplicated = duplicateLayout(state.layouts, layoutId);
        setState((s) => ({ ...s, layouts: duplicated, activeLayoutId: duplicated[0]?.layoutId ?? s.activeLayoutId }));
      }} onRename={(layoutId, name) => setState((s) => ({ ...s, layouts: renameLayout(s.layouts, layoutId, name) }))} onDelete={(layoutId) => setState((s) => {
        const nextLayouts = removeLayout(s.layouts, layoutId);
        return { ...s, layouts: nextLayouts, activeLayoutId: nextLayouts.some((l) => l.layoutId === s.activeLayoutId) ? s.activeLayoutId : nextLayouts[0]?.layoutId };
      })} />}
      {tab === 'layout-editor' && <LayoutEditorPage layout={activeLayout} setLayout={setLayout} />}
      {tab === 'sku' && activeLayout && <SkuMasterPage layout={activeLayout} masters={state.skuMasters} activeSkuMasterId={state.activeSkuMasterId} onChange={(skuMasters, activeSkuMasterId) => setState((s) => ({ ...s, skuMasters, activeSkuMasterId }))} />}
      {tab === 'pallets' && <PalletImportPage layouts={state.layouts} activeLayoutId={activeLayout?.layoutId} masters={state.skuMasters} activeSkuMasterId={state.activeSkuMasterId} onGeneratedRun={(run) => setState((s) => ({ ...s, runs: insertRun(s.runs, run) }))} onSelectLayout={(layoutId) => setState((s) => ({ ...s, activeLayoutId: layoutId }))} />}
      {tab === 'results' && <ResultsPage layouts={state.layouts} runs={state.runs} masters={state.skuMasters} onDeleteRun={(runId) => setState((s) => ({ ...s, runs: removeRun(s.runs, runId) }))} />}
      {tab === 'compare' && activeLayout && <ComparePage layout={activeLayout} runs={state.runs} runAId={compareRunAId} runBId={compareRunBId} onSelect={(a, b) => { setCompareRunAId(a); setCompareRunBId(b); setPlayerComparePrefs((prev) => ({ ...prev, runAId: a, runBId: b })); }} />}
      {tab === 'player-compare' && <PlayerComparePage layouts={state.layouts} runs={state.runs} prefs={playerComparePrefs} onChangePrefs={setPlayerComparePrefs} />}
    </div>
  );
}
