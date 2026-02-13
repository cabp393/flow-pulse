import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { Layout, SkuMaster } from '../models/domain';
import { ConfirmModal } from '../components/ConfirmModal';

interface Props {
  layouts: Layout[];
  skuMasters: SkuMaster[];
  onResetStorage: () => void;
  onClearOldRuns: () => void;
  onExportLayout: (layoutId: string) => void;
  onImportLayout: (payload: string) => { ok: boolean; message: string };
  onExportSkuMasterCsv: (skuMasterId: string) => void;
  onImportSkuMasterCsv: (payload: string, layoutId?: string) => { ok: boolean; message: string };
}

type ConfirmKind = 'reset' | 'clear-runs' | undefined;

export function AdvancedPage({
  layouts,
  skuMasters,
  onResetStorage,
  onClearOldRuns,
  onExportLayout,
  onImportLayout,
  onExportSkuMasterCsv,
  onImportSkuMasterCsv,
}: Props) {
  const [confirmState, setConfirmState] = useState<ConfirmKind>();
  const [selectedLayoutId, setSelectedLayoutId] = useState(layouts[0]?.layoutId ?? '');
  const [selectedSkuMasterId, setSelectedSkuMasterId] = useState(skuMasters[0]?.skuMasterId ?? '');
  const [validationLayoutId, setValidationLayoutId] = useState(layouts[0]?.layoutId ?? '');
  const [status, setStatus] = useState('');
  const layoutInputRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);

  const selectedLayoutName = useMemo(
    () => layouts.find((layout) => layout.layoutId === selectedLayoutId)?.name,
    [layouts, selectedLayoutId],
  );

  const onImportFile = (event: ChangeEvent<HTMLInputElement>, handler: (payload: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const payload = typeof reader.result === 'string' ? reader.result : '';
      handler(payload);
      event.target.value = '';
    };
    reader.onerror = () => {
      setStatus('No se pudo leer el archivo seleccionado.');
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="page advanced-page">
      <h2>Avanzado</h2>
      <ul className="advanced-actions">
        <li>
          <div>
            <strong>Exportar Layout</strong>
            <small>Descarga un JSON completo del layout seleccionado.</small>
          </div>
          <div className="toolbar">
            <select value={selectedLayoutId} onChange={(e) => setSelectedLayoutId(e.target.value)}>
              <option value="">Seleccionar layout</option>
              {layouts.map((layout) => <option key={layout.layoutId} value={layout.layoutId}>{layout.name}</option>)}
            </select>
            <button disabled={!selectedLayoutId} onClick={() => {
              onExportLayout(selectedLayoutId);
              if (selectedLayoutName) setStatus(`Layout "${selectedLayoutName}" exportado.`);
            }}>Exportar JSON</button>
          </div>
        </li>

        <li>
          <div>
            <strong>Importar Layout</strong>
            <small>Importa un JSON de layout y evita colisiones de id/nombre.</small>
          </div>
          <div className="toolbar">
            <button onClick={() => layoutInputRef.current?.click()}>Importar JSON</button>
            <input ref={layoutInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(event) => onImportFile(event, (payload) => {
              const result = onImportLayout(payload);
              setStatus(result.message);
            })} />
          </div>
        </li>

        <li>
          <div>
            <strong>Exportar SKU Master</strong>
            <small>Descarga CSV con columnas ubicacion,secuencia,sku.</small>
          </div>
          <div className="toolbar">
            <select value={selectedSkuMasterId} onChange={(e) => setSelectedSkuMasterId(e.target.value)}>
              <option value="">Seleccionar SKU master</option>
              {skuMasters.map((master) => <option key={master.skuMasterId} value={master.skuMasterId}>{master.name}</option>)}
            </select>
            <button disabled={!selectedSkuMasterId} onClick={() => {
              onExportSkuMasterCsv(selectedSkuMasterId);
              setStatus('SKU master exportado en CSV.');
            }}>Exportar CSV</button>
          </div>
        </li>

        <li>
          <div>
            <strong>Importar SKU Master (CSV)</strong>
            <small>Valida formato, secuencia numérica y ubicaciones con layout opcional.</small>
          </div>
          <div className="toolbar">
            <select value={validationLayoutId} onChange={(e) => setValidationLayoutId(e.target.value)}>
              <option value="">Sin validar contra layout</option>
              {layouts.map((layout) => <option key={layout.layoutId} value={layout.layoutId}>{layout.name}</option>)}
            </select>
            <button onClick={() => skuInputRef.current?.click()}>Importar CSV</button>
            <input ref={skuInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(event) => onImportFile(event, (payload) => {
              const result = onImportSkuMasterCsv(payload, validationLayoutId || undefined);
              setStatus(result.message);
            })} />
          </div>
        </li>

        <li>
          <div>
            <strong>Limpiar runs antiguos</strong>
            <small>Elimina runs persistidos y conserva layouts/SKU masters.</small>
          </div>
          <button onClick={() => setConfirmState('clear-runs')}>Limpiar runs antiguos</button>
        </li>

        <li>
          <div>
            <strong>Reset completo localStorage</strong>
            <small>Acción destructiva: borra layouts, SKU masters y runs.</small>
          </div>
          <button className="danger" onClick={() => setConfirmState('reset')}>Reset completo</button>
        </li>
      </ul>

      {status && <p className="toast-success">{status}</p>}

      <ConfirmModal
        open={Boolean(confirmState)}
        title="Confirmar acción"
        description={confirmState === 'reset' ? 'Se borrarán todos los datos persistidos.' : 'Se eliminarán los runs antiguos guardados.'}
        onCancel={() => setConfirmState(undefined)}
        onConfirm={() => {
          if (confirmState === 'reset') {
            onResetStorage();
            setStatus('localStorage reiniciado.');
          }
          if (confirmState === 'clear-runs') {
            onClearOldRuns();
            setStatus('Runs antiguos eliminados.');
          }
          setConfirmState(undefined);
        }}
        danger
      />
    </div>
  );
}
