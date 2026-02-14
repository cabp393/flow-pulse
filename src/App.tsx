import { useEffect, useMemo, useState } from 'react';
import type { AppState, Layout, PlayerComparePreferences, RunResult } from './models/domain';
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
import { createSkuMaster, duplicateSkuMaster, removeSkuMaster, renameSkuMaster } from './storage/skuMasterRepo';
import { TopBar } from './components/TopBar';
import { AdvancedPage } from './pages/AdvancedPage';
import { compactTimestamp, downloadFile, sanitizeFileToken, toSkuMasterCsv, validateImportedLayout } from './utils/transfer';
import { parseSkuMasterCsv } from './utils/parsers';

const tabs = ['home', 'layouts', 'layout-editor', 'sku', 'pallets', 'results', 'compare', 'player-compare', 'advanced'] as const;
type Tab = (typeof tabs)[number];

const topNavTabs: Array<{ id: Tab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'layout-editor', label: 'Layout' },
  { id: 'sku', label: 'SKU' },
  { id: 'results', label: 'Heatmap' },
  { id: 'compare', label: 'Comparar' },
  { id: 'player-compare', label: 'Player' },
  { id: 'advanced', label: 'Avanzado' },
];

const pathToTab = (pathname: string): Tab => {
  const clean = pathname.replace(/^\//, '');
  if (!clean || clean === 'home') return 'home';
  if (tabs.includes(clean as Tab)) return clean as Tab;
  return 'home';
};


const parsePlayerCompareQuery = (runs: RunResult[]): Partial<PlayerComparePreferences> | undefined => {
  const params = new URLSearchParams(window.location.search);
  const runAId = params.get('runA') || undefined;
  const runBId = params.get('runB') || undefined;
  const palletId = params.get('pallet') || undefined;
  const palletIndexRaw = params.get('palletIndex');
  const autoRaw = params.get('auto');
  if (!runAId && !runBId && !palletId && !palletIndexRaw && !autoRaw) return undefined;

  const runA = runs.find((run) => run.runId === runAId);
  const runB = runs.find((run) => run.runId === runBId);
  const palletOrder = runA?.palletOrder ?? runB?.palletOrder ?? [];

  let palletIndex: number | undefined;
  if (palletId) {
    const found = palletOrder.indexOf(palletId);
    if (found >= 0) palletIndex = found;
  }

  if (palletIndex === undefined && palletIndexRaw) {
    const parsed = Number(palletIndexRaw);
    if (!Number.isNaN(parsed)) palletIndex = Math.max(0, Math.floor(parsed));
  }

  return {
    runAId,
    runBId,
    palletIndex,
    autoContinue: autoRaw === '0' ? false : undefined,
  };
};

const ensureUniqueLayoutName = (name: string, existing: Layout[]): string => {
  if (!existing.some((layout) => layout.name === name)) return name;
  const importedBase = `${name} (importado)`;
  if (!existing.some((layout) => layout.name === importedBase)) return importedBase;
  let suffix = 2;
  while (existing.some((layout) => layout.name === `${importedBase} ${suffix}`)) suffix += 1;
  return `${importedBase} ${suffix}`;
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
  const activeLayout = useMemo(
    () => state.layouts.find((layout) => layout.layoutId === state.activeLayoutId) ?? state.layouts[0],
    [state.activeLayoutId, state.layouts],
  );

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
        return {
          ...current,
          layouts: [nextLayout, ...current.layouts],
          activeLayoutId: nextLayout.layoutId,
        };
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
      if (parsed.rows.some((row) => !row.locationId.trim())) {
        return { ok: false, message: 'Formato inválido: ubicacion no puede ser vacía.' };
      }

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
      setState((current) => ({
        ...current,
        skuMasters: [nextMaster, ...current.skuMasters],
        activeSkuMasterId: nextMaster.skuMasterId,
      }));

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

    setPlayerComparePrefs((prev) => ({
      ...prev,
      runAId,
      runBId,
      palletIndex: resolvedIndex,
      autoContinue: false,
    }));

    setTab('player-compare');
    const params = new URLSearchParams({ runA: runAId, runB: runBId, pallet: palletId, auto: '0' });
    window.history.pushState({}, '', `/player-compare?${params.toString()}`);
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
      <TopBar tab={tab} tabs={topNavTabs} onNavigate={(item) => navigateTab(item as Tab)} />

      {tab === 'home' && (
        <HomePage
          layouts={state.layouts}
          activeLayoutId={activeLayout?.layoutId}
          skuMasters={state.skuMasters}
          activeSkuMasterId={state.activeSkuMasterId}
          runs={state.runs}
          onCreateRun={(run) => setState((s) => ({ ...s, runs: insertRun(s.runs, run) }))}
          onSelectLayout={(layoutId) => setState((s) => ({ ...s, activeLayoutId: layoutId }))}
          onEditLayout={(layoutId) => {
            setState((s) => ({ ...s, activeLayoutId: layoutId }));
            navigateTab('layout-editor');
          }}
          onDuplicateLayout={(layoutId) => setState((s) => ({ ...s, layouts: duplicateLayout(s.layouts, layoutId) }))}
          onRenameLayout={(layoutId, name) => setState((s) => ({ ...s, layouts: renameLayout(s.layouts, layoutId, name) }))}
          onDeleteLayout={(layoutId) => setState((s) => {
            const nextLayouts = removeLayout(s.layouts, layoutId);
            return { ...s, layouts: nextLayouts, activeLayoutId: nextLayouts.some((l) => l.layoutId === s.activeLayoutId) ? s.activeLayoutId : nextLayouts[0]?.layoutId };
          })}
          onExportLayout={exportLayout}
          onOpenSkuMaster={(skuMasterId) => {
            setState((s) => ({ ...s, activeSkuMasterId: skuMasterId }));
            navigateTab('sku');
          }}
          onDuplicateSkuMaster={(skuMasterId) => setState((s) => ({ ...s, skuMasters: duplicateSkuMaster(s.skuMasters, skuMasterId) }))}
          onRenameSkuMaster={(skuMasterId, name) => setState((s) => ({ ...s, skuMasters: renameSkuMaster(s.skuMasters, skuMasterId, name) }))}
          onDeleteSkuMaster={(skuMasterId) => setState((s) => ({
            ...s,
            skuMasters: removeSkuMaster(s.skuMasters, skuMasterId),
            activeSkuMasterId: s.activeSkuMasterId === skuMasterId ? undefined : s.activeSkuMasterId,
          }))}
          onExportSkuMaster={exportSkuMasterCsv}
          onOpenRun={(runId) => {
            setCompareRunAId(runId);
            navigateTab('results');
          }}
          onOpenRunInCompare={(runId) => {
            setCompareRunAId(runId);
            if (compareRunBId === runId) setCompareRunBId(undefined);
            navigateTab('compare');
          }}
          onOpenRunInPlayer={(runId) => {
            setPlayerComparePrefs((prev) => ({ ...prev, runAId: runId }));
            navigateTab('player-compare');
          }}
          onRenameRun={(runId, name) => setState((s) => ({
            ...s,
            runs: s.runs.map((run) => (run.runId === runId ? { ...run, name } : run)),
          }))}
          onDeleteRun={(runId) => setState((s) => ({ ...s, runs: removeRun(s.runs, runId) }))}
          onGoToResults={() => navigateTab('results')}
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
      })} onExport={exportLayoutsJson} onExportOne={exportLayout} onImport={(payload) => {
        const result = importLayout(payload);
        if (!result.ok) window.alert(result.message);
      }} />}
      {tab === 'layout-editor' && <LayoutEditorPage layout={activeLayout} setLayout={setLayout} onEditorStateChange={setLayoutEditorState} />}
      {tab === 'sku' && activeLayout && <SkuMasterPage layout={activeLayout} masters={state.skuMasters} activeSkuMasterId={state.activeSkuMasterId} onChange={(skuMasters, activeSkuMasterId) => setState((s) => ({ ...s, skuMasters, activeSkuMasterId }))} onImport={importSkuMasterCsv} onExportOne={exportSkuMasterCsv} />}
      {tab === 'pallets' && <PalletImportPage layouts={state.layouts} activeLayoutId={activeLayout?.layoutId} masters={state.skuMasters} activeSkuMasterId={state.activeSkuMasterId} onGeneratedRun={(run) => setState((s) => ({ ...s, runs: insertRun(s.runs, run) }))} onSelectLayout={(layoutId) => setState((s) => ({ ...s, activeLayoutId: layoutId }))} />}
      {tab === 'results' && <ResultsPage layouts={state.layouts} runs={state.runs} masters={state.skuMasters} selectedRunId={compareRunAId} onSelectRun={setCompareRunAId} onDeleteRun={(runId) => setState((s) => ({ ...s, runs: removeRun(s.runs, runId) }))} />}
      {tab === 'compare' && activeLayout && <ComparePage layout={activeLayout} runs={state.runs} runAId={compareRunAId} runBId={compareRunBId} onSelect={(a, b) => { setCompareRunAId(a); setCompareRunBId(b); setPlayerComparePrefs((prev) => ({ ...prev, runAId: a, runBId: b })); }} onOpenPalletInPlayer={(palletId) => {
        if (!compareRunAId || !compareRunBId) return;
        navigateToPlayerFromCompare(compareRunAId, compareRunBId, palletId);
      }} />}
      {tab === 'player-compare' && <PlayerComparePage layouts={state.layouts} runs={state.runs} prefs={playerComparePrefs} onChangePrefs={setPlayerComparePrefs} />}
      {tab === 'advanced' && (
        <AdvancedPage
          layouts={state.layouts}
          skuMasters={state.skuMasters}
          onResetStorage={() => {
            clearState();
            setState(loadState());
            setPlayerComparePrefs(defaultPlayerComparePreferences());
          }}
          onClearOldRuns={() => setState((s) => ({ ...s, runs: clearOldRuns(s.runs) }))}
          onExportLayout={exportLayout}
          onImportLayout={importLayout}
          onExportSkuMasterCsv={exportSkuMasterCsv}
          onImportSkuMasterCsv={importSkuMasterCsv}
        />
      )}
    </div>
  );
}
