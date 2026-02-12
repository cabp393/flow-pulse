import { useState } from 'react';
import type { Layout, PalletResolved, SkuMap } from '../models/domain';
import { resolvePallets, simulate } from '../routing/pathfinding';
import { parsePalletXlsx } from '../utils/parsers';

interface Props {
  layout: Layout;
  skuMap: SkuMap;
  onRun: ReturnType<typeof simulate> extends infer T ? (run: T) => void : never;
}

export function PalletImportPage({ layout, skuMap, onRun }: Props) {
  const [pallets, setPallets] = useState<PalletResolved[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [linesCount, setLinesCount] = useState(0);
  const [error, setError] = useState('');

  return (
    <div className="page">
      <h2>Importar pallets XLSX</h2>
      <input
        type="file"
        accept=".xlsx"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const lines = await parsePalletXlsx(file);
            setLinesCount(lines.length);
            const resolved = resolvePallets(lines, skuMap, layout);
            setPallets(resolved.pallets);
            setIssues(resolved.issues);
            setError('');
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      />
      {error && <p className="error">{error}</p>}
      <p>Total líneas: {linesCount}</p>
      <p>Total pallets: {pallets.length}</p>
      {issues.length > 0 && (
        <div className="error">
          <p>Issues detectados:</p>
          <ul>{issues.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      )}
      <button
        disabled={!pallets.length}
        onClick={() => {
          const run = simulate(layout, pallets);
          onRun(run);
        }}
      >
        Generar heatmap
      </button>
    </div>
  );
}
