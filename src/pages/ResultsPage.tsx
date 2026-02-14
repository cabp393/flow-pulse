import { useEffect, useMemo, useState } from 'react';
import type { Layout, RunResult, SkuMaster } from '../models/domain';
import { GridCanvas } from '../ui/GridCanvas';
import { ConfirmModal } from '../components/ConfirmModal';

interface Props {
  layouts: Layout[];
  runs: RunResult[];
  masters: SkuMaster[];
  selectedRunId?: string;
  onSelectRun: (runId?: string) => void;
  onDeleteRun: (runId: string) => void;
}

export function ResultsPage({ layouts, runs, masters, selectedRunId, onSelectRun, onDeleteRun }: Props) {
  const [runId, setRunId] = useState<string>(selectedRunId ?? runs[0]?.runId ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (selectedRunId) setRunId(selectedRunId);
  }, [selectedRunId]);

  useEffect(() => {
    setCopyFeedback('');
  }, [runId]);

  const run = useMemo(() => runs.find((item) => item.runId === runId) ?? runs[0], [runId, runs]);
  const runErrors = useMemo(() => {
    if (!run) return [] as { palletId: string; issues: string[] }[];
    return run.palletResults
      .filter((item) => item.issues.length > 0)
      .map((item) => ({ palletId: item.palletId, issues: item.issues }));
  }, [run]);
  const unmappedSkus = useMemo(() => {
    if (!run) return [] as string[];
    const skuSet = new Set<string>();
    run.palletResults.forEach((item) => {
      item.issues.forEach((issue) => {
        const match = issue.match(/^SKU\s+(.+?)\s+sin mapping en SKU Master$/);
        if (match?.[1]) skuSet.add(match[1]);
      });
    });
    return [...skuSet].sort((a, b) => a.localeCompare(b));
  }, [run]);
  const masterName = masters.find((item) => item.skuMasterId === run?.skuMasterId)?.name ?? run?.skuMasterId;
  const layout = layouts.find((item) => item.layoutId === run?.layoutId);

  if (!run) return <div className="page">Aún no hay runs.</div>;
  if (!layout) return <div className="page">Layout inexistente para este run.</div>;

  const copyUnmappedSkus = async () => {
    if (!unmappedSkus.length) return;
    try {
      await navigator.clipboard.writeText(unmappedSkus.join('\n'));
      setCopyFeedback('SKUs copiados al portapapeles.');
    } catch {
      setCopyFeedback('No se pudo copiar automáticamente.');
    }
  };

  return (
    <div className="page">
      <h2>Runs</h2>
      <label>Run<select value={run.runId} onChange={(e) => {
        setRunId(e.target.value);
        onSelectRun(e.target.value || undefined);
      }}>{runs.map((item) => <option key={item.runId} value={item.runId}>{item.name}</option>)}</select></label>
      <div className="toolbar"><button onClick={() => setConfirmDelete(true)}>Eliminar run actual</button></div>
      <p>SKU Master: {masterName}</p>
      <p>Total pallets: {run.summary.totalPallets} · OK/ERR: {run.summary.okPallets}/{run.summary.errorPallets} · Steps: {run.summary.totalSteps} · Avg: {run.summary.avgSteps.toFixed(2)}</p>
      <GridCanvas layout={layout} zoom={19} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} heatmap={run.heatmapSteps} />
      <section className="results-unmapped">
        <div className="results-unmapped-header">
          <h3>SKUs sin mapping</h3>
          <button type="button" onClick={() => void copyUnmappedSkus()} disabled={!unmappedSkus.length}>Copiar SKUs</button>
        </div>
        {!unmappedSkus.length && <p>Todos los SKUs tienen mapping.</p>}
        {!!unmappedSkus.length && (
          <>
            <p>{unmappedSkus.length} SKU(s) sin mapping detectados.</p>
            <pre className="results-unmapped-list">{unmappedSkus.join('\n')}</pre>
          </>
        )}
        {!!copyFeedback && <small>{copyFeedback}</small>}
      </section>
      <section className="results-errors">
        <h3>Errores de la run</h3>
        {!runErrors.length && <p>Sin errores en pallets.</p>}
        {runErrors.map((item) => (
          <article key={item.palletId} className="results-error-card">
            <strong>Pallet {item.palletId}</strong>
            <ul>
              {item.issues.map((issue, idx) => <li key={`${item.palletId}-${idx}`}>{issue}</li>)}
            </ul>
          </article>
        ))}
      </section>
      <ConfirmModal
        open={confirmDelete}
        title="Confirmar eliminación"
        description={`Esta acción eliminará el run "${run.name}".`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDeleteRun(run.runId);
          setConfirmDelete(false);
        }}
        danger
      />
    </div>
  );
}
