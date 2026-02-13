import { useMemo, useState } from 'react';
import type { Layout, RunResult, SkuMaster } from '../models/domain';
import { GridCanvas } from '../ui/GridCanvas';

interface Props {
  layout: Layout;
  runs: RunResult[];
  masters: SkuMaster[];
  onDeleteRun: (runId: string) => void;
}

export function ResultsPage({ layout, runs, masters, onDeleteRun }: Props) {
  const [runId, setRunId] = useState<string>(runs[0]?.runId ?? '');
  const run = useMemo(() => runs.find((item) => item.runId === runId) ?? runs[0], [runId, runs]);
  const masterName = masters.find((item) => item.skuMasterId === run?.skuMasterId)?.name ?? run?.skuMasterId;

  if (!run) return <div className="page">Aún no hay runs.</div>;

  return (
    <div className="page">
      <h2>Runs</h2>
      <label>Run<select value={run.runId} onChange={(e) => setRunId(e.target.value)}>{runs.map((item) => <option key={item.runId} value={item.runId}>{item.runId}</option>)}</select></label>
      <div className="toolbar">
        <button onClick={() => onDeleteRun(run.runId)}>Eliminar run actual</button>
      </div>
      <p>SKU Master: {masterName}</p>
      <p>Total pallets: {run.summary.totalPallets} · Steps: {run.summary.totalSteps} · Avg: {run.summary.avgSteps.toFixed(2)}</p>
      <GridCanvas layout={layout} zoom={19} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} heatmap={run.heatmapSteps} />
    </div>
  );
}
