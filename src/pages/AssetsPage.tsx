import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { Layout, SkuMaster } from '../models/domain';
import { getMaxLayouts } from '../storage/layoutRepo';
import { ConfirmModal } from '../components/ConfirmModal';
import { LayoutList, SkuMasterList } from '../components/SavedLists';
import { createSkuMaster, duplicateSkuMaster, removeSkuMaster, updateSkuMaster } from '../storage/skuMasterRepo';
import { parseSkuMasterCsv } from '../utils/parsers';

interface Props {
  layouts: Layout[];
  activeLayoutId?: string;
  onCreateLayout: () => void;
  onSelectLayout: (layoutId: string) => void;
  onEditLayout: (layoutId: string) => void;
  onDuplicateLayout: (layoutId: string) => void;
  onRenameLayout: (layoutId: string, name: string) => void;
  onDeleteLayout: (layoutId: string) => void;
  onExportLayouts: () => void;
  onExportLayout: (layoutId: string) => void;
  onImportLayout: (payload: string) => { ok: boolean; message: string };
  masters: SkuMaster[];
  activeSkuMasterId?: string;
  onChangeMasters: (next: SkuMaster[], activeSkuMasterId?: string) => void;
  onImportSkuMaster: (payload: string, layoutId?: string) => { ok: boolean; message: string };
  onExportSkuMaster: (skuMasterId: string) => void;
}

type AssetTab = 'layouts' | 'sku';

