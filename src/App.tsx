import { useEffect, useMemo, useState } from 'react';
import type { AppState, Batch, Layout, PlayerComparePreferences } from './models/domain';
import { LayoutEditorPage } from './pages/LayoutEditorPage';
import { LayoutsPage } from './pages/LayoutsPage';
import { ResultsPage } from './pages/ResultsPage';
import { SkuMasterPage } from './pages/SkuMasterPage';
import { clearState, defaultPlayerComparePreferences, loadPlayerComparePreferences, loadState, savePlayerComparePreferences, saveState, loadStorageNotice } from './storage/localRepo';
import { ComparePage } from './compare/ComparePage';
import { PlayerComparePage } from './player/PlayerComparePage';
import { createNewLayout, duplicateLayout, getMaxLayouts, insertLayout, removeLayout, renameLayout, updateLayout } from './storage/layoutRepo';
import { HomePage } from './pages/HomePage';
import { createSkuMaster, duplicateSkuMaster, removeSkuMaster, renameSkuMaster } from './storage/skuMasterRepo';
import { TopBar } from './components/TopBar';
import { AdvancedPage } from './pages/AdvancedPage';
import { compactTimestamp, downloadFile, sanitizeFileToken, toSkuMasterCsv, validateImportedLayout } from './utils/transfer';
import { parseSkuMasterCsv } from './utils/parsers';
import { createRunConfig, insertRunConfig, removeRunConfig } from './storage/configRepo';
import { insertBatch, removeBatch } from './storage/batchRepo';

const tabs = ['home', 'layouts', 'layout-editor', 'sku', 'results', 'compare', 'player-compare', 'advanced'] as const;
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

