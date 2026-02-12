import { useMemo, useState } from 'react';
import type { Layout, RunResult } from '../models/domain';
import { GridCanvas } from '../ui/GridCanvas';

interface Props {
  layout: Layout;
  run?: RunResult;
}

export function ResultsPage({ layout, run }: Props) {
  const [selectedPallet, setSelectedPallet] = useState('');
  const [zoom, setZoom] = useState(24);

  const pallet = useMemo(() => run?.pallets.find((p) => p.palletId === selectedPallet), [run, selectedPallet]);

  if (!run) return <div className="page">Aún no hay resultados.</div>;

  return (
    <div className="page">
      <h2>Resultados</h2>
      <p>Total steps: {run.totalSteps}</p>
      <p>Run: {new Date(run.createdAt).toLocaleString()}</p>

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
      />

      <h3>Pallets</h3>
      <ul>
        {run.pallets.map((p) => (
          <li key={p.palletId}>
            <strong>{p.palletId}</strong> - steps: {p.steps} - issues: {p.issues.length ? p.issues.join(' | ') : 'none'}
          </li>
        ))}
      </ul>
      {pallet && (
        <div>
          <h4>Stops pallet {pallet.palletId}</h4>
          <ol>
            {pallet.stops.map((s, i) => (
              <li key={`${i}-${s.x}-${s.y}`}>
                ({s.x},{s.y})
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
