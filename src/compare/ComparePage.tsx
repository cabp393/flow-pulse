import { useEffect, useMemo, useState } from 'react';
import type { Batch, Layout, RunConfig, RunResult, SkuMaster } from '../models/domain';
import { HeatmapSideBySide } from '../components/HeatmapSideBySide';
import { validateComparableRuns } from '../utils/compareUtils';
import { PalletCompareTable } from './PalletCompareTable';
import { buildRunFromConfig } from '../runs/runSession';

export function ComparePage({
  layouts,
  batches,
  masters,
  runConfigs,
  runAId,
  runBId,
  onSelect,
  onOpenPalletInPlayer,
}: {
  layouts: Layout[];
  batches: Batch[];
  masters: SkuMaster[];
  runConfigs: RunConfig[];
  runAId?: string;
  runBId?: string;
  onSelect: (a?: string, b?: string) => void;
  onOpenPalletInPlayer: (palletId: string) => void;
}) {
  const [sharedScale, setSharedScale] = useState(true);
  const [runA, setRunA] = useState<RunResult>();
  const [runB, setRunB] = useState<RunResult>();
  const configA = useMemo(() => runConfigs.find((run) => run.runConfigId === runAId), [runAId, runConfigs]);
  const configB = useMemo(() => runConfigs.find((run) => run.runConfigId === runBId), [runBId, runConfigs]);

  useEffect(() => {
    const resolve = async () => {
      if (!configA) return setRunA(undefined);
      const layout = layouts.find((item) => item.layoutId === configA.layoutId);
      const master = masters.find((item) => item.skuMasterId === configA.skuMasterId);
      const batch = batches.find((item) => item.batchId === configA.batchId);
      if (!layout || !master || !batch) return setRunA(undefined);
      setRunA(await buildRunFromConfig(configA, layout, master, batch));
    };
    void resolve();
  }, [batches, configA, layouts, masters]);

  useEffect(() => {
    const resolve = async () => {
      if (!configB) return setRunB(undefined);
      const layout = layouts.find((item) => item.layoutId === configB.layoutId);
      const master = masters.find((item) => item.skuMasterId === configB.skuMasterId);
      const batch = batches.find((item) => item.batchId === configB.batchId);
      if (!layout || !master || !batch) return setRunB(undefined);
      setRunB(await buildRunFromConfig(configB, layout, master, batch));
    };
    void resolve();
  }, [batches, configB, layouts, masters]);

  const errors = validateComparableRuns(runA, runB);
  const layout = layouts.find((item) => item.layoutId === runA?.layoutId);
  if (!layout && runA) return <div className="page">Layout faltante para config A.</div>;

  const deltaTotal = (runB?.summary.totalSteps ?? 0) - (runA?.summary.totalSteps ?? 0);
  const pct = runA?.summary.totalSteps ? (deltaTotal / runA.summary.totalSteps) * 100 : 0;

  return (
    <div className="page">
      <h2>Comparación de configs</h2>
      <div className="compare-grid-wrap">
        <label>Config A<select value={runAId ?? ''} onChange={(e) => onSelect(e.target.value || undefined, runBId)}><option value="">--</option>{runConfigs.map((run) => <option key={run.runConfigId} value={run.runConfigId}>{run.name}</option>)}</select></label>
        <label>Config B<select value={runBId ?? ''} onChange={(e) => onSelect(runAId, e.target.value || undefined)}><option value="">--</option>{runConfigs.map((run) => <option key={run.runConfigId} value={run.runConfigId}>{run.name}</option>)}</select></label>
      </div>
      <label><input type="checkbox" checked={sharedScale} onChange={(e) => setSharedScale(e.target.checked)} /> Escala de color compartida</label>
      {errors.length > 0 && <p className="error">No comparable: {errors.join(' | ')}</p>}
      <div className="toolbar"><span>Δ totalSteps: {deltaTotal}</span><span>% mejora/peor: {pct.toFixed(2)}%</span></div>
      {layout && <HeatmapSideBySide layout={layout} runA={runA} runB={runB} sharedScale={sharedScale} />}
      <PalletCompareTable runA={runA} runB={runB} onOpenPallet={onOpenPalletInPlayer} />
    </div>
  );
}
