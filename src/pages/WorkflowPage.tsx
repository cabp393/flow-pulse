import { useEffect, useMemo, useState } from 'react';
import type { Layout, RunResult, SkuMaster } from '../models/domain';
import { buildRun, type RunBuildProgress } from '../runs/buildRun';
import { createRunBuildError, normalizeRunBuildError, runBuildErrorToClipboard, type RunBuildError } from '../runs/errors';
import { parsePalletXlsx } from '../utils/parsers';

interface Props {
  layouts: Layout[];
  activeLayoutId?: string;
  masters: SkuMaster[];
  activeSkuMasterId?: string;
  runs: RunResult[];
  onSelectLayout: (layoutId: string) => void;
  onSelectSkuMaster: (skuMasterId: string) => void;
  onCreateRun: (run: RunResult) => void;
  onOpenAssets: () => void;
  onOpenExplore: (runId?: string) => void;
  onOpenCompare: (runId: string) => void;
  onOpenPlayer: (runId: string) => void;
}

const sleepTick = async () => new Promise((resolve) => window.setTimeout(resolve, 0));

const formatProgress = (progress: RunBuildProgress): string => {
  const stageLabel = progress.stage === 'preparando' ? 'Preparando datos' : progress.stage === 'calculando' ? 'Calculando rutas' : 'Guardando run';
  return `${stageLabel} · Procesados ${progress.processed} / ${progress.total} pallets`;
};

