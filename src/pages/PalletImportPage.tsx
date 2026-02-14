import { useMemo, useState } from 'react';
import type { Layout, RunResult, SkuMaster } from '../models/domain';
import { buildRun } from '../runs/buildRun';
import { createRunBuildError, normalizeRunBuildError, runBuildErrorToClipboard, type RunBuildError } from '../runs/errors';
import { parsePalletXlsx } from '../utils/parsers';

interface Props {
  layouts: Layout[];
  activeLayoutId?: string;
  masters: SkuMaster[];
  activeSkuMasterId?: string;
  onGeneratedRun: (run: RunResult) => void;
  onSelectLayout: (layoutId: string) => void;
  onOpenResults: () => void;
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
      <path d="M4.5 16.5c-1.5 1.26-2 4.5-2 4.5s3.24-.5 4.5-2c.71-.84.7-2.08-.02-2.8-.72-.72-1.96-.73-2.8-.02Z" />
      <path d="m12 15-3-3a36.8 36.8 0 0 1 6.55-9.58 2.12 2.12 0 0 1 3 3A36.8 36.8 0 0 1 9 12" />
      <path d="M9 12H5a2 2 0 0 0-2 2v4" />
      <path d="M12 15v4a2 2 0 0 0 2 2h4" />
      <circle cx="16.5" cy="7.5" r="1.5" />
    </svg>
  );
}

const sleepTick = async () => new Promise((resolve) => window.setTimeout(resolve, 0));

export function PalletImportPage({ layouts, activeLayoutId, masters, activeSkuMasterId, onGeneratedRun, onSelectLayout, onOpenResults }: Props) {
  const [selectedMasterId, setSelectedMasterId] = useState<string>(activeSkuMasterId ?? '');
  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const [info, setInfo] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('idle');
  const [error, setError] = useState<RunBuildError | undefined>();
  const [warningSummary, setWarningSummary] = useState<string>('');

  const selectedMaster = useMemo(() => masters.find((master) => master.skuMasterId === selectedMasterId), [masters, selectedMasterId]);
  const selectedLayout = useMemo(() => layouts.find((layout) => layout.layoutId === activeLayoutId), [activeLayoutId, layouts]);

  const copyErrorDetails = async () => {
    if (!error) return;
    const payload = runBuildErrorToClipboard(error);
    try {
      await navigator.clipboard.writeText(payload);
      setInfo('Detalles copiados al portapapeles.');
    } catch {
      setInfo('No se pudo copiar al portapapeles.');
    }
  };

  const runGeneration = async () => {
    let stage = 'init';
    if (!selectedLayout) return setInfo('Debe seleccionar un layout válido.');
    if (!selectedMaster) return setInfo('Debe seleccionar SKU Master.');
    if (!selectedFile) return setInfo('Debe cargar XLSX válido.');

    setError(undefined);
    setWarningSummary('');
    setInfo('');
    setIsRunning(true);

    try {
      stage = 'Leyendo XLSX…';
      setProgress(stage);
      await sleepTick();
      const lines = await parsePalletXlsx(selectedFile);

      stage = 'Validando…';
      setProgress(stage);
      await sleepTick();
      if (!lines.length) {
        throw createRunBuildError('validation', 'El XLSX no contiene líneas para procesar.');
      }

      stage = 'Calculando rutas…';
      setProgress(stage);
      await sleepTick();
      if (import.meta.env.DEV) {
        console.debug('[run-builder] stage=calculando-rutas', { pallets: new Set(lines.map((line) => line.pallet_id)).size, lines: lines.length });
      }
      const { run, warnings } = buildRun(selectedLayout, selectedMaster, lines, selectedFile.name);

      stage = 'Guardando…';
      setProgress(stage);
      await sleepTick();
      onGeneratedRun(run);

      setInfo(`Run generado: ${run.name}`);
      if (warnings.palletsWithIssues > 0 || warnings.missingSkuMappings > 0) {
        setWarningSummary(`Run generada con advertencias: ${warnings.palletsWithIssues} pallets con errores, ${warnings.missingSkuMappings} SKUs sin mapping.`);
      }
      if (import.meta.env.DEV) {
        console.debug('[run-builder] stage=success', { runId: run.runId, warnings });
      }
      setProgress('success');
    } catch (cause) {
      const normalized = normalizeRunBuildError(cause, 'No se pudo completar la generación de la run.', { stage });
      setError(normalized);
      setProgress('failed');
      if (import.meta.env.DEV) {
        console.error('[run-builder] stage=failed', cause);
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      <h2>Run Builder</h2>
      <label>Layout<select value={activeLayoutId ?? ''} onChange={(e) => onSelectLayout(e.target.value)}><option value="">--</option>{layouts.map((layout) => <option key={layout.layoutId} value={layout.layoutId}>{layout.name}</option>)}</select></label>
      <label>SKU Master<select value={selectedMasterId} onChange={(e) => setSelectedMasterId(e.target.value)}><option value="">--</option>{masters.map((master) => <option key={master.skuMasterId} value={master.skuMasterId}>{master.name}</option>)}</select></label>
      <input type="file" accept=".xlsx" onChange={(e) => {
        const file = e.target.files?.[0];
        setSelectedFile(file);
        setWarningSummary('');
        setError(undefined);
        setInfo(file ? `Archivo listo: ${file.name}` : '');
      }} />
      <button
        className="btn-with-icon"
        disabled={!selectedLayout || !selectedMaster || !selectedFile || isRunning}
        onClick={() => {
          void runGeneration();
        }}
      >
        <RocketIcon />
        <span>{isRunning ? 'Generando…' : 'Generar Run'}</span>
      </button>
      {isRunning && <p className="run-progress"><span className="spinner" aria-hidden="true" /> {progress}</p>}
      {warningSummary && (
        <p className="toast-success">
          {warningSummary} <button onClick={onOpenResults}>Ver detalle en Heatmap/Run</button>
        </p>
      )}
      {info && <p>{info}</p>}

      {error && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal confirm-modal">
            <h3>No se pudo generar la run</h3>
            <p>{error.message}</p>
            {error.details?.length ? <ul className="validation-list">{error.details.map((item) => <li key={item}>{item}</li>)}</ul> : null}
            <div className="modal-actions">
              <button onClick={() => setError(undefined)}>Cerrar</button>
              <button onClick={() => void copyErrorDetails()}>Copiar detalles</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
