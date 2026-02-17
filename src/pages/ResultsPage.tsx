import { useEffect, useMemo, useState } from 'react';
import type { Batch, Layout, RunConfig, RunResult, SkuMaster } from '../models/domain';
import { GridCanvas } from '../ui/GridCanvas';
import { buildRunFromConfig } from '../runs/runSession';

interface Props {
  layouts: Layout[];
  batches: Batch[];
  runConfigs: RunConfig[];
  masters: SkuMaster[];
  selectedRunId?: string;
  onSelectRun: (runId?: string) => void;
}

export function ResultsPage({ layouts, batches, runConfigs, masters, selectedRunId, onSelectRun }: Props) {
  const [runId, setRunId] = useState<string>(selectedRunId ?? runConfigs[0]?.runConfigId ?? '');
  const [run, setRun] = useState<RunResult>();

  useEffect(() => {
    if (selectedRunId) setRunId(selectedRunId);
  }, [selectedRunId]);

  const config = useMemo(() => runConfigs.find((item) => item.runConfigId === runId) ?? runConfigs[0], [runConfigs, runId]);
  const layout = useMemo(() => layouts.find((item) => item.layoutId === config?.layoutId), [config?.layoutId, layouts]);
  const master = useMemo(() => masters.find((item) => item.skuMasterId === config?.skuMasterId), [config?.skuMasterId, masters]);
  const batch = useMemo(() => batches.find((item) => item.batchId === config?.batchId), [batches, config?.batchId]);

  useEffect(() => {
    if (!config || !layout || !master || !batch) {
      setRun(undefined);
      return;
    }
    void buildRunFromConfig(config, layout, master, batch).then(setRun);
  }, [batch, config, layout, master]);

  if (!config) return <div className="page">Aún no hay configs.</div>;
  if (!layout || !master || !batch) return <div className="page">Falta layout, batch o SKU master para generar resultados.</div>;
  if (!run) return <div className="page">Calculando resultados…</div>;

  return (
    <div className="page">
      <h2>Resultados on-demand</h2>
      <label>Config<select value={config.runConfigId} onChange={(e) => {
        setRunId(e.target.value);
        onSelectRun(e.target.value || undefined);
      }}>{runConfigs.map((item) => <option key={item.runConfigId} value={item.runConfigId}>{item.name}</option>)}</select></label>
      <p>Batch: {batch.name} · SKU Master: {master.name}</p>
      <p>Total pallets: {run.summary.totalPallets} · OK/ERR: {run.summary.okPallets}/{run.summary.errorPallets} · Steps: {run.summary.totalSteps}</p>
      <GridCanvas layout={layout} zoom={19} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} heatmap={run.heatmapSteps} />
    </div>
  );
}