const pathToTab = (pathname: string, hash: string): Tab => {
  const hashRoute = hash.replace(/^#\/?/, '').split('?')[0];
  const clean = (hashRoute || pathname.replace(/^\//, '')).trim();
  if (!clean || clean === 'home') return 'home';
  if (tabs.includes(clean as Tab)) return clean as Tab;
  return 'home';
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
  const [tab, setTab] = useState<Tab>(() => pathToTab(window.location.pathname, window.location.hash));
  const [compareRunAId, setCompareRunAId] = useState<string>();
  const [compareRunBId, setCompareRunBId] = useState<string>();
  const [playerComparePrefs, setPlayerComparePrefs] = useState<PlayerComparePreferences>(() => loadPlayerComparePreferences());
  const [layoutEditorState, setLayoutEditorState] = useState<{ isDirty: boolean; save: () => boolean; discard: () => void }>({ isDirty: false, save: () => true, discard: () => {} });
  const [storageNotice] = useState<string | undefined>(() => loadStorageNotice());

  useEffect(() => { saveState(state); }, [state]);
  useEffect(() => savePlayerComparePreferences(playerComparePrefs), [playerComparePrefs]);

  const activeLayout = useMemo(() => state.layouts.find((layout) => layout.layoutId === state.activeLayoutId) ?? state.layouts[0], [state.activeLayoutId, state.layouts]);
  const setLayout = (layout: Layout) => setState((s) => ({ ...s, layouts: updateLayout(s.layouts, layout) }));

  const exportLayout = (layoutId: string) => {
    const layout = state.layouts.find((item) => item.layoutId === layoutId);
    if (!layout) return;
    const safeName = sanitizeFileToken(layout.name || layout.layoutId);
    const filename = `flowpulse_layout_${safeName}_${compactTimestamp()}.json`;
    downloadFile(filename, JSON.stringify(layout, null, 2), 'application/json');
  };

  const exportSkuMasterCsv = (skuMasterId: string) => {
    const master = state.skuMasters.find((item) => item.skuMasterId === skuMasterId);
    if (!master) return;
    const safeName = sanitizeFileToken(master.name || master.skuMasterId);
    const filename = `flowpulse_skumaster_${safeName}_${compactTimestamp()}.csv`;
    downloadFile(filename, toSkuMasterCsv(master.rows), 'text/csv;charset=utf-8');
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
        const nextLayout: Layout = { ...validation.layout, layoutId: current.layouts.some((layout) => layout.layoutId === validation.layout.layoutId) ? crypto.randomUUID() : validation.layout.layoutId, name: uniqueName, createdAt: validation.layout.createdAt || new Date().toISOString() };
        message = `Layout "${nextLayout.name}" importado.`;
        return { ...current, layouts: [nextLayout, ...current.layouts], activeLayoutId: nextLayout.layoutId };
      });
      return { ok: true, message };
    } catch { return { ok: false, message: 'JSON inválido.' }; }
  };

  const importSkuMasterCsv = (csvPayload: string, layoutId?: string): { ok: boolean; message: string } => {
    try {
      const parsed = parseSkuMasterCsv(csvPayload);
      if (!parsed.rows.length) return { ok: false, message: 'CSV vacío o sin filas válidas.' };
      const selectedLayout = layoutId ? state.layouts.find((layout) => layout.layoutId === layoutId) : undefined;
      if (selectedLayout) {
        const validIds = new Set<string>();
        selectedLayout.gridData.flat().forEach((cell) => { if (cell.type === 'PICK' && cell.pick?.locationId) validIds.add(cell.pick.locationId); });
        const invalid = parsed.rows.find((row) => !validIds.has(row.locationId));
        if (invalid) return { ok: false, message: `Ubicación inválida para layout seleccionado: ${invalid.locationId}.` };
      }
      const nextMaster = createSkuMaster(`SKU Master importado ${new Date().toLocaleDateString()}`, parsed.rows);
      setState((current) => ({ ...current, skuMasters: [nextMaster, ...current.skuMasters], activeSkuMasterId: nextMaster.skuMasterId }));
      return { ok: true, message: `SKU master importado con ${parsed.rows.length} filas.` };
    } catch (error) { return { ok: false, message: (error as Error).message }; }
  };



  const exportBatchJson = (batchId: string) => {
    const batch = state.batches.find((item) => item.batchId === batchId);
    if (!batch) return;
    const filename = `flowpulse_batch_${sanitizeFileToken(batch.name)}_${compactTimestamp()}.json`;
    downloadFile(filename, JSON.stringify(batch, null, 2), 'application/json');
  };

  const importBatchJson = (payload: string): { ok: boolean; message: string } => {
    try {
      const parsed = JSON.parse(payload) as Partial<Batch>;
      if (!parsed || !Array.isArray(parsed.palletOrder) || !Array.isArray(parsed.skuDict) || !Array.isArray(parsed.skuIdxFlat) || !Array.isArray(parsed.offsets)) {
        return { ok: false, message: 'Batch JSON inválido.' };
      }
      const batch: Batch = {
        batchId: parsed.batchId || crypto.randomUUID(),
        name: parsed.name || `batch-${new Date().toISOString()}`,
        createdAt: parsed.createdAt || new Date().toISOString(),
        palletOrder: parsed.palletOrder,
        skuDict: parsed.skuDict,
        skuIdxFlat: parsed.skuIdxFlat,
        offsets: parsed.offsets,
        stats: parsed.stats ?? { totalPallets: parsed.palletOrder.length, totalLines: parsed.skuIdxFlat.length, uniqueSkus: parsed.skuDict.length },
      };
      setState((current) => ({ ...current, batches: insertBatch(current.batches, { ...batch, batchId: crypto.randomUUID() }) }));
      return { ok: true, message: `Batch "${batch.name}" importado.` };
    } catch {
      return { ok: false, message: 'Batch JSON inválido.' };
    }
  };

  const navigateTab = (next: Tab) => {
    if (tab === 'layout-editor' && next !== 'layout-editor' && layoutEditorState.isDirty) layoutEditorState.discard();
    setTab(next);
    window.history.pushState({}, '', next === 'home' ? '/#/' : `/#/${next}`);
  };

  const saveBatchAndAnalyze = ({ batch, layoutId, skuMasterId }: { batch: Batch; layoutId: string; skuMasterId: string }) => {
    const layout = state.layouts.find((item) => item.layoutId === layoutId);
    const master = state.skuMasters.find((item) => item.skuMasterId === skuMasterId);
    if (!layout || !master) return;
    const config = createRunConfig(layout.name, master.name, batch.name, layoutId, skuMasterId, batch.batchId);
    setState((s) => ({ ...s, batches: insertBatch(s.batches, batch), runConfigs: insertRunConfig(s.runConfigs, config), activeLayoutId: layoutId, activeSkuMasterId: skuMasterId }));
    setCompareRunAId(config.runConfigId);
    navigateTab('results');
  };

  return <div className="app"><TopBar tab={tab} tabs={topNavTabs} onNavigate={(item) => navigateTab(item as Tab)} />
    {storageNotice && <p className="toast-success">{storageNotice}</p>}
    {tab === 'home' && <HomePage layouts={state.layouts} activeLayoutId={activeLayout?.layoutId} skuMasters={state.skuMasters} activeSkuMasterId={state.activeSkuMasterId} batches={state.batches} runConfigs={state.runConfigs} onSaveBatchAndAnalyze={saveBatchAndAnalyze} onSelectLayout={(layoutId) => setState((s) => ({ ...s, activeLayoutId: layoutId }))} onEditLayout={(layoutId) => { setState((s) => ({ ...s, activeLayoutId: layoutId })); navigateTab('layout-editor'); }} onDuplicateLayout={(layoutId) => setState((s) => ({ ...s, layouts: duplicateLayout(s.layouts, layoutId) }))} onRenameLayout={(layoutId, name) => setState((s) => ({ ...s, layouts: renameLayout(s.layouts, layoutId, name) }))} onDeleteLayout={(layoutId) => setState((s) => ({ ...s, layouts: removeLayout(s.layouts, layoutId) }))} onExportLayout={exportLayout} onOpenSkuMaster={(skuMasterId) => { setState((s) => ({ ...s, activeSkuMasterId: skuMasterId })); navigateTab('sku'); }} onDuplicateSkuMaster={(skuMasterId) => setState((s) => ({ ...s, skuMasters: duplicateSkuMaster(s.skuMasters, skuMasterId) }))} onRenameSkuMaster={(skuMasterId, name) => setState((s) => ({ ...s, skuMasters: renameSkuMaster(s.skuMasters, skuMasterId, name) }))} onDeleteSkuMaster={(skuMasterId) => setState((s) => ({ ...s, skuMasters: removeSkuMaster(s.skuMasters, skuMasterId) }))} onExportSkuMaster={exportSkuMasterCsv} onDeleteBatch={(batchId) => setState((s) => ({ ...s, batches: removeBatch(s.batches, batchId), runConfigs: s.runConfigs.filter((cfg) => cfg.batchId !== batchId) }))} onDeleteRunConfig={(runConfigId) => setState((s) => ({ ...s, runConfigs: removeRunConfig(s.runConfigs, runConfigId) }))} onOpenConfigInResults={(runConfigId) => { setCompareRunAId(runConfigId); navigateTab('results'); }} />}
    {tab === 'layouts' && <LayoutsPage layouts={state.layouts} activeLayoutId={activeLayout?.layoutId} onCreate={() => { const next = createNewLayout(state.layouts); setState((s) => ({ ...s, layouts: insertLayout(s.layouts, next), activeLayoutId: next.layoutId })); }} onSelect={(layoutId) => setState((s) => ({ ...s, activeLayoutId: layoutId }))} onEdit={() => undefined} onDuplicate={() => undefined} onRename={() => undefined} onDelete={() => undefined} onExport={() => undefined} onExportOne={exportLayout} onImport={(payload) => { const result = importLayout(payload); if (!result.ok) window.alert(result.message); }} />}
    {tab === 'layout-editor' && <LayoutEditorPage layout={activeLayout} layouts={state.layouts} activeLayoutId={activeLayout?.layoutId} setLayout={setLayout} onEditorStateChange={setLayoutEditorState} onSelectLayout={(layoutId) => setState((current) => ({ ...current, activeLayoutId: layoutId }))} onEditLayout={() => undefined} onDuplicateLayout={() => undefined} onRenameLayout={() => undefined} onExportLayout={exportLayout} onDeleteLayout={() => undefined} />}
    {tab === 'sku' && activeLayout && <SkuMasterPage layout={activeLayout} masters={state.skuMasters} activeSkuMasterId={state.activeSkuMasterId} onChange={(skuMasters, activeSkuMasterId) => setState((s) => ({ ...s, skuMasters, activeSkuMasterId }))} onImport={importSkuMasterCsv} onExportOne={exportSkuMasterCsv} />}
    {tab === 'results' && <ResultsPage layouts={state.layouts} batches={state.batches} runConfigs={state.runConfigs} masters={state.skuMasters} selectedRunId={compareRunAId} onSelectRun={setCompareRunAId} />}
    {tab === 'compare' && <ComparePage layouts={state.layouts} batches={state.batches} masters={state.skuMasters} runConfigs={state.runConfigs} runAId={compareRunAId} runBId={compareRunBId} onSelect={(a, b) => { setCompareRunAId(a); setCompareRunBId(b); setPlayerComparePrefs((prev) => ({ ...prev, runAId: a, runBId: b })); }} onOpenPalletInPlayer={() => navigateTab('player-compare')} />}
    {tab === 'player-compare' && <PlayerComparePage layouts={state.layouts} batches={state.batches} masters={state.skuMasters} runConfigs={state.runConfigs} prefs={playerComparePrefs} onChangePrefs={setPlayerComparePrefs} />}
    {tab === 'advanced' && <AdvancedPage layouts={state.layouts} batches={state.batches} onResetStorage={() => { clearState(); setState(loadState()); setPlayerComparePrefs(defaultPlayerComparePreferences()); }} onImportLayout={importLayout} onImportSkuMasterCsv={importSkuMasterCsv} onExportBatchJson={exportBatchJson} onImportBatchJson={importBatchJson} />}
  </div>;
}
