import { useMemo, useState } from 'react';
import type { Layout, RunResult } from '../models/domain';
import { HeatmapSideBySide } from '../components/HeatmapSideBySide';
import { validateComparableRuns } from '../utils/compareUtils';
import { PalletCompareTable } from './PalletCompareTable';

export function ComparePage({
  layout,
  runs,
  runAId,
  runBId,
  onSelect,
  onOpenPalletInPlayer,
}: {
  layout: Layout;
  runs: RunResult[];
  runAId?: string;
  runBId?: string;
  onSelect: (a?: string, b?: string) => void;
  onOpenPalletInPlayer: (palletId: string) => void;
}) {
  const [sharedScale, setSharedScale] = useState(true);
  const runA = useMemo(() => runs.find((run) => run.runId === runAId), [runAId, runs]);
  const runB = useMemo(() => runs.find((run) => run.runId === runBId), [runBId, runs]);
  const errors = validateComparableRuns(runA, runB);

  const deltaTotal = (runB?.summary.totalSteps ?? 0) - (runA?.summary.totalSteps ?? 0);
  const pct = runA?.summary.totalSteps ? (deltaTotal / runA.summary.totalSteps) * 100 : 0;

  return (
    <div className="compare-page">
      <section className="card compare-toolbar">
        <label>Run A<select value={runAId ?? ''} onChange={(e) => onSelect(e.target.value || undefined, runBId)}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
        <label>Run B<select value={runBId ?? ''} onChange={(e) => onSelect(runAId, e.target.value || undefined)}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
        <label><input type="checkbox" checked={sharedScale} onChange={(e) => setSharedScale(e.target.checked)} /> Shared scale</label>
      </section>

      {errors.length > 0 && <p className="error">No comparable: {errors.join(' | ')}</p>}

      <section className="stats-bar">
        <article><small>Δ total steps</small><strong>{deltaTotal}</strong></article>
        <article><small>Δ %</small><strong>{pct.toFixed(2)}%</strong></article>
        <article><small>Δ avg steps</small><strong>{((runB?.summary.avgSteps ?? 0) - (runA?.summary.avgSteps ?? 0)).toFixed(2)}</strong></article>
        <article><small>Error pallets A/B</small><strong>{runA?.summary.errorPallets ?? 0} / {runB?.summary.errorPallets ?? 0}</strong></article>
      </section>

      <div className="card">
        <HeatmapSideBySide layout={layout} runA={runA} runB={runB} sharedScale={sharedScale} />
      </div>

      <section className="card">
        <PalletCompareTable runA={runA} runB={runB} onOpenPallet={onOpenPalletInPlayer} />
      </section>
    </div>
  );
}
