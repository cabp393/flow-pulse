import { useEffect, useMemo, useState } from 'react';
import type { Layout, RunResult, SkuMaster } from '../models/domain';
import { GridCanvas } from '../ui/GridCanvas';
import { ConfirmModal } from '../components/ConfirmModal';

type SideTab = 'missing' | 'errors' | 'metadata';

interface Props {
  layouts: Layout[];
  runs: RunResult[];
  masters: SkuMaster[];
  selectedRunId?: string;
  onSelectRun: (runId?: string) => void;
  onDeleteRun: (runId: string) => void;
  onOpenCompare?: (runId: string) => void;
  onOpenPlayer?: (runId: string) => void;
}

export function ResultsPage({ layouts, runs, masters, selectedRunId, onSelectRun, onDeleteRun, onOpenCompare, onOpenPlayer }: Props) {
  const [runId, setRunId] = useState<string>(selectedRunId ?? runs[0]?.runId ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [sideTab, setSideTab] = useState<SideTab>('missing');

  useEffect(() => {
    if (selectedRunId) setRunId(selectedRunId);
  }, [selectedRunId]);

  const run = useMemo(() => runs.find((item) => item.runId === runId) ?? runs[0], [runId, runs]);
  const runErrors = useMemo(() => {
    if (!run) return [] as { palletId: string; issues: string[] }[];
    return run.palletResults.filter((item) => item.issues.length > 0).map((item) => ({ palletId: item.palletId, issues: item.issues }));
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

  const layout = layouts.find((item) => item.layoutId === run?.layoutId);
  const masterName = masters.find((item) => item.skuMasterId === run?.skuMasterId)?.name ?? run?.skuMasterId;

  if (!run) return <div className="card">Aún no hay runs.</div>;
  if (!layout) return <div className="card">Layout inexistente para este run.</div>;

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
    <div className="runs-page">
      <section className="card runs-header">
        <label>
          Run
          <select
            value={run.runId}
            onChange={(event) => {
              setRunId(event.target.value);
              onSelectRun(event.target.value || undefined);
            }}
          >
            {runs.map((item) => <option key={item.runId} value={item.runId}>{item.name}</option>)}
          </select>
        </label>
        <div className="toolbar">
          <button onClick={() => onOpenPlayer?.(run.runId)} disabled={!onOpenPlayer}>Open in Player</button>
          <button onClick={() => onOpenCompare?.(run.runId)} disabled={!onOpenCompare}>Compare</button>
          <button className="danger" onClick={() => setConfirmDelete(true)}>Delete</button>
        </div>
      </section>

      <section className="stats-bar">
        <article><small>Pallets</small><strong>{run.summary.totalPallets}</strong></article>
        <article><small>Total steps</small><strong>{run.summary.totalSteps}</strong></article>
        <article><small>Avg steps</small><strong>{run.summary.avgSteps.toFixed(2)}</strong></article>
        <article><small>Missing SKUs</small><strong>{unmappedSkus.length}</strong></article>
      </section>

      <section className="runs-layout">
        <div className="card heatmap-card">
          <GridCanvas layout={layout} zoom={19} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} heatmap={run.heatmapSteps} />
        </div>
        <aside className="card side-panel">
          <div className="segmented-control">
            <button className={sideTab === 'missing' ? 'active' : ''} onClick={() => setSideTab('missing')}>Missing SKUs</button>
            <button className={sideTab === 'errors' ? 'active' : ''} onClick={() => setSideTab('errors')}>Errors</button>
            <button className={sideTab === 'metadata' ? 'active' : ''} onClick={() => setSideTab('metadata')}>Run metadata</button>
          </div>

          {sideTab === 'missing' && (
            <div>
              <div className="toolbar">
                <small>{unmappedSkus.length} SKU(s)</small>
                <button onClick={() => void copyUnmappedSkus()} disabled={!unmappedSkus.length}>Copy</button>
              </div>
              <pre className="results-unmapped-list">{unmappedSkus.length ? unmappedSkus.join('\n') : 'Todos los SKUs tienen mapping.'}</pre>
              {!!copyFeedback && <small>{copyFeedback}</small>}
            </div>
          )}

          {sideTab === 'errors' && (
            <div className="side-list">
              {!runErrors.length && <p>Sin errores en pallets.</p>}
              {runErrors.map((item) => (
                <article key={item.palletId} className="results-error-card">
                  <strong>Pallet {item.palletId}</strong>
                  <ul>
                    {item.issues.map((issue, idx) => <li key={`${item.palletId}-${idx}`}>{issue}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          )}

          {sideTab === 'metadata' && (
            <dl className="metadata-list">
              <div><dt>Run ID</dt><dd>{run.runId}</dd></div>
              <div><dt>Created</dt><dd>{new Date(run.createdAt).toLocaleString()}</dd></div>
              <div><dt>Layout</dt><dd>{layout.name}</dd></div>
              <div><dt>SKU Master</dt><dd>{masterName}</dd></div>
              <div><dt>Error pallets</dt><dd>{run.summary.errorPallets}</dd></div>
            </dl>
          )}
        </aside>
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
