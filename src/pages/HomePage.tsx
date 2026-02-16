import { useState } from 'react';
import type { Layout, RunResult, SkuMaster } from '../models/domain';
import { PalletImportPage } from './PalletImportPage';
import { ConfirmModal } from '../components/ConfirmModal';
import { InlineIconButton } from '../components/InlineIcon';
import { LayoutList, SkuMasterList } from '../components/SavedLists';

interface Props {
  layouts: Layout[];
  activeLayoutId?: string;
  skuMasters: SkuMaster[];
  activeSkuMasterId?: string;
  runs: RunResult[];
  onCreateRun: (run: RunResult) => void;
  onSelectLayout: (layoutId: string) => void;
  onEditLayout: (layoutId: string) => void;
  onDuplicateLayout: (layoutId: string) => void;
  onRenameLayout: (layoutId: string, name: string) => void;
  onDeleteLayout: (layoutId: string) => void;
  onExportLayout: (layoutId: string) => void;
  onOpenSkuMaster: (skuMasterId: string) => void;
  onDuplicateSkuMaster: (skuMasterId: string) => void;
  onRenameSkuMaster: (skuMasterId: string, name: string) => void;
  onDeleteSkuMaster: (skuMasterId: string) => void;
  onExportSkuMaster: (skuMasterId: string) => void;
  onOpenRun: (runId: string) => void;
  onOpenRunInCompare: (runId: string) => void;
  onOpenRunInPlayer: (runId: string) => void;
  onRenameRun: (runId: string, name: string) => void;
  onDeleteRun: (runId: string) => void;
  onGoToResults: () => void;
}

type ConfirmState =
  | { kind: 'layout'; id: string; name: string }
  | { kind: 'sku'; id: string; name: string }
  | { kind: 'run'; id: string; name: string }
  | undefined;

const formatStorageSize = (payload: unknown): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const dateTimeFmt = (value: string) => new Date(value).toLocaleString();

export function HomePage({
  layouts,
  activeLayoutId,
  skuMasters,
  activeSkuMasterId,
  runs,
  onCreateRun,
  onSelectLayout,
  onEditLayout,
  onDuplicateLayout,
  onRenameLayout,
  onDeleteLayout,
  onExportLayout,
  onOpenSkuMaster,
  onDuplicateSkuMaster,
  onRenameSkuMaster,
  onDeleteSkuMaster,
  onExportSkuMaster,
  onOpenRun,
  onOpenRunInCompare,
  onOpenRunInPlayer,
  onRenameRun,
  onDeleteRun,
  onGoToResults,
}: Props) {
  const [confirmState, setConfirmState] = useState<ConfirmState>();

  const confirmAction = () => {
    if (!confirmState) return;
    if (confirmState.kind === 'layout') onDeleteLayout(confirmState.id);
    if (confirmState.kind === 'sku') onDeleteSkuMaster(confirmState.id);
    if (confirmState.kind === 'run') onDeleteRun(confirmState.id);
    setConfirmState(undefined);
  };

  return (
    <div className="home-grid">
      <section className="page home-section">
        <div className="home-section-header">
          <h3>Atajos</h3>
          <span>Flujo rápido</span>
        </div>
        <div className="quick-actions-grid" role="list" aria-label="Acciones rápidas">
          <button type="button" className="quick-action-card" onClick={() => onEditLayout(activeLayoutId ?? layouts[0]?.layoutId ?? '')} disabled={!layouts.length}>
            <strong>Crear / editar layout</strong>
            <small>Diseña celdas START, END y PICK.</small>
          </button>
          <button type="button" className="quick-action-card" onClick={() => onOpenSkuMaster(activeSkuMasterId ?? skuMasters[0]?.skuMasterId ?? '')} disabled={!skuMasters.length}>
            <strong>Cargar SKU Master</strong>
            <small>Importa CSV y valida locationIds.</small>
          </button>
          <button type="button" className="quick-action-card" onClick={onGoToResults} disabled={!runs.length}>
            <strong>Explorar heatmap</strong>
            <small>Revisa métricas y errores del último run.</small>
          </button>
        </div>
      </section>

      <section className="page home-section">
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

      <section className="page home-section">
        <div className="home-section-header"><h3>Layouts guardados</h3><span>{layouts.length} ({formatStorageSize(layouts)})</span></div>
        <LayoutList
          items={layouts}
          activeLayoutId={activeLayoutId}
          disableDelete={layouts.length <= 1}
          onOpen={onSelectLayout}
          onEdit={onEditLayout}
          onDuplicate={onDuplicateLayout}
          onRename={onRenameLayout}
          onExport={onExportLayout}
          onDelete={(id, name) => setConfirmState({ kind: 'layout', id, name })}
        />
      </section>

      <section className="page home-section">
        <div className="home-section-header"><h3>SKU Masters guardados</h3><span>{skuMasters.length} ({formatStorageSize(skuMasters)})</span></div>
        <SkuMasterList
          items={skuMasters}
          activeSkuMasterId={activeSkuMasterId}
          onOpen={onOpenSkuMaster}
          onEdit={() => {}}
          onDuplicate={onDuplicateSkuMaster}
          onRename={onRenameSkuMaster}
          onExport={onExportSkuMaster}
          onDelete={(id, name) => setConfirmState({ kind: 'sku', id, name })}
        />
      </section>

      <section className="page home-section">
        <div className="home-section-header"><h3>Runs guardados</h3><span>{runs.length} ({formatStorageSize(runs)})</span></div>
        <div className="table-wrap">
          <table className="data-table" aria-label="Tabla de runs guardados">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Fecha</th>
                <th>Pallets</th>
                <th>Métricas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.runId}>
                  <td>{run.name}</td>
                  <td>{dateTimeFmt(run.createdAt)}</td>
                  <td>{run.summary.totalPallets}</td>
                  <td>{`Avg ${run.summary.avgSteps.toFixed(2)} · Err ${run.summary.errorPallets}`}</td>
                  <td>
                    <div className="row-actions">
                      <InlineIconButton icon="chart" title="Ver resultados" onClick={() => onOpenRun(run.runId)} />
                      <InlineIconButton icon="split" title="Abrir en comparar" onClick={() => onOpenRunInCompare(run.runId)} />
                      <InlineIconButton icon="play" title="Abrir en player" onClick={() => onOpenRunInPlayer(run.runId)} />
                      <InlineIconButton icon="rename" title="Renombrar run" onClick={() => {
                        const next = window.prompt('Nuevo nombre del run', run.name);
                        if (next && next.trim()) onRenameRun(run.runId, next.trim());
                      }} />
                      <InlineIconButton icon="trash" title="Eliminar run" onClick={() => setConfirmState({ kind: 'run', id: run.runId, name: run.name })} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmModal
        open={Boolean(confirmState)}
        title="Confirmar eliminación"
        description={`Esta acción eliminará "${confirmState?.name}".`}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmState(undefined)}
        onConfirm={confirmAction}
        danger
      />
    </div>
  );
}
