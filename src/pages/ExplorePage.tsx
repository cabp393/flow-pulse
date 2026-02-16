import { useEffect, useMemo, useState } from 'react';
import type { Layout, RunResult, SkuMaster } from '../models/domain';
import { ConfirmModal } from '../components/ConfirmModal';
import { GridCanvas } from '../ui/GridCanvas';

interface Props {
  layouts: Layout[];
  runs: RunResult[];
  masters: SkuMaster[];
  selectedRunId?: string;
  onSelectRun: (runId?: string) => void;
  onDeleteRun: (runId: string) => void;
  onOpenPlayer: (runId: string) => void;
  onCompareRun: (runId: string) => void;
}

export function ExplorePage({ layouts, runs, masters, selectedRunId, onSelectRun, onDeleteRun, onOpenPlayer, onCompareRun }: Props) {
  const [runId, setRunId] = useState<string>(selectedRunId ?? runs[0]?.runId ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (selectedRunId) setRunId(selectedRunId);
  }, [selectedRunId]);

  const run = useMemo(() => runs.find((item) => item.runId === runId) ?? runs[0], [runId, runs]);
  const layout = useMemo(() => layouts.find((item) => item.layoutId === run?.layoutId), [layouts, run?.layoutId]);
  const masterName = masters.find((item) => item.skuMasterId === run?.skuMasterId)?.name ?? run?.skuMasterId;
  const runErrors = useMemo(() => run?.palletResults.filter((item) => item.issues.length > 0).map((item) => ({ palletId: item.palletId, issues: item.issues })) ?? [], [run]);
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
      <h2>Explore</h2>
      <div className="toolbar">
        <label>
          Run
          <select value={run.runId} onChange={(event) => {
            setRunId(event.target.value);
            onSelectRun(event.target.value || undefined);
          }}>
            {runs.map((item) => <option key={item.runId} value={item.runId}>{item.name}</option>)}
          </select>
        </label>
        <button onClick={() => onOpenPlayer(run.runId)}>Abrir Player</button>
        <button onClick={() => onCompareRun(run.runId)}>Comparar</button>
        <button onClick={() => setConfirmDelete(true)}>Eliminar run</button>
      </div>

      <p>{masterName} · pallets {run.summary.okPallets}/{run.summary.errorPallets} ok/err · steps {run.summary.totalSteps} · avg {run.summary.avgSteps.toFixed(2)} · missing skus {unmappedSkus.length}</p>

      <GridCanvas layout={layout} zoom={19} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} heatmap={run.heatmapSteps} />

      <details open className="results-unmapped">
        <summary>SKUs sin mapping ({unmappedSkus.length})</summary>
        <div className="results-unmapped-header">
          <small>Listado único para corregir en Assets → SKU Masters.</small>
          <button type="button" onClick={() => void copyUnmappedSkus()} disabled={!unmappedSkus.length}>Copiar</button>
        </div>
        {!unmappedSkus.length ? <p>Todos los SKUs tienen mapping.</p> : <pre className="results-unmapped-list">{unmappedSkus.join('\n')}</pre>}
        {!!copyFeedback && <small>{copyFeedback}</small>}
      </details>

      <details open className="results-errors">
        <summary>Errores por pallet ({runErrors.length})</summary>
        {!runErrors.length && <p>Sin errores en pallets.</p>}
        {runErrors.map((item) => (
          <article key={item.palletId} className="results-error-card">
            <strong>Pallet {item.palletId}</strong>
            <ul>{item.issues.map((issue, idx) => <li key={`${item.palletId}-${idx}`}>{issue}</li>)}</ul>
          </article>
        ))}
      </details>

      <h3>Runs recientes</h3>
      <ul className="home-saved-list">
        {runs.slice(0, 5).map((item) => (
          <li key={item.runId} className="inline-row">
            <span>{item.name}</span>
            <button onClick={() => { setRunId(item.runId); onSelectRun(item.runId); }}>Abrir</button>
          </li>
        ))}
      </ul>

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
