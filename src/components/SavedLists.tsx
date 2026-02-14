import type { ReactNode } from 'react';
import type { Layout, SkuMaster } from '../models/domain';
import { InlineIconButton } from './InlineIcon';

const dateFmt = (value: string) => new Date(value).toLocaleDateString();

function ItemRow({ title, subtitle, actions }: { title: string; subtitle?: string; actions: ReactNode }) {
  return (
    <li className="inline-row">
      <div>
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <div className="row-actions">{actions}</div>
    </li>
  );
}

interface SkuMasterListProps {
  items: SkuMaster[];
  activeSkuMasterId?: string;
  onOpen: (skuMasterId: string) => void;
  onEdit: (skuMasterId: string) => void;
  onDuplicate: (skuMasterId: string) => void;
  onRename: (skuMasterId: string, nextName: string) => void;
  onExport: (skuMasterId: string) => void;
  onDelete: (skuMasterId: string, name: string) => void;
}

export function SkuMasterList({
  items,
  activeSkuMasterId,
  onOpen,
  onEdit,
  onDuplicate,
  onRename,
  onExport,
  onDelete,
}: SkuMasterListProps) {
  return (
    <ul className="home-saved-list">
      {items.map((master) => (
        <ItemRow
          key={master.skuMasterId}
          title={master.name}
          subtitle={`${master.rows.length} filas · ${dateFmt(master.createdAt)}${master.skuMasterId === activeSkuMasterId ? ' · activo' : ''}`}
          actions={(
            <>
              <InlineIconButton icon="pencil" title="Ver/Editar SKU master" onClick={() => { onOpen(master.skuMasterId); onEdit(master.skuMasterId); }} />
              <InlineIconButton icon="copy" title="Duplicar SKU master" onClick={() => onDuplicate(master.skuMasterId)} />
              <InlineIconButton icon="rename" title="Renombrar SKU master" onClick={() => {
                const next = window.prompt('Nuevo nombre del SKU master', master.name);
                if (next && next.trim()) onRename(master.skuMasterId, next.trim());
              }} />
              <InlineIconButton icon="download" title="Exportar SKU master" onClick={() => onExport(master.skuMasterId)} />
              <InlineIconButton icon="trash" title="Eliminar SKU master" onClick={() => onDelete(master.skuMasterId, master.name)} />
            </>
          )}
        />
      ))}
    </ul>
  );
}

interface LayoutListProps {
  items: Layout[];
  activeLayoutId?: string;
  disableDelete?: boolean;
  onOpen: (layoutId: string) => void;
  onEdit: (layoutId: string) => void;
  onDuplicate: (layoutId: string) => void;
  onRename: (layoutId: string, nextName: string) => void;
  onExport: (layoutId: string) => void;
  onDelete: (layoutId: string, name: string) => void;
}

export function LayoutList({
  items,
  activeLayoutId,
  disableDelete,
  onOpen,
  onEdit,
  onDuplicate,
  onRename,
  onExport,
  onDelete,
}: LayoutListProps) {
  return (
    <ul className="home-saved-list">
      {items.map((layout) => (
        <ItemRow
          key={layout.layoutId}
          title={layout.name}
          subtitle={`${layout.width}x${layout.height} · ${dateFmt(layout.createdAt)}${layout.layoutId === activeLayoutId ? ' · activo' : ''}`}
          actions={(
            <>
              <InlineIconButton icon="chart" title="Visualizar layout" onClick={() => onOpen(layout.layoutId)} />
              <InlineIconButton icon="pencil" title="Editar layout" onClick={() => onEdit(layout.layoutId)} />
              <InlineIconButton icon="copy" title="Duplicar layout" onClick={() => onDuplicate(layout.layoutId)} />
              <InlineIconButton icon="download" title="Exportar layout" onClick={() => onExport(layout.layoutId)} />
              <InlineIconButton icon="rename" title="Renombrar layout" onClick={() => {
                const next = window.prompt('Nuevo nombre del layout', layout.name);
                if (next && next.trim()) onRename(layout.layoutId, next.trim());
              }} />
              <InlineIconButton icon="trash" title="Eliminar layout" onClick={() => onDelete(layout.layoutId, layout.name)} disabled={disableDelete} />
            </>
          )}
        />
      ))}
    </ul>
  );
}
