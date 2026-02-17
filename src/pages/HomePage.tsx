import { useState } from 'react';
import type { Batch, Layout, RunConfig, SkuMaster } from '../models/domain';
import { PalletImportPage } from './PalletImportPage';
import { ConfirmModal } from '../components/ConfirmModal';
import { InlineIconButton } from '../components/InlineIcon';
import { LayoutList, SkuMasterList } from '../components/SavedLists';

interface Props {
  layouts: Layout[];
  activeLayoutId?: string;
  skuMasters: SkuMaster[];
  activeSkuMasterId?: string;
  batches: Batch[];
  runConfigs: RunConfig[];
  onSaveBatchAndAnalyze: (payload: { batch: Batch; layoutId: string; skuMasterId: string }) => void;
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
  onDeleteBatch: (batchId: string) => void;
  onDeleteRunConfig: (runConfigId: string) => void;
  onOpenConfigInResults: (runConfigId: string) => void;
}

type ConfirmState =
  | { kind: 'layout'; id: string; name: string }
  | { kind: 'sku'; id: string; name: string }
  | { kind: 'batch'; id: string; name: string }
  | { kind: 'config'; id: string; name: string }
  | undefined;

const dateFmt = (value: string) => new Date(value).toLocaleDateString();

export function HomePage(props: Props) {
  const [confirmState, setConfirmState] = useState<ConfirmState>();
  const { layouts, activeLayoutId, skuMasters, activeSkuMasterId, batches, runConfigs } = props;

  const confirmAction = () => {
    if (!confirmState) return;
    if (confirmState.kind === 'layout') props.onDeleteLayout(confirmState.id);
    if (confirmState.kind === 'sku') props.onDeleteSkuMaster(confirmState.id);
    if (confirmState.kind === 'batch') props.onDeleteBatch(confirmState.id);
    if (confirmState.kind === 'config') props.onDeleteRunConfig(confirmState.id);
    setConfirmState(undefined);
  };

  return <div className="home-grid">
    <section className="page home-section">
      <PalletImportPage layouts={layouts} activeLayoutId={activeLayoutId} masters={skuMasters} activeSkuMasterId={activeSkuMasterId} onSaveBatchAndAnalyze={props.onSaveBatchAndAnalyze} onSelectLayout={props.onSelectLayout} />
    </section>

    <section className="page home-section"><div className="home-section-header"><h3>Layouts guardados</h3><span>{layouts.length}</span></div>
      <LayoutList items={layouts} activeLayoutId={activeLayoutId} disableDelete={layouts.length <= 1} onOpen={props.onSelectLayout} onEdit={props.onEditLayout} onDuplicate={props.onDuplicateLayout} onRename={props.onRenameLayout} onExport={props.onExportLayout} onDelete={(id, name) => setConfirmState({ kind: 'layout', id, name })} />
    </section>

    <section className="page home-section"><div className="home-section-header"><h3>SKU Masters guardados</h3><span>{skuMasters.length}</span></div>
      <SkuMasterList items={skuMasters} activeSkuMasterId={activeSkuMasterId} onOpen={props.onOpenSkuMaster} onEdit={() => {}} onDuplicate={props.onDuplicateSkuMaster} onRename={props.onRenameSkuMaster} onExport={props.onExportSkuMaster} onDelete={(id, name) => setConfirmState({ kind: 'sku', id, name })} />
    </section>

    <section className="page home-section"><div className="home-section-header"><h3>Batches guardados</h3><span>{batches.length}</span></div>
      <ul className="home-saved-list">{batches.map((batch) => <li className="inline-row" key={batch.batchId}><div><strong>{batch.name}</strong><small>{`${batch.stats.totalPallets} pallets · ${dateFmt(batch.createdAt)}`}</small></div><div className="row-actions"><InlineIconButton icon="trash" title="Eliminar batch" onClick={() => setConfirmState({ kind: 'batch', id: batch.batchId, name: batch.name })} /></div></li>)}</ul>
    </section>

    <section className="page home-section"><div className="home-section-header"><h3>Configs guardadas</h3><span>{runConfigs.length}</span></div>
      <ul className="home-saved-list">{runConfigs.map((cfg) => <li className="inline-row" key={cfg.runConfigId}><div><strong>{cfg.name}</strong><small>{dateFmt(cfg.createdAt)}</small></div><div className="row-actions"><InlineIconButton icon="chart" title="Ver resultados" onClick={() => props.onOpenConfigInResults(cfg.runConfigId)} /><InlineIconButton icon="trash" title="Eliminar config" onClick={() => setConfirmState({ kind: 'config', id: cfg.runConfigId, name: cfg.name })} /></div></li>)}</ul>
    </section>

    <ConfirmModal open={Boolean(confirmState)} title="Confirmar eliminación" description={`Esta acción eliminará "${confirmState?.name}".`} confirmLabel="Confirmar" cancelLabel="Cancelar" onCancel={() => setConfirmState(undefined)} onConfirm={confirmAction} danger />
  </div>;
}
