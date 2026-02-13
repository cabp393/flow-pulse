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
}

export function LayoutsPage({ layouts, activeLayoutId, onCreate, onEdit, onDuplicate, onRename, onDelete, onSelect }: Props) {
  const maxLayouts = getMaxLayouts();
  return (
    <div className="page">
      <h2>Layouts</h2>
      <button disabled={layouts.length >= maxLayouts} onClick={onCreate}>Crear layout</button>
      <p>{layouts.length}/{maxLayouts}</p>
      <ul className="sku-list">
        {layouts.map((layout) => (
          <li key={layout.layoutId}>
            <input value={layout.name} onChange={(e) => onRename(layout.layoutId, e.target.value)} />
            <button onClick={() => onSelect(layout.layoutId)}>{activeLayoutId === layout.layoutId ? 'Seleccionado' : 'Seleccionar'}</button>
            <button onClick={() => onEdit(layout.layoutId)}>Editar</button>
            <button onClick={() => onDuplicate(layout.layoutId)} disabled={layouts.length >= maxLayouts}>Duplicar</button>
            <button onClick={() => onDelete(layout.layoutId)} disabled={layouts.length <= 1}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