export function WorkflowPage({
  layouts,
  activeLayoutId,
  masters,
  activeSkuMasterId,
  runs,
  onSelectLayout,
  onSelectSkuMaster,
  onCreateRun,
  onOpenAssets,
  onOpenExplore,
  onOpenCompare,
  onOpenPlayer,
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('idle');
  const [info, setInfo] = useState('');
  const [warningSummary, setWarningSummary] = useState('');
  const [error, setError] = useState<RunBuildError | undefined>();
  const [latestRunId, setLatestRunId] = useState<string>();

  const selectedLayout = useMemo(() => layouts.find((layout) => layout.layoutId === activeLayoutId), [activeLayoutId, layouts]);
  const selectedMaster = useMemo(() => masters.find((master) => master.skuMasterId === activeSkuMasterId), [activeSkuMasterId, masters]);
  const latestRun = useMemo(() => runs.find((run) => run.runId === latestRunId) ?? runs[0], [latestRunId, runs]);
  const recentRuns = runs.slice(0, 5);
  const missingSkuCount = useMemo(
    () => latestRun?.palletResults.reduce((acc, item) => acc + (item.missingSkuCount ?? 0), 0) ?? 0,
    [latestRun],
  );

  useEffect(() => {
    if (!latestRunId && runs[0]) setLatestRunId(runs[0].runId);
  }, [latestRunId, runs]);

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

  const runGeneration = async () => {
    let stage = 'init';
    if (!selectedLayout) {
      setError(createRunBuildError('validation', 'Debe seleccionar un layout válido.', ['Seleccione un layout antes de generar.']));
      return;
    }
    if (!selectedMaster) {
      setError(createRunBuildError('validation', 'Debe seleccionar SKU Master.', ['Seleccione un SKU Master antes de generar.']));
      return;
    }
    if (!(selectedFile instanceof File)) {
      setError(createRunBuildError('validation', 'Debe cargar XLSX válido.', ['Adjunte un archivo XLSX antes de generar.']));
      return;
    }

    setError(undefined);
    setWarningSummary('');
    setInfo('');
    setIsRunning(true);

    try {
      stage = 'leyendo xlsx';
      setProgress('Leyendo XLSX…');
      await sleepTick();
      const lines = await parsePalletXlsx(selectedFile);
      if (!lines.length) {
        throw createRunBuildError('validation', 'El XLSX no contiene líneas para procesar.', undefined, { stage: 'leyendo xlsx' });
      }

      stage = 'calculando';
      setProgress('Preparando datos…');
      await sleepTick();

      const { run, warnings } = await buildRun(selectedLayout, selectedMaster, lines, selectedFile.name, {
        onProgress: (nextProgress) => setProgress(formatProgress(nextProgress)),
      });

      stage = 'guardando';
      setProgress(`Guardando run · Procesados ${run.summary.totalPallets} / ${run.summary.totalPallets} pallets`);
      await sleepTick();

      onCreateRun(run);
      setLatestRunId(run.runId);
      setInfo(`Run generada: ${run.name}`);
      if (warnings.palletsWithIssues > 0 || warnings.missingSkuMappings > 0) {
        setWarningSummary(`Modo compacto/ultra activo: ${warnings.palletsWithIssues} pallets con errores, ${warnings.missingSkuMappings} SKUs sin mapping.`);
      }
      setProgress('success');
    } catch (cause) {
      const normalized = normalizeRunBuildError(cause, 'No se pudo completar la generación de la run.', { stage });
      setError(normalized);
      setProgress('failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="page">
      <h2>Workflow</h2>

      <section>
        <h3>1) Seleccionar Assets</h3>
        <div className="toolbar">
          <label>
            Layout
            <select value={activeLayoutId ?? ''} onChange={(event) => onSelectLayout(event.target.value)}>
              <option value="">--</option>
              {layouts.map((layout) => <option key={layout.layoutId} value={layout.layoutId}>{layout.name}</option>)}
            </select>
          </label>
          <button type="button" onClick={onOpenAssets}>Gestionar</button>
          <label>
            SKU Master
            <select value={activeSkuMasterId ?? ''} onChange={(event) => onSelectSkuMaster(event.target.value)}>
              <option value="">--</option>
              {masters.map((master) => <option key={master.skuMasterId} value={master.skuMasterId}>{master.name}</option>)}
            </select>
          </label>
          <button type="button" onClick={onOpenAssets}>Gestionar</button>
          <span className={`status-badge ${selectedLayout && selectedMaster ? '' : 'pending'}`}>
            {selectedLayout && selectedMaster ? 'Assets listos' : 'Faltan assets'}
          </span>
        </div>
      </section>

      <section>
        <h3>2) Cargar batch (XLSX)</h3>
        <div className="toolbar">
          <input
            type="file"
            accept=".xlsx"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setSelectedFile(file);
              setInfo(file ? `Archivo listo: ${file.name}` : '');
              setError(undefined);
            }}
          />
          <button disabled={!selectedLayout || !selectedMaster || !selectedFile || isRunning} onClick={() => void runGeneration()}>
            🚀 {isRunning ? 'Generando…' : 'Generar Run'}
          </button>
          {!!selectedFile && <small>{selectedFile.name}</small>}
        </div>
        {isRunning && <p className="run-progress"><span className="spinner" aria-hidden="true" /> {progress}</p>}
        {!!warningSummary && <p className="toast-success">{warningSummary}</p>}
        {!!info && <p>{info}</p>}
      </section>

      <section>
        <h3>3) Resultados inmediatos</h3>
        {!latestRun && <p>Aún no hay runs generadas.</p>}
        {latestRun && (
          <>
            <p>
              {latestRun.name} · pallets {latestRun.summary.totalPallets} · steps {latestRun.summary.totalSteps} · avg {latestRun.summary.avgSteps.toFixed(2)} ·
              {' '}missing SKUs {missingSkuCount} · error pallets {latestRun.summary.errorPallets}
            </p>
            <div className="toolbar">
              <button onClick={() => onOpenExplore(latestRun.runId)}>Ver en Explore</button>
              <button onClick={() => onOpenPlayer(latestRun.runId)}>Abrir Player</button>
              <button onClick={() => onOpenCompare(latestRun.runId)}>Comparar</button>
            </div>
          </>
        )}

        <h3>Runs recientes</h3>
        <ul className="home-saved-list">
          {recentRuns.map((run) => (
            <li key={run.runId} className="inline-row">
              <div>
                <strong>{run.name}</strong>
                <small>{run.summary.totalPallets} pallets · {new Date(run.createdAt).toLocaleDateString()}</small>
              </div>
              <div className="row-actions">
                <button onClick={() => onOpenExplore(run.runId)}>Explore</button>
                <button onClick={() => onOpenPlayer(run.runId)}>Player</button>
                <button onClick={() => onOpenCompare(run.runId)}>Compare</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal confirm-modal">
            <h3>Falló al generar la run</h3>
            <p>{error.message}</p>
            <p><strong>Etapa:</strong> {error.context?.stage ?? 'desconocida'}</p>
            {error.details?.length ? <ul className="validation-list">{error.details.map((item) => <li key={item}>{item}</li>)}</ul> : null}
            <div className="modal-actions">
              <button onClick={() => setError(undefined)}>Cerrar</button>
              <button onClick={() => void copyErrorDetails()}>Copiar diagnóstico</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
