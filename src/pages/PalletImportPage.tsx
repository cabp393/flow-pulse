import { useMemo, useState } from 'react';
import type { Batch, Layout, SkuMaster } from '../models/domain';
import { createRunBuildError, normalizeRunBuildError, runBuildErrorToClipboard, type RunBuildError } from '../runs/errors';
import { parsePalletXlsx } from '../utils/parsers';
import { serializeBatch } from '../storage/batchRepo';

interface Props {
  layouts: Layout[];
  activeLayoutId?: string;
  masters: SkuMaster[];
  activeSkuMasterId?: string;
  onSaveBatchAndAnalyze: (payload: { batch: Batch; layoutId: string; skuMasterId: string }) => void;
  onSelectLayout: (layoutId: string) => void;
}

function RocketIcon() { return <span aria-hidden="true">🚀</span>; }

export function PalletImportPage({ layouts, activeLayoutId, masters, activeSkuMasterId, onSaveBatchAndAnalyze, onSelectLayout }: Props) {
  const [selectedMasterId, setSelectedMasterId] = useState<string>(activeSkuMasterId ?? '');
  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const [info, setInfo] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<RunBuildError | undefined>();

  const selectedMaster = useMemo(() => masters.find((master) => master.skuMasterId === selectedMasterId), [masters, selectedMasterId]);
  const selectedLayout = useMemo(() => layouts.find((layout) => layout.layoutId === activeLayoutId), [activeLayoutId, layouts]);

  const copyErrorDetails = async () => {
    if (!error) return;
    const payload = runBuildErrorToClipboard(error);
    try {
      await navigator.clipboard.writeText(payload);
      setInfo('Diagnóstico copiado al portapapeles.');
    } catch {
      setInfo('No se pudo copiar al portapapeles.');
    }
  };

  const analyze = async () => {
    if (!selectedLayout) {
      setError(createRunBuildError('validation', 'Debe seleccionar un layout válido.'));
      return;
    }
    if (!selectedMaster) {
      setError(createRunBuildError('validation', 'Debe seleccionar SKU Master.'));
      return;
    }
    if (!(selectedFile instanceof File)) {
      setError(createRunBuildError('validation', 'Debe cargar XLSX válido.'));
      return;
    }

    setError(undefined);
    setInfo('');
    setIsRunning(true);

    try {
      const lines = await parsePalletXlsx(selectedFile);
      if (!lines.length) throw createRunBuildError('validation', 'El XLSX no contiene líneas para procesar.');
      const batch = serializeBatch(lines, selectedFile.name);
      onSaveBatchAndAnalyze({ batch, layoutId: selectedLayout.layoutId, skuMasterId: selectedMaster.skuMasterId });
      setInfo(`Batch guardado: ${batch.name} (${batch.stats.totalPallets} pallets)`);
    } catch (cause) {
      setError(normalizeRunBuildError(cause, 'No se pudo preparar el batch para análisis.'));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      <h2>Batch Builder</h2>
      <label>Layout<select value={activeLayoutId ?? ''} onChange={(e) => onSelectLayout(e.target.value)}><option value="">--</option>{layouts.map((layout) => <option key={layout.layoutId} value={layout.layoutId}>{layout.name}</option>)}</select></label>
      <label>SKU Master<select value={selectedMasterId} onChange={(e) => setSelectedMasterId(e.target.value)}><option value="">--</option>{masters.map((master) => <option key={master.skuMasterId} value={master.skuMasterId}>{master.name}</option>)}</select></label>
      <input type="file" accept=".xlsx" onChange={(e) => setSelectedFile(e.target.files?.[0])} />
      <button className="btn-with-icon" disabled={!selectedLayout || !selectedMaster || !selectedFile || isRunning} onClick={() => { void analyze(); }}>
        <RocketIcon />
        <span>{isRunning ? 'Analizando…' : 'Analizar'}</span>
      </button>
      {info && <p>{info}</p>}
      {error && <div className="error">{error.message} <button onClick={() => void copyErrorDetails()}>Copiar diagnóstico</button></div>}
    </div>
  );
}
