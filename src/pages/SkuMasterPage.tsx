import { useMemo, useState } from 'react';
import type { Layout, SkuMaster } from '../models/domain';
import { parseSkuCsv } from '../utils/parsers';
import { createSkuMaster, removeSkuMaster, updateSkuMaster } from '../storage/skuMasterRepo';

interface Props {
  layout: Layout;
  masters: SkuMaster[];
  activeSkuMasterId?: string;
  onChange: (next: SkuMaster[], activeSkuMasterId?: string) => void;
}

export function SkuMasterPage({ layout, masters, activeSkuMasterId, onChange }: Props) {
  const [text, setText] = useState('sku,locationId');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState('');

  const validLocationIds = useMemo(() => {
    const ids = new Set<string>();
    layout.grid.flat().forEach((c) => {
      if (c.type === 'PICK' && c.pick?.locationId) ids.add(c.pick.locationId);
    });
    return ids;
  }, [layout]);

  const current = masters.find((item) => item.skuMasterId === editingId) ?? masters.find((item) => item.skuMasterId === activeSkuMasterId);

  const inconsistent = current ? Object.entries(current.mapping).filter(([, loc]) => !validLocationIds.has(loc)) : [];

  const upsertFromText = () => {
    try {
      const mapping = parseSkuCsv(text);
      if (editingId) {
        const target = masters.find((item) => item.skuMasterId === editingId);
        if (!target) return;
        onChange(updateSkuMaster(masters, { ...target, name: name || target.name, mapping: { ...target.mapping, ...mapping } }), activeSkuMasterId);
      } else {
        const next = createSkuMaster(name || `SKU Master ${masters.length + 1}`, mapping);
        onChange([next, ...masters], next.skuMasterId);
      }
      setError('');
      setName('');
      setEditingId(undefined);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="page">
      <h2>SKU Masters</h2>
      <input placeholder="Nombre SKU master" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} />
      <div className="toolbar">
        <button onClick={upsertFromText}>{editingId ? 'Guardar cambios' : 'Crear SKU Master'}</button>
      </div>
      {error && <p className="error">{error}</p>}
      <ul className="sku-list">
        {masters.map((master) => (
          <li key={master.skuMasterId}>
            <span><strong>{master.name}</strong> ({Object.keys(master.mapping).length} SKUs)</span>
            <button onClick={() => onChange(masters, master.skuMasterId)}>{activeSkuMasterId === master.skuMasterId ? 'Activo' : 'Activar'}</button>
            <button onClick={() => { setEditingId(master.skuMasterId); setName(master.name); setText(['sku,locationId', ...Object.entries(master.mapping).map(([sku, loc]) => `${sku},${loc}`)].join('\n')); }}>Editar</button>
            <button onClick={() => onChange(removeSkuMaster(masters, master.skuMasterId), activeSkuMasterId === master.skuMasterId ? undefined : activeSkuMasterId)}>Eliminar</button>
          </li>
        ))}
      </ul>
      {inconsistent.length > 0 && <p className="error">SKU master activo tiene {inconsistent.length} locationIds no válidos.</p>}
    </div>
  );
}
