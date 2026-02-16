import { useMemo, useState } from 'react';
import type { Layout, RunResult, SkuMaster } from '../models/domain';
import { PalletImportPage } from './PalletImportPage';
import { ConfirmModal } from '../components/ConfirmModal';

interface Props {
  layouts: Layout[];
  activeLayoutId?: string;
  skuMasters: SkuMaster[];
  activeSkuMasterId?: string;
  runs: RunResult[];
  onCreateRun: (run: RunResult) => void;
  onSelectLayout: (layoutId: string) => void;
  onOpenRun: (runId: string) => void;
  onOpenRunInCompare: (runId: string) => void;
  onOpenRunInPlayer: (runId: string) => void;
  onDeleteRun: (runId: string) => void;
  onGoToResults: () => void;
}

const dateFmt = (value: string) => new Date(value).toLocaleDateString();

export function HomePage({
  layouts,
  activeLayoutId,
  skuMasters,
  activeSkuMasterId,
  runs,
  onCreateRun,
  onSelectLayout,
  onOpenRun,
  onOpenRunInCompare,
  onOpenRunInPlayer,
  onDeleteRun,
  onGoToResults,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string }>();

  const activeLayout = useMemo(() => layouts.find((item) => item.layoutId === activeLayoutId), [activeLayoutId, layouts]);
  const activeSku = useMemo(() => skuMasters.find((item) => item.skuMasterId === activeSkuMasterId), [activeSkuMasterId, skuMasters]);
  const latestRun = runs[0];

  return (
    <div className="dashboard-page">
      <section className="dashboard-kpis">
        <article className="card stat-card">
          <p>Active Layout</p>
          <strong>{activeLayout?.name ?? 'No seleccionado'}</strong>
          <small>{activeLayout ? `${activeLayout.width} x ${activeLayout.height}` : 'Configura en Assets > Layouts'}</small>
        </article>
        <article className="card stat-card">
          <p>Active SKU Master</p>
          <strong>{activeSku?.name ?? 'No seleccionado'}</strong>
          <small>{activeSku ? `${activeSku.rows.length} filas` : 'Configura en Assets > SKU Masters'}</small>
        </article>
        <article className="card stat-card">
          <p>Latest Run</p>
          <strong>{latestRun?.name ?? 'Sin runs'}</strong>
          <small>{latestRun ? `${latestRun.summary.totalPallets} pallets · ${latestRun.summary.totalSteps} steps` : 'Genera tu primera run'}</small>
        </article>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Generate Run</h2>
        </div>
        <PalletImportPage
          layouts={layouts}
          activeLayoutId={activeLayoutId}
          masters={skuMasters}
          activeSkuMasterId={activeSkuMasterId}
          onGeneratedRun={onCreateRun}
          onSelectLayout={onSelectLayout}
          onOpenResults={onGoToResults}
        />
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Recent Runs</h2>
        </div>
        <ul className="data-list">
          {runs.map((run) => (
            <li key={run.runId}>
              <div>
                <strong>{run.name}</strong>
                <small>{run.summary.totalPallets} pallets · {dateFmt(run.createdAt)}</small>
              </div>
              <div className="row-actions text-actions">
                <button onClick={() => onOpenRun(run.runId)}>Open</button>
                <button onClick={() => onOpenRunInCompare(run.runId)}>Compare</button>
                <button onClick={() => onOpenRunInPlayer(run.runId)}>Player</button>
                <button className="danger-text" onClick={() => setPendingDelete({ id: run.runId, name: run.name })}>Delete</button>
              </div>
            </li>
          ))}
          {runs.length === 0 && <li className="empty">No hay runs recientes.</li>}
        </ul>
      </section>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Confirmar eliminación"
        description={`Esta acción eliminará "${pendingDelete?.name}".`}
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={() => {
          if (!pendingDelete) return;
          onDeleteRun(pendingDelete.id);
          setPendingDelete(undefined);
        }}
        danger
      />
    </div>
  );
}
