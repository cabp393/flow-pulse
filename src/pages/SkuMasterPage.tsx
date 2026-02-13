import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { Layout, SkuMaster } from '../models/domain';
import { parseSkuMasterCsv } from '../utils/parsers';
import { createSkuMaster, duplicateSkuMaster, removeSkuMaster, updateSkuMaster } from '../storage/skuMasterRepo';
import { ConfirmModal } from '../components/ConfirmModal';

interface Props {
  layout: Layout;
  masters: SkuMaster[];
  activeSkuMasterId?: string;
  onChange: (next: SkuMaster[], activeSkuMasterId?: string) => void;
  onImport: (jsonPayload: string) => void;
  onExport: () => void;
  onExportOne: (skuMasterId: string) => void;
}

export function SkuMasterPage({
  layout,
  masters,
  activeSkuMasterId,
  onChange,
  onImport,
  onExport,
  onExportOne,
}: Props) {
  const [text, setText] = useState('ubicacion,secuencia,sku');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string }>();
  const importInputRef = useRef<HTMLInputElement>(null);

  const validLocationIds = useMemo(() => {
    const ids = new Set<string>();
    layout.gridData.flat().forEach((c) => {
      if (c.type === 'PICK' && c.pick?.locationId) ids.add(c.pick.locationId);
    });
    return ids;
  }, [layout]);

  const current = masters.find((item) => item.skuMasterId === editingId) ?? masters.find((item) => item.skuMasterId === activeSkuMasterId);

  const inconsistent = current ? current.rows.filter((row) => !validLocationIds.has(row.locationId)) : [];

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const payload = typeof reader.result === 'string' ? reader.result : '';
      if (!payload.trim()) {
        window.alert('El archivo está vacío.');
      } else {
        onImport(payload);
      }
      event.target.value = '';
    };
    reader.onerror = () => {
      window.alert('No se pudo leer el archivo JSON.');
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const editMaster = (master: SkuMaster) => {
    setEditingId(master.skuMasterId);
    setName(master.name);
    setText(['ubicacion,secuencia,sku', ...master.rows.map((row) => `${row.locationId},${row.sequence},${row.sku}`)].join('\n'));
  };

  const upsertFromText = () => {
    try {
      const parsed = parseSkuMasterCsv(text);
      const invalidRows = parsed.rows.filter((row) => !validLocationIds.has(row.locationId));
      if (invalidRows.length > 0) {
        throw new Error(`SKU Master inválido: ${invalidRows.length} ubicaciones no existen en layout.`);
      }

      if (editingId) {
        const target = masters.find((item) => item.skuMasterId === editingId);
        if (!target) return;
        onChange(updateSkuMaster(masters, { ...target, name: name || target.name, rows: parsed.rows, index: target.index }), activeSkuMasterId);
      } else {
        const next = createSkuMaster(name || `SKU Master ${masters.length + 1}`, parsed.rows);
        onChange([next, ...masters], next.skuMasterId);
      }
      setWarnings(parsed.warnings);
      setError('');
      setName('');
      setEditingId(undefined);
    } catch (err) {
      setError((err as Error).message);
      setWarnings([]);
    }
  };

  return (
    <div className="page">
      <h2>SKU Masters</h2>
      <input placeholder="Nombre SKU master" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} />
      <div className="toolbar">
        <button onClick={upsertFromText}>{editingId ? 'Guardar cambios' : 'Crear SKU Master'}</button>
        <button onClick={onExport} disabled={masters.length === 0}>Exportar JSON</button>
        <button type="button" onClick={() => importInputRef.current?.click()}>Importar JSON</button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      </div>
      {error && <p className="error">{error}</p>}
      {warnings.length > 0 && <ul>{warnings.map((item) => <li key={item}>{item}</li>)}</ul>}
      <ul className="sku-list">
        {masters.map((master) => (
          <li key={master.skuMasterId}>
            <span><strong>{master.name}</strong> ({master.rows.length} filas)</span>
            <button onClick={() => onChange(masters, master.skuMasterId)}>{activeSkuMasterId === master.skuMasterId ? 'Viendo' : 'Visualizar'}</button>
            <button onClick={() => editMaster(master)}>Editar</button>
            <button onClick={() => {
              const duplicated = duplicateSkuMaster(masters, master.skuMasterId);
              onChange(duplicated, duplicated[0]?.skuMasterId ?? activeSkuMasterId);
            }}>
              Duplicar
            </button>
            <button onClick={() => onExportOne(master.skuMasterId)}>Exportar</button>
            <button onClick={() => setPendingDelete({ id: master.skuMasterId, name: master.name })}>Eliminar</button>
          </li>
        ))}
      </ul>
      {inconsistent.length > 0 && <p className="error">SKU master activo tiene {inconsistent.length} filas con locationIds no válidos.</p>}
      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Confirmar eliminación"
        description={`Esta acción eliminará "${pendingDelete?.name}".`}
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={() => {
          if (!pendingDelete) return;
          onChange(removeSkuMaster(masters, pendingDelete.id), activeSkuMasterId === pendingDelete.id ? undefined : activeSkuMasterId);
          setPendingDelete(undefined);
        }}
        danger
      />
    </div>
  );
}
