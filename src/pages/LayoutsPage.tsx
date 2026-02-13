import { useRef, type ChangeEvent } from 'react';
import type { Layout } from '../models/domain';
import { getMaxLayouts } from '../storage/layoutRepo';

interface Props {
  layouts: Layout[];
  activeLayoutId?: string;
  onCreate: () => void;
  onEdit: (layoutId: string) => void;
  onDuplicate: (layoutId: string) => void;
  onRename: (layoutId: string, name: string) => void;
  onDelete: (layoutId: string) => void;
  onSelect: (layoutId: string) => void;
  onExport: () => void;
  onExportOne: (layoutId: string) => void;
  onImport: (jsonPayload: string) => void;
}

export function LayoutsPage({
  layouts,
  activeLayoutId,
  onCreate,
  onEdit,
  onDuplicate,
  onRename,
  onDelete,
  onSelect,
  onExport,
  onExportOne,
  onImport,
}: Props) {
  const maxLayouts = getMaxLayouts();
  const importInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="page">
      <h2>Layouts</h2>
      <div className="toolbar">
        <button disabled={layouts.length >= maxLayouts} onClick={onCreate}>Crear layout</button>
        <button onClick={onExport} disabled={layouts.length === 0}>Exportar JSON</button>
        <button type="button" onClick={() => importInputRef.current?.click()}>Importar JSON</button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      </div>
      <p>{layouts.length}/{maxLayouts}</p>
      <ul className="sku-list">
        {layouts.map((layout) => (
          <li key={layout.layoutId}>
            <input value={layout.name} onChange={(e) => onRename(layout.layoutId, e.target.value)} />
            <button onClick={() => onSelect(layout.layoutId)}>{activeLayoutId === layout.layoutId ? 'Viendo' : 'Visualizar'}</button>
            <button onClick={() => onEdit(layout.layoutId)}>Editar</button>
            <button onClick={() => onDuplicate(layout.layoutId)} disabled={layouts.length >= maxLayouts}>Duplicar</button>
            <button onClick={() => onExportOne(layout.layoutId)}>Exportar</button>
            <button onClick={() => onDelete(layout.layoutId)} disabled={layouts.length <= 1}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
