import { useRef, useState, type ChangeEvent } from 'react';
import type { Batch, Layout } from '../models/domain';
import { ConfirmModal } from '../components/ConfirmModal';

interface Props {
  layouts: Layout[];
  batches: Batch[];
  onResetStorage: () => void;
  onImportLayout: (payload: string) => { ok: boolean; message: string };
  onImportSkuMasterCsv: (payload: string, layoutId?: string) => { ok: boolean; message: string };
  onExportBatchJson: (batchId: string) => void;
  onImportBatchJson: (payload: string) => { ok: boolean; message: string };
}

type ConfirmKind = 'reset' | undefined;

export function AdvancedPage({ layouts, batches, onResetStorage, onImportLayout, onImportSkuMasterCsv, onExportBatchJson, onImportBatchJson }: Props) {
  const [confirmState, setConfirmState] = useState<ConfirmKind>();
  const [validationLayoutId, setValidationLayoutId] = useState(layouts[0]?.layoutId ?? '');
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.batchId ?? '');
  const [status, setStatus] = useState('');
  const layoutInputRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const onImportFile = (event: ChangeEvent<HTMLInputElement>, handler: (payload: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handler(typeof reader.result === 'string' ? reader.result : '');
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  return <div className="page advanced-page"><h2>Avanzado</h2><ul className="advanced-actions">
    <li><div><strong>Importar Layout</strong></div><div className="toolbar"><button onClick={() => layoutInputRef.current?.click()}>Importar JSON</button><input ref={layoutInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(event) => onImportFile(event, (payload) => setStatus(onImportLayout(payload).message))} /></div></li>
    <li><div><strong>Importar SKU Master (CSV)</strong></div><div className="toolbar"><select value={validationLayoutId} onChange={(e) => setValidationLayoutId(e.target.value)}><option value="">Sin validar contra layout</option>{layouts.map((layout) => <option key={layout.layoutId} value={layout.layoutId}>{layout.name}</option>)}</select><button onClick={() => skuInputRef.current?.click()}>Importar CSV</button><input ref={skuInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(event) => onImportFile(event, (payload) => setStatus(onImportSkuMasterCsv(payload, validationLayoutId || undefined).message))} /></div></li>
    <li><div><strong>Exportar Batch (JSON)</strong></div><div className="toolbar"><select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}><option value="">Seleccionar batch</option>{batches.map((batch) => <option key={batch.batchId} value={batch.batchId}>{batch.name}</option>)}</select><button disabled={!selectedBatchId} onClick={() => onExportBatchJson(selectedBatchId)}>Exportar Batch</button></div></li>
    <li><div><strong>Importar Batch (JSON)</strong></div><div className="toolbar"><button onClick={() => batchInputRef.current?.click()}>Importar Batch</button><input ref={batchInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(event) => onImportFile(event, (payload) => setStatus(onImportBatchJson(payload).message))} /></div></li>
    <li><div><strong>Reset completo localStorage</strong></div><button className="danger" onClick={() => setConfirmState('reset')}>Reset completo</button></li>
  </ul>
  {status && <p className="toast-success">{status}</p>}
  <ConfirmModal open={Boolean(confirmState)} title="Confirmar acción" description="Se borrarán todos los datos persistidos." onCancel={() => setConfirmState(undefined)} onConfirm={() => { onResetStorage(); setStatus('localStorage reiniciado.'); setConfirmState(undefined); }} danger />
  </div>;
}
