import { useEffect, useMemo, useState } from 'react';
import type { AppState, Layout, PlayerComparePreferences } from './models/domain';
import { LayoutEditorPage } from './pages/LayoutEditorPage';
import { LayoutsPage } from './pages/LayoutsPage';
import { PalletImportPage } from './pages/PalletImportPage';
import { ResultsPage } from './pages/ResultsPage';
import { SkuMasterPage } from './pages/SkuMasterPage';
import {
  clearState,
  defaultPlayerComparePreferences,
  loadPlayerComparePreferences,
  loadState,
  savePlayerComparePreferences,
  saveState,
} from './storage/localRepo';
import { insertRun, clearOldRuns, removeRun } from './storage/runRepo';
import { ComparePage } from './compare/ComparePage';
import { PlayerComparePage } from './player/PlayerComparePage';
import { createNewLayout, duplicateLayout, getMaxLayouts, insertLayout, removeLayout, renameLayout, updateLayout } from './storage/layoutRepo';
import { HomePage } from './pages/HomePage';

const tabs = ['home', 'layouts', 'layout-editor', 'sku', 'pallets', 'results', 'compare', 'player-compare'] as const;
type Tab = (typeof tabs)[number];

const topNavTabs: Array<{ id: Tab; label: string }> = [
  { id: 'layout-editor', label: 'Layout' },
  { id: 'sku', label: 'SKU' },
  { id: 'results', label: 'Heatmap' },
  { id: 'compare', label: 'Comparar' },
  { id: 'player-compare', label: 'Player' },
];

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
  const [layoutEditorState, setLayoutEditorState] = useState<{ isDirty: boolean; save: () => boolean; discard: () => void }>({
    isDirty: false,
    save: () => true,
    discard: () => {},
  });

  useEffect(() => saveState(state), [state]);
  useEffect(() => savePlayerComparePreferences(playerComparePrefs), [playerComparePrefs]);
  const activeLayout = useMemo(
    () => state.layouts.find((layout) => layout.layoutId === state.activeLayoutId) ?? state.layouts[0],
    [state.activeLayoutId, state.layouts],
  );

  const setLayout = (layout: Layout) => setState((s) => ({ ...s, layouts: updateLayout(s.layouts, layout) }));

  const exportJson = (filename: string, data: unknown) => {
    const payload = JSON.stringify(data, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const exportLayouts = () => exportJson(`flowpulse-layouts-${new Date().toISOString().slice(0, 10)}.json`, state.layouts);

  const exportLayout = (layoutId: string) => {
    const layout = state.layouts.find((item) => item.layoutId === layoutId);
    if (!layout) return;
    const safeName = layout.name.trim().replace(/\s+/g, '-').toLowerCase() || layout.layoutId;
    exportJson(`flowpulse-layout-${safeName}.json`, layout);
  };

  const importLayouts = (jsonPayload: string) => {
    try {
      const parsed = JSON.parse(jsonPayload);
      if (!Array.isArray(parsed)) {
        window.alert('Formato inválido: se esperaba un arreglo de layouts.');
        return;
      }

      const importedLayouts = parsed.filter((item): item is Layout => (
        item && typeof item === 'object'
        && typeof item.layoutId === 'string'
        && typeof item.name === 'string'
        && typeof item.width === 'number'
        && typeof item.height === 'number'
        && Array.isArray(item.gridData)
        && item.gridData.length === item.height
      ));

      if (!importedLayouts.length) {
        window.alert('No se encontraron layouts válidos para importar.');
        return;
      }

      setState((current) => {
        const dedupedImported = importedLayouts.map((layout) => ({
          ...layout,
          layoutId: current.layouts.some((existing) => existing.layoutId === layout.layoutId) ? crypto.randomUUID() : layout.layoutId,
        }));
        const maxSlots = Math.max(0, getMaxLayouts() - current.layouts.length);
        const selected = dedupedImported.slice(0, maxSlots);
        if (!selected.length) {
          window.alert('No hay espacio disponible para importar más layouts.');
          return current;
        }
        const nextLayouts = [...selected, ...current.layouts];
        return { ...current, layouts: nextLayouts, activeLayoutId: selected[0].layoutId };
      });
    } catch {
      window.alert('JSON inválido.');
    }
  };

  const exportSkuMasters = () => exportJson(`flowpulse-sku-masters-${new Date().toISOString().slice(0, 10)}.json`, state.skuMasters);

  const exportSkuMaster = (skuMasterId: string) => {
    const master = state.skuMasters.find((item) => item.skuMasterId === skuMasterId);
    if (!master) return;
    const safeName = master.name.trim().replace(/\s+/g, '-').toLowerCase() || master.skuMasterId;
    exportJson(`flowpulse-sku-master-${safeName}.json`, master);
  };

  const importSkuMasters = (jsonPayload: string) => {
    try {
      const parsed = JSON.parse(jsonPayload);
      const source = Array.isArray(parsed) ? parsed : [parsed];
      const imported = source.filter((item) => (
        item && typeof item === 'object'
        && typeof item.skuMasterId === 'string'
        && typeof item.name === 'string'
        && Array.isArray(item.rows)
        && item.index
      ));
      if (!imported.length) {
        window.alert('No se encontraron SKU masters válidos para importar.');
        return;
      }
      setState((current) => {
        const next = imported.map((master) => ({
          ...master,
          skuMasterId: current.skuMasters.some((existing) => existing.skuMasterId === master.skuMasterId) ? crypto.randomUUID() : master.skuMasterId,
        }));
        return {
          ...current,
          skuMasters: [...next, ...current.skuMasters],
          activeSkuMasterId: next[0]?.skuMasterId ?? current.activeSkuMasterId,
        };
      });
    } catch {
      window.alert('JSON inválido.');
    }
  };

  const navigateTab = (next: Tab) => {
    if (tab === 'layout-editor' && next !== 'layout-editor' && layoutEditorState.isDirty) {
      layoutEditorState.discard();
    }

    setTab(next);
    window.history.pushState({}, '', next === 'home' ? '/' : `/${next}`);
  };

  return (
    <div className="app">
      <header>
        <h1>flowpulse</h1>
        <nav>
          {topNavTabs.map((item) => (
            <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => navigateTab(item.id)}>{item.label}</button>
          ))}
        </nav>
      </header>

      {tab === 'home' && (
        <HomePage
          layouts={state.layouts}
          activeLayoutId={activeLayout?.layoutId}
          skuMasters={state.skuMasters}
          activeSkuMasterId={state.activeSkuMasterId}
          runs={state.runs}
          onCreateRun={(run) => setState((s) => ({ ...s, runs: insertRun(s.runs, run) }))}
          onSelectLayout={(layoutId) => setState((s) => ({ ...s, activeLayoutId: layoutId }))}
          onGoToLayouts={() => navigateTab('layouts')}
          onGoToSkuMasters={() => navigateTab('sku')}
          onGoToResults={() => navigateTab('results')}
          onGoToEditor={() => navigateTab('layout-editor')}
          onClearOldRuns={() => setState((s) => ({ ...s, runs: clearOldRuns(s.runs) }))}
          onResetStorage={() => {
            clearState();
            setState(loadState());
            setPlayerComparePrefs(defaultPlayerComparePreferences());
          }}
        />
      )}
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
      })} onExport={exportLayouts} onExportOne={exportLayout} onImport={importLayouts} />}
      {tab === 'layout-editor' && <LayoutEditorPage layout={activeLayout} setLayout={setLayout} onEditorStateChange={setLayoutEditorState} />}
      {tab === 'sku' && activeLayout && <SkuMasterPage layout={activeLayout} masters={state.skuMasters} activeSkuMasterId={state.activeSkuMasterId} onChange={(skuMasters, activeSkuMasterId) => setState((s) => ({ ...s, skuMasters, activeSkuMasterId }))} onImport={importSkuMasters} onExport={exportSkuMasters} onExportOne={exportSkuMaster} />}
      {tab === 'pallets' && <PalletImportPage layouts={state.layouts} activeLayoutId={activeLayout?.layoutId} masters={state.skuMasters} activeSkuMasterId={state.activeSkuMasterId} onGeneratedRun={(run) => setState((s) => ({ ...s, runs: insertRun(s.runs, run) }))} onSelectLayout={(layoutId) => setState((s) => ({ ...s, activeLayoutId: layoutId }))} />}
      {tab === 'results' && <ResultsPage layouts={state.layouts} runs={state.runs} masters={state.skuMasters} onDeleteRun={(runId) => setState((s) => ({ ...s, runs: removeRun(s.runs, runId) }))} />}
      {tab === 'compare' && activeLayout && <ComparePage layout={activeLayout} runs={state.runs} runAId={compareRunAId} runBId={compareRunBId} onSelect={(a, b) => { setCompareRunAId(a); setCompareRunBId(b); setPlayerComparePrefs((prev) => ({ ...prev, runAId: a, runBId: b })); }} />}
      {tab === 'player-compare' && <PlayerComparePage layouts={state.layouts} runs={state.runs} prefs={playerComparePrefs} onChangePrefs={setPlayerComparePrefs} />}
    </div>
  );
}
