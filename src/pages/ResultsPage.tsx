import { useMemo, useState } from 'react';
import type { Layout, RunResult } from '../models/domain';
import { GridCanvas } from '../ui/GridCanvas';

interface Props {
  layout: Layout;
  run?: RunResult;
  onOpenPlayer: (payload: { runId: string; palletId: string; palletIndex: number }) => void;
}

export function ResultsPage({ layout, run, onOpenPlayer }: Props) {
  const [selectedPallet, setSelectedPallet] = useState('');
  const [zoom, setZoom] = useState(24);
  const selectedIndex = useMemo(
    () => run?.pallets.findIndex((p) => p.palletId === selectedPallet) ?? -1,
    [run, selectedPallet],
  );

  const pallet = useMemo(() => run?.pallets.find((p) => p.palletId === selectedPallet), [run, selectedPallet]);

  const movePalletSelection = (direction: -1 | 1) => {
    if (!run?.pallets.length) return;
    const startIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = Math.min(Math.max(startIndex + direction, 0), run.pallets.length - 1);
    setSelectedPallet(run.pallets[nextIndex].palletId);
  };

  if (!run) return <div className="page">Aún no hay resultados.</div>;

  return (
    <div className="page">
      <h2>Resultados</h2>
      <p>Total steps: {run.totalSteps}</p>
      <p>Run: {new Date(run.createdAt).toLocaleString()}</p>

      <div className="results-pallet-toolbar">
        <label>
          Ver pallet
          <select value={selectedPallet} onChange={(e) => setSelectedPallet(e.target.value)}>
            <option value="">-- seleccionar --</option>
            {run.pallets.map((p) => (
              <option key={p.palletId} value={p.palletId}>
                {p.palletId}
              </option>
            ))}
          </select>
        </label>
        <span>SKU pickeados: {pallet?.stopDetails.length ?? 0}</span>
        <button onClick={() => movePalletSelection(-1)} disabled={!run.pallets.length || selectedIndex === 0}>
          ←
        </button>
        <button
          onClick={() => movePalletSelection(1)}
          disabled={!run.pallets.length || selectedIndex === run.pallets.length - 1}
        >
          →
        </button>
        <button
          type="button"
          disabled={!pallet}
          onClick={() => {
            if (!pallet) return;
            onOpenPlayer({ runId: run.runId, palletId: pallet.palletId, palletIndex: selectedIndex });
          }}
        >
          Ver en Player
        </button>
      </div>
      <div>
        <button onClick={() => setZoom((z) => Math.max(16, z - 4))}>-</button>
        <button onClick={() => setZoom((z) => Math.min(60, z + 4))}>+</button>
      </div>

      <GridCanvas
        layout={layout}
        zoom={zoom}
        selectedTool="AISLE"
        onPaint={() => undefined}
        onSelect={() => undefined}
        heatmap={run.heatmap}
        path={pallet?.visited}
        pickAccessCells={pallet?.stopDetails.map((stop) => stop.accessCell)}
      />

      {pallet && (
        <div>
          <h3>Pallet {pallet.palletId}</h3>
          <p>Steps: {pallet.steps}</p>
          <p>Issues: {pallet.issues.length ? pallet.issues.join(' | ') : 'none'}</p>
          <h4>Detalle de picks pallet {pallet.palletId}</h4>
          <ol>
            {pallet.stopDetails.map((stop) => (
              <li key={`${stop.order}-${stop.sku}-${stop.locationId}`}>
                #{stop.order} · SKU <strong>{stop.sku}</strong> · location {stop.locationId} · sequence {stop.sequence} · accessCell ({stop.accessCell.x},
                {stop.accessCell.y})
              </li>
            ))}
          </ol>
        </div>
      )}
      {!pallet && <p>Selecciona un pallet para ver su recorrido e incidencias.</p>}
    </div>
  );
}
