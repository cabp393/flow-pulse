import { useMemo, useState } from 'react';
import type { Layout, RunResult } from '../models/domain';
import { HeatmapSideBySide } from '../components/HeatmapSideBySide';
import { validateComparableRuns } from '../utils/compareUtils';
import { PalletCompareTable } from './PalletCompareTable';

export function ComparePage({ layout, runs, runAId, runBId, onSelect }: { layout: Layout; runs: RunResult[]; runAId?: string; runBId?: string; onSelect: (a?: string, b?: string) => void }) {
  const [sharedScale, setSharedScale] = useState(true);
  const runA = useMemo(() => runs.find((run) => run.runId === runAId), [runAId, runs]);
  const runB = useMemo(() => runs.find((run) => run.runId === runBId), [runBId, runs]);
  const errors = validateComparableRuns(runA, runB);

  const deltaTotal = (runB?.summary.totalSteps ?? 0) - (runA?.summary.totalSteps ?? 0);
  const pct = runA?.summary.totalSteps ? (deltaTotal / runA.summary.totalSteps) * 100 : 0;

  return (
    <div className="page">
      <h2>Comparación de runs</h2>
      <div className="compare-grid-wrap">
        <label>Run A<select value={runAId ?? ''} onChange={(e) => onSelect(e.target.value || undefined, runBId)}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
        <label>Run B<select value={runBId ?? ''} onChange={(e) => onSelect(runAId, e.target.value || undefined)}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
      </div>
      <label><input type="checkbox" checked={sharedScale} onChange={(e) => setSharedScale(e.target.checked)} /> Escala de color compartida</label>
      {errors.length > 0 && <p className="error">No comparable: {errors.join(' | ')}</p>}
      <div className="toolbar">
        <span>Δ totalSteps: {deltaTotal}</span>
        <span>% mejora/peor: {pct.toFixed(2)}%</span>
        <span>Δ avgSteps: {((runB?.summary.avgSteps ?? 0) - (runA?.summary.avgSteps ?? 0)).toFixed(2)}</span>
        <span>Error pallets A/B: {runA?.summary.errorPallets ?? 0} / {runB?.summary.errorPallets ?? 0}</span>
      </div>
      <HeatmapSideBySide layout={layout} runA={runA} runB={runB} sharedScale={sharedScale} />
      <PalletCompareTable runA={runA} runB={runB} />
    </div>
  );
}