export function AssetsPage({
  layouts,
  activeLayoutId,
  onCreateLayout,
  onSelectLayout,
  onEditLayout,
  onDuplicateLayout,
  onRenameLayout,
  onDeleteLayout,
  onExportLayouts,
  onExportLayout,
  onImportLayout,
  masters,
  activeSkuMasterId,
  onChangeMasters,
  onImportSkuMaster,
  onExportSkuMaster,
}: Props) {
  const [tab, setTab] = useState<AssetTab>('layouts');
  const [pendingDelete, setPendingDelete] = useState<{ type: 'layout' | 'sku'; id: string; name: string }>();
  const [status, setStatus] = useState('');

  const maxLayouts = getMaxLayouts();
  const layoutInputRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState('ubicacion,secuencia,sku');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [editorError, setEditorError] = useState('');

  const activeLayout = useMemo(
    () => layouts.find((layout) => layout.layoutId === activeLayoutId) ?? layouts[0],
    [activeLayoutId, layouts],
  );

  const validLocationIds = useMemo(() => {
    const ids = new Set<string>();
    activeLayout?.gridData.flat().forEach((cell) => {
      if (cell.type === 'PICK' && cell.pick?.locationId) ids.add(cell.pick.locationId);
    });
    return ids;
  }, [activeLayout]);

  const onImportFile = (event: ChangeEvent<HTMLInputElement>, handler: (payload: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const payload = typeof reader.result === 'string' ? reader.result : '';
      handler(payload);
      event.target.value = '';
    };
    reader.onerror = () => {
      setStatus('No se pudo leer el archivo seleccionado.');
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const editMaster = (skuMasterId: string) => {
    const target = masters.find((item) => item.skuMasterId === skuMasterId);
    if (!target) return;
    setEditingId(target.skuMasterId);
    setName(target.name);
    setText(['ubicacion,secuencia,sku', ...target.rows.map((row) => `${row.locationId},${row.sequence},${row.sku}`)].join('\n'));
    setEditorError('');
  };

  const saveSkuMaster = () => {
    if (!activeLayout) {
      setEditorError('Necesita un layout activo para validar ubicaciones.');
      return;
    }
    try {
      const parsed = parseSkuMasterCsv(text);
      const invalidRows = parsed.rows.filter((row) => !validLocationIds.has(row.locationId));
      if (invalidRows.length > 0) {
        throw new Error(`Se encontraron ${invalidRows.length} locationIds inválidos para el layout activo.`);
      }

      if (editingId) {
        const target = masters.find((item) => item.skuMasterId === editingId);
        if (!target) return;
        onChangeMasters(updateSkuMaster(masters, { ...target, name: name || target.name, rows: parsed.rows, index: target.index }), activeSkuMasterId);
      } else {
        const next = createSkuMaster(name || `SKU Master ${masters.length + 1}`, parsed.rows);
        onChangeMasters([next, ...masters], next.skuMasterId);
      }

      setStatus(editingId ? 'SKU master actualizado.' : 'SKU master creado.');
      setEditingId(undefined);
      setName('');
      setEditorError('');
    } catch (error) {
      setEditorError((error as Error).message);
    }
  };

  return (
    <div className="assets-page">
      <div className="segmented-control">
        <button className={tab === 'layouts' ? 'active' : ''} onClick={() => setTab('layouts')}>Layouts</button>
        <button className={tab === 'sku' ? 'active' : ''} onClick={() => setTab('sku')}>SKU Masters</button>
      </div>

      {tab === 'layouts' && (
        <section className="card">
          <div className="toolbar">
            <button className="primary" disabled={layouts.length >= maxLayouts} onClick={onCreateLayout}>New layout</button>
            <button onClick={onExportLayouts} disabled={layouts.length === 0}>Export all JSON</button>
            <button onClick={() => layoutInputRef.current?.click()}>Import JSON</button>
            <input
              ref={layoutInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(event) => onImportFile(event, (payload) => {
                const result = onImportLayout(payload);
                setStatus(result.message);
              })}
            />
          </div>
          <LayoutList
            items={layouts}
            activeLayoutId={activeLayout?.layoutId}
            disableDelete={layouts.length <= 1}
            onOpen={onSelectLayout}
            onEdit={onEditLayout}
            onDuplicate={onDuplicateLayout}
            onRename={onRenameLayout}
            onExport={onExportLayout}
            onDelete={(id, deleteName) => setPendingDelete({ type: 'layout', id, name: deleteName })}
          />
        </section>
      )}

      {tab === 'sku' && (
        <section className="card">
          <div className="toolbar">
            <button className="primary" onClick={saveSkuMaster}>{editingId ? 'Save SKU Master' : 'Create SKU Master'}</button>
            <button onClick={() => skuInputRef.current?.click()}>Import CSV</button>
            <input
              ref={skuInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(event) => onImportFile(event, (payload) => {
                const result = onImportSkuMaster(payload, activeLayout?.layoutId);
                setStatus(result.message);
              })}
            />
          </div>
          <div className="form-grid">
            <input placeholder="SKU Master name" value={name} onChange={(event) => setName(event.target.value)} />
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={8} />
            {editorError && <p className="error">{editorError}</p>}
          </div>

          <SkuMasterList
            items={masters}
            activeSkuMasterId={activeSkuMasterId}
            onOpen={(skuMasterId) => onChangeMasters(masters, skuMasterId)}
            onEdit={editMaster}
            onDuplicate={(skuMasterId) => {
              const duplicated = duplicateSkuMaster(masters, skuMasterId);
              onChangeMasters(duplicated, duplicated[0]?.skuMasterId ?? activeSkuMasterId);
            }}
            onRename={(skuMasterId, nextName) => {
              const target = masters.find((item) => item.skuMasterId === skuMasterId);
              if (!target) return;
              onChangeMasters(updateSkuMaster(masters, { ...target, name: nextName, index: target.index }), activeSkuMasterId);
            }}
            onExport={onExportSkuMaster}
            onDelete={(id, deleteName) => setPendingDelete({ type: 'sku', id, name: deleteName })}
          />
        </section>
      )}

      {status && <p className="toast-success">{status}</p>}

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Confirmar eliminación"
        description={`Esta acción eliminará "${pendingDelete?.name}".`}
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.type === 'layout') onDeleteLayout(pendingDelete.id);
          if (pendingDelete.type === 'sku') onChangeMasters(removeSkuMaster(masters, pendingDelete.id), activeSkuMasterId === pendingDelete.id ? undefined : activeSkuMasterId);
          setPendingDelete(undefined);
        }}
        danger
      />
    </div>
  );
}
