import { useEffect, useMemo, useState } from 'react';
import type { AppState, Layout, PlayerComparePreferences, RunResult } from './models/domain';
import { LayoutEditorPage } from './pages/LayoutEditorPage';
import { clearState, defaultPlayerComparePreferences, loadPlayerComparePreferences, loadState, savePlayerComparePreferences, saveState, loadStorageNotice } from './storage/localRepo';
import { insertRun, clearOldRuns, removeRun } from './storage/runRepo';
import { ComparePage } from './compare/ComparePage';
import { PlayerComparePage } from './player/PlayerComparePage';
import { createNewLayout, duplicateLayout, getMaxLayouts, insertLayout, removeLayout, renameLayout, updateLayout } from './storage/layoutRepo';
import { HomePage } from './pages/HomePage';
import { createSkuMaster } from './storage/skuMasterRepo';
import { AdvancedPage } from './pages/AdvancedPage';
import { compactTimestamp, downloadFile, sanitizeFileToken, toSkuMasterCsv, validateImportedLayout } from './utils/transfer';
import { parseSkuMasterCsv } from './utils/parsers';
import { ResultsPage } from './pages/ResultsPage';
import { Sidebar } from './components/Sidebar';
import { AppTopbar } from './components/AppTopbar';
import { AssetsPage } from './pages/AssetsPage';

const tabs = ['dashboard', 'assets', 'layout-editor', 'runs', 'compare', 'player', 'settings'] as const;
type Tab = (typeof tabs)[number];

const pathToTab = (pathname: string, hash: string): Tab => {
  const hashRoute = hash.replace(/^#\/?/, '').split('?')[0];
  const clean = (hashRoute || pathname.replace(/^\//, '')).trim();
  if (!clean || clean === 'home' || clean === 'dashboard') return 'dashboard';
  if (clean === 'results' || clean === 'runs') return 'runs';
  if (clean === 'player-compare' || clean === 'player') return 'player';
  if (clean === 'advanced' || clean === 'settings') return 'settings';
  if (clean === 'layouts' || clean === 'sku' || clean === 'assets') return 'assets';
  if (tabs.includes(clean as Tab)) return clean as Tab;
  return 'dashboard';
};

const getRouteQuery = (): URLSearchParams => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const queryPart = hash.split('?')[1];
  if (queryPart) return new URLSearchParams(queryPart);
  return new URLSearchParams(window.location.search);
};

const parsePlayerCompareQuery = (runs: RunResult[]): Partial<PlayerComparePreferences> | undefined => {
  const params = getRouteQuery();
  const runAId = params.get('runA') || undefined;
  const runBId = params.get('runB') || undefined;
  const palletId = params.get('pallet') || undefined;
  const palletIndexRaw = params.get('palletIndex');
  const autoRaw = params.get('auto');
  if (!runAId && !runBId && !palletId && !palletIndexRaw && !autoRaw) return undefined;

  const runA = runs.find((run) => run.runId === runAId);
  const runB = runs.find((run) => run.runId === runBId);
  const palletOrderA = runA?.palletOrder ?? [];
  const palletOrderB = runB?.palletOrder ?? [];

  let palletIndex: number | undefined;
  if (palletId) {
    const foundInA = palletOrderA.indexOf(palletId);
    const foundInB = palletOrderB.indexOf(palletId);
    if (foundInA >= 0) palletIndex = foundInA;
    else if (foundInB >= 0) palletIndex = foundInB;
  }

  if (palletIndex === undefined && palletIndexRaw) {
    const parsed = Number(palletIndexRaw);
    if (!Number.isNaN(parsed)) palletIndex = Math.max(0, Math.floor(parsed));
  }

  return { runAId, runBId, palletIndex, autoContinue: autoRaw === '0' ? false : undefined };
};

const ensureUniqueLayoutName = (name: string, existing: Layout[]): string => {
  if (!existing.some((layout) => layout.name === name)) return name;
  const importedBase = `${name} (importado)`;
  if (!existing.some((layout) => layout.name === importedBase)) return importedBase;
  let suffix = 2;
  while (existing.some((layout) => layout.name === `${importedBase} ${suffix}`)) suffix += 1;
  return `${importedBase} ${suffix}`;
};

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'runs', label: 'Runs', icon: 'runs' },
  { id: 'compare', label: 'Compare', icon: 'compare' },
  { id: 'player', label: 'Player', icon: 'player' },
  { id: 'assets', label: 'Assets', icon: 'assets' },
];

