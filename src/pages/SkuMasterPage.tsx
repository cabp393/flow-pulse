import { useMemo, useState } from 'react';
import type { Layout, SkuMap } from '../models/domain';
import { parseSkuCsv } from '../utils/parsers';

interface Props {
  layout: Layout;
  skuMap: SkuMap;
  setSkuMap: (next: SkuMap) => void;
}

export function SkuMasterPage({ layout, skuMap, setSkuMap }: Props) {
  const [text, setText] = useState('sku,locationId');
  const [error, setError] = useState('');

  const validLocationIds = useMemo(() => {
    const ids = new Set<string>();
    layout.grid.flat().forEach((c) => {
      if (c.type === 'PICK' && c.pick?.locationId) ids.add(c.pick.locationId);
    });
    return ids;
  }, [layout]);

  const inconsistent = Object.entries(skuMap).filter(([, loc]) => !validLocationIds.has(loc));
  const sortedEntries = Object.entries(skuMap).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="page">
      <h2>Maestro SKU</h2>
      <p>Pega CSV con columnas sku,locationId.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} />
      <div className="toolbar">
        <button
          onClick={() => {
            try {
              const imported = parseSkuCsv(text);
              setSkuMap({ ...skuMap, ...imported });
              setError('');
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          Importar CSV/Pegado (merge)
        </button>
        <button onClick={() => setSkuMap({})} disabled={!sortedEntries.length}>
          Borrar todos
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <p>Total SKUs: {Object.keys(skuMap).length}</p>
      {inconsistent.length > 0 && (
        <div className="error">
          <p>Inconsistencias con layout:</p>
          <ul>
            {inconsistent.map(([sku, loc]) => (
              <li key={sku}>
                {sku} → {loc} no existe en layout
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3>SKUs cargados</h3>
      {sortedEntries.length ? (
        <ul className="sku-list">
          {sortedEntries.map(([sku, locationId]) => (
            <li key={sku}>
              <span>
                <strong>{sku}</strong> → {locationId}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = { ...skuMap };
                  delete next[sku];
                  setSkuMap(next);
                }}
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay SKUs cargados.</p>
      )}
    </div>
  );
}