const topbarMeta: Record<Tab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Centro operativo para generar y revisar runs recientes.' },
  runs: { title: 'Runs Explorer', subtitle: 'Explora heatmaps, errores y metadata de cada ejecución.' },
  compare: { title: 'Compare', subtitle: 'Compara rendimiento entre dos runs con escala opcional compartida.' },
  player: { title: 'Player', subtitle: 'Reproduce secuencias de picking y controla velocidad de simulación.' },
  assets: { title: 'Assets', subtitle: 'Gestiona layouts y SKU masters desde una sola vista.' },
  settings: { title: 'Settings', subtitle: 'Acciones administrativas y mantenimiento del almacenamiento local.' },
  'layout-editor': { title: 'Layout Editor', subtitle: 'Editor visual del layout activo.' },
};

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [tab, setTab] = useState<Tab>(() => pathToTab(window.location.pathname, window.location.hash));
  const [compareRunAId, setCompareRunAId] = useState<string>();
  const [compareRunBId, setCompareRunBId] = useState<string>();
  const [playerComparePrefs, setPlayerComparePrefs] = useState<PlayerComparePreferences>(() => loadPlayerComparePreferences());
  const [layoutEditorState, setLayoutEditorState] = useState<{ isDirty: boolean; save: () => boolean; discard: () => void }>({ isDirty: false, save: () => true, discard: () => {} });
  const [storageNotice, setStorageNotice] = useState<string | undefined>(() => loadStorageNotice());

  useEffect(() => {
    saveState(state);
    setStorageNotice(loadStorageNotice());
  }, [state]);

  useEffect(() => savePlayerComparePreferences(playerComparePrefs), [playerComparePrefs]);
  useEffect(() => {
    const syncTabWithLocation = () => setTab(pathToTab(window.location.pathname, window.location.hash));
    window.addEventListener('popstate', syncTabWithLocation);
    window.addEventListener('hashchange', syncTabWithLocation);
    return () => {
      window.removeEventListener('popstate', syncTabWithLocation);
      window.removeEventListener('hashchange', syncTabWithLocation);
    };
  }, []);

  useEffect(() => {
    const next = parsePlayerCompareQuery(state.runs);
    if (!next) return;
    setPlayerComparePrefs((prev) => ({
      ...prev,
      ...(next.runAId !== undefined ? { runAId: next.runAId } : {}),
      ...(next.runBId !== undefined ? { runBId: next.runBId } : {}),
      ...(next.palletIndex !== undefined ? { palletIndex: next.palletIndex } : {}),
      ...(next.autoContinue !== undefined ? { autoContinue: next.autoContinue } : {}),
    }));
  }, [state.runs]);

  const activeLayout = useMemo(() => state.layouts.find((layout) => layout.layoutId === state.activeLayoutId) ?? state.layouts[0], [state.activeLayoutId, state.layouts]);
  const setLayout = (layout: Layout) => setState((s) => ({ ...s, layouts: updateLayout(s.layouts, layout) }));

  const exportLayout = (layoutId: string) => {
    const layout = state.layouts.find((item) => item.layoutId === layoutId);
    if (!layout) return;
    const safeName = sanitizeFileToken(layout.name || layout.layoutId);
    const filename = `flowpulse_layout_${safeName}_${compactTimestamp()}.json`;
    downloadFile(filename, JSON.stringify(layout, null, 2), 'application/json');
  };

  const exportLayoutsJson = () => {
    const filename = `flowpulse_layouts_${compactTimestamp()}.json`;
    downloadFile(filename, JSON.stringify(state.layouts, null, 2), 'application/json');
  };

  const importLayout = (jsonPayload: string): { ok: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonPayload);
      const source = Array.isArray(parsed) ? parsed : [parsed];
      if (!source.length) return { ok: false, message: 'JSON vacío.' };
      const validation = validateImportedLayout(source[0]);
      if (!validation.ok) return { ok: false, message: validation.error };

      let message = 'Layout importado correctamente.';
      setState((current) => {
        if (current.layouts.length >= getMaxLayouts()) {
          message = 'No hay espacio disponible para importar más layouts.';
          return current;
        }

        const uniqueName = ensureUniqueLayoutName(validation.layout.name, current.layouts);
        const nextLayout: Layout = {
          ...validation.layout,
          layoutId: current.layouts.some((layout) => layout.layoutId === validation.layout.layoutId) ? crypto.randomUUID() : validation.layout.layoutId,
          name: uniqueName,
          createdAt: validation.layout.createdAt || new Date().toISOString(),
        };

        message = `Layout "${nextLayout.name}" importado.`;
        return { ...current, layouts: [nextLayout, ...current.layouts], activeLayoutId: nextLayout.layoutId };
      });
      return { ok: true, message };
    } catch {
      return { ok: false, message: 'JSON inválido.' };
    }
  };

  const exportSkuMasterCsv = (skuMasterId: string) => {
    const master = state.skuMasters.find((item) => item.skuMasterId === skuMasterId);
    if (!master) return;
    const safeName = sanitizeFileToken(master.name || master.skuMasterId);
    const filename = `flowpulse_skumaster_${safeName}_${compactTimestamp()}.csv`;
    downloadFile(filename, toSkuMasterCsv(master.rows), 'text/csv;charset=utf-8');
  };

  const importSkuMasterCsv = (csvPayload: string, layoutId?: string): { ok: boolean; message: string } => {
    try {
      const parsed = parseSkuMasterCsv(csvPayload);
      if (!parsed.rows.length) return { ok: false, message: 'CSV vacío o sin filas válidas.' };
      if (parsed.rows.some((row) => !row.locationId.trim())) return { ok: false, message: 'Formato inválido: ubicacion no puede ser vacía.' };

      const selectedLayout = layoutId ? state.layouts.find((layout) => layout.layoutId === layoutId) : undefined;
      if (selectedLayout) {
        const validIds = new Set<string>();
        selectedLayout.gridData.flat().forEach((cell) => {
          if (cell.type === 'PICK' && cell.pick?.locationId) validIds.add(cell.pick.locationId);
        });
        const invalid = parsed.rows.find((row) => !validIds.has(row.locationId));
        if (invalid) return { ok: false, message: `Ubicación inválida para layout seleccionado: ${invalid.locationId}.` };
      }

      const importedName = `SKU Master importado ${new Date().toLocaleDateString()}`;
      const nextMaster = createSkuMaster(importedName, parsed.rows);
      setState((current) => ({ ...current, skuMasters: [nextMaster, ...current.skuMasters], activeSkuMasterId: nextMaster.skuMasterId }));

      const warningText = parsed.warnings.length ? ` (${parsed.warnings.length} duplicados omitidos)` : '';
      return { ok: true, message: `SKU master importado con ${parsed.rows.length} filas${warningText}.` };
    } catch (error) {
      return { ok: false, message: (error as Error).message };
    }
  };

  const navigateToPlayerFromCompare = (runAId: string, runBId: string, palletId: string) => {
    const runA = state.runs.find((run) => run.runId === runAId);
    const runB = state.runs.find((run) => run.runId === runBId);
    const palletOrder = runA?.palletOrder ?? runB?.palletOrder ?? [];
    const resolvedIndex = Math.max(0, palletOrder.indexOf(palletId));

    setPlayerComparePrefs((prev) => ({ ...prev, runAId, runBId, palletIndex: resolvedIndex, autoContinue: false }));
    navigateTab('player');
    const params = new URLSearchParams({ runA: runAId, runB: runBId, pallet: palletId, auto: '0' });
    window.history.pushState({}, '', `/#/player?${params.toString()}`);
  };

  const navigateTab = (next: Tab) => {
    if (tab === 'layout-editor' && next !== 'layout-editor' && layoutEditorState.isDirty) layoutEditorState.discard();
    setTab(next);
    const path = next === 'dashboard' ? '/#/' : `/#/${next}`;
    window.history.pushState({}, '', path);
  };

  const topbarActions = tab === 'settings'
    ? [{ id: 'clear-runs', label: 'Clean old runs', onClick: () => setState((s) => ({ ...s, runs: clearOldRuns(s.runs) })) }]
    : undefined;

  return (
    <div className="app-shell">
      <Sidebar items={sidebarItems} activeItem={tab === 'layout-editor' ? 'assets' : tab} onNavigate={(item) => navigateTab(item as Tab)} />
      <main className="main-area">
        <AppTopbar title={topbarMeta[tab].title} subtitle={topbarMeta[tab].subtitle} breadcrumb={`FlowPulse / ${topbarMeta[tab].title}`} actions={topbarActions} />
        {storageNotice && <p className="toast-success">{storageNotice}</p>}
        <div className="content-area">
          {tab === 'dashboard' && (
            <HomePage
              layouts={state.layouts}
              activeLayoutId={activeLayout?.layoutId}
              skuMasters={state.skuMasters}
              activeSkuMasterId={state.activeSkuMasterId}
              runs={state.runs}
              onCreateRun={(run) => setState((s) => ({ ...s, runs: insertRun(s.runs, run) }))}
              onSelectLayout={(layoutId) => setState((s) => ({ ...s, activeLayoutId: layoutId }))}
              onOpenRun={(runId) => { setCompareRunAId(runId); navigateTab('runs'); }}
              onOpenRunInCompare={(runId) => { setCompareRunAId(runId); if (compareRunBId === runId) setCompareRunBId(undefined); navigateTab('compare'); }}
              onOpenRunInPlayer={(runId) => { setPlayerComparePrefs((prev) => ({ ...prev, runAId: runId })); navigateTab('player'); }}
              onDeleteRun={(runId) => setState((s) => ({ ...s, runs: removeRun(s.runs, runId) }))}
              onGoToResults={() => navigateTab('runs')}
            />
          )}

          {tab === 'assets' && (
            <AssetsPage
              layouts={state.layouts}
              activeLayoutId={activeLayout?.layoutId}
              onCreateLayout={() => {
                const next = createNewLayout(state.layouts);
                setState((s) => ({ ...s, layouts: insertLayout(s.layouts, next), activeLayoutId: next.layoutId }));
              }}
              onSelectLayout={(layoutId) => setState((s) => ({ ...s, activeLayoutId: layoutId }))}
              onEditLayout={(layoutId) => { setState((s) => ({ ...s, activeLayoutId: layoutId })); navigateTab('layout-editor'); }}
              onDuplicateLayout={(layoutId) => setState((s) => ({ ...s, layouts: duplicateLayout(s.layouts, layoutId) }))}
              onRenameLayout={(layoutId, name) => setState((s) => ({ ...s, layouts: renameLayout(s.layouts, layoutId, name) }))}
              onDeleteLayout={(layoutId) => setState((s) => {
                const nextLayouts = removeLayout(s.layouts, layoutId);
                return { ...s, layouts: nextLayouts, activeLayoutId: nextLayouts.some((l) => l.layoutId === s.activeLayoutId) ? s.activeLayoutId : nextLayouts[0]?.layoutId };
              })}
              onExportLayouts={exportLayoutsJson}
              onExportLayout={exportLayout}
              onImportLayout={importLayout}
              masters={state.skuMasters}
              activeSkuMasterId={state.activeSkuMasterId}
              onChangeMasters={(skuMasters, activeSkuMasterId) => setState((s) => ({ ...s, skuMasters, activeSkuMasterId }))}
              onImportSkuMaster={importSkuMasterCsv}
              onExportSkuMaster={exportSkuMasterCsv}
            />
          )}

          {tab === 'layout-editor' && (
            <LayoutEditorPage
              layout={activeLayout}
              layouts={state.layouts}
              activeLayoutId={activeLayout?.layoutId}
              setLayout={setLayout}
              onEditorStateChange={setLayoutEditorState}
              onSelectLayout={(layoutId) => setState((current) => ({ ...current, activeLayoutId: layoutId }))}
              onEditLayout={(layoutId) => setState((current) => ({ ...current, activeLayoutId: layoutId }))}
              onDuplicateLayout={(layoutId) => setState((current) => ({ ...current, layouts: duplicateLayout(current.layouts, layoutId) }))}
              onRenameLayout={(layoutId, name) => setState((current) => ({ ...current, layouts: renameLayout(current.layouts, layoutId, name) }))}
              onExportLayout={exportLayout}
              onDeleteLayout={(layoutId) => setState((current) => {
                const nextLayouts = removeLayout(current.layouts, layoutId);
                return { ...current, layouts: nextLayouts, activeLayoutId: nextLayouts.some((item) => item.layoutId === current.activeLayoutId) ? current.activeLayoutId : nextLayouts[0]?.layoutId };
              })}
            />
          )}

          {tab === 'runs' && (
            <ResultsPage
              layouts={state.layouts}
              runs={state.runs}
              masters={state.skuMasters}
              selectedRunId={compareRunAId}
              onSelectRun={setCompareRunAId}
              onDeleteRun={(runId) => setState((s) => ({ ...s, runs: removeRun(s.runs, runId) }))}
              onOpenCompare={(runId) => { setCompareRunAId(runId); navigateTab('compare'); }}
              onOpenPlayer={(runId) => { setPlayerComparePrefs((prev) => ({ ...prev, runAId: runId })); navigateTab('player'); }}
            />
          )}

          {tab === 'compare' && activeLayout && (
            <ComparePage
              layout={activeLayout}
              runs={state.runs}
              runAId={compareRunAId}
              runBId={compareRunBId}
              onSelect={(a, b) => { setCompareRunAId(a); setCompareRunBId(b); setPlayerComparePrefs((prev) => ({ ...prev, runAId: a, runBId: b })); }}
              onOpenPalletInPlayer={(palletId) => {
                if (!compareRunAId || !compareRunBId) return;
                navigateToPlayerFromCompare(compareRunAId, compareRunBId, palletId);
              }}
            />
          )}

          {tab === 'player' && <PlayerComparePage layouts={state.layouts} runs={state.runs} prefs={playerComparePrefs} onChangePrefs={setPlayerComparePrefs} />}

          {tab === 'settings' && (
            <AdvancedPage
              layouts={state.layouts}
              onResetStorage={() => {
                clearState();
                setState(loadState());
                setPlayerComparePrefs(defaultPlayerComparePreferences());
              }}
              onClearOldRuns={() => setState((s) => ({ ...s, runs: clearOldRuns(s.runs) }))}
              onImportLayout={importLayout}
              onImportSkuMasterCsv={importSkuMasterCsv}
            />
          )}
        </div>
      </main>
    </div>
  );
}
