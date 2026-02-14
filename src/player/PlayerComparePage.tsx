import { useEffect, useMemo, useState } from 'react';
import { PlayerCompare } from '../components/PlayerCompare';
import type { Layout, PlayerComparePreferences, RunResult } from '../models/domain';
import { buildRunPath, hasSamePalletList } from './playerCompareUtils';

const MIN_SPEED_MS = 40;

type PlaybackStatus = 'stopped' | 'playing' | 'paused' | 'finished';

export function PlayerComparePage({
  layouts,
  runs,
  prefs,
  onChangePrefs,
}: {
  layouts: Layout[];
  runs: RunResult[];
  prefs: PlayerComparePreferences;
  onChangePrefs: (prefs: PlayerComparePreferences) => void;
}) {
  const [status, setStatus] = useState<PlaybackStatus>('stopped');
  const [stepIndex, setStepIndex] = useState(0);

  const runA = useMemo(() => runs.find((run) => run.runId === prefs.runAId), [prefs.runAId, runs]);
  const runB = useMemo(() => runs.find((run) => run.runId === prefs.runBId), [prefs.runBId, runs]);
  const layoutA = useMemo(() => layouts.find((layout) => layout.layoutId === runA?.layoutId), [layouts, runA?.layoutId]);
  const layoutB = useMemo(() => layouts.find((layout) => layout.layoutId === runB?.layoutId), [layouts, runB?.layoutId]);

  const samePalletList = hasSamePalletList(runA, runB);
  const canPlay = Boolean(runA && runB && layoutA && layoutB && samePalletList);

  const palletOrder = runA?.palletOrder ?? runB?.palletOrder ?? [];
  const palletCount = palletOrder.length;
  const safePalletIndex = Math.max(0, Math.min(prefs.palletIndex, Math.max(palletCount - 1, 0)));
  const activePalletId = palletOrder[safePalletIndex];

  const pathA = useMemo(() => {
    if (!runA || !layoutA || !activePalletId) return [];
    return buildRunPath(layoutA, runA, activePalletId);
  }, [activePalletId, layoutA, runA]);

  const pathB = useMemo(() => {
    if (!runB || !layoutB || !activePalletId) return [];
    return buildRunPath(layoutB, runB, activePalletId);
  }, [activePalletId, layoutB, runB]);

  const maxStep = Math.max(pathA.length - 1, pathB.length - 1, 0);

  useEffect(() => {
    if (prefs.palletIndex !== safePalletIndex) {
      onChangePrefs({ ...prefs, palletIndex: safePalletIndex });
    }
  }, [onChangePrefs, prefs, safePalletIndex]);

  useEffect(() => {
    setStepIndex((current) => Math.min(current, maxStep));
  }, [maxStep]);


  useEffect(() => {
    setStepIndex(0);
    setStatus('paused');
  }, [prefs.runAId, prefs.runBId, prefs.palletIndex]);


  useEffect(() => {
    if (status !== 'playing' || !canPlay) return;

    const interval = window.setInterval(() => {
      setStepIndex((currentStep) => {
        if (currentStep < maxStep) return currentStep + 1;

        if (prefs.autoContinue && safePalletIndex < palletCount - 1) {
          onChangePrefs({ ...prefs, palletIndex: safePalletIndex + 1 });
          return 0;
        }

        setStatus('finished');
        return currentStep;
      });
    }, Math.max(MIN_SPEED_MS, prefs.speedMs));

    return () => window.clearInterval(interval);
  }, [canPlay, maxStep, onChangePrefs, palletCount, prefs, safePalletIndex, status]);

  const selectPallet = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(nextIndex, Math.max(palletCount - 1, 0)));
    onChangePrefs({ ...prefs, palletIndex: clamped });
    setStepIndex(0);
    setStatus('stopped');
  };

  const nextStep = () => setStepIndex((current) => Math.min(current + 1, maxStep));
  const prevStep = () => setStepIndex((current) => Math.max(current - 1, 0));

  return (
    <div className="page">
      <h2>Player comparativo de runs</h2>
      <p>Compara runs con layouts/SKU masters diferentes, siempre que usen el mismo listado de pallets.</p>
      <div className="compare-grid-wrap">
        <label>Run A<select value={prefs.runAId ?? ''} onChange={(event) => onChangePrefs({ ...prefs, runAId: event.target.value || undefined, palletIndex: 0 })}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
        <label>Run B<select value={prefs.runBId ?? ''} onChange={(event) => onChangePrefs({ ...prefs, runBId: event.target.value || undefined, palletIndex: 0 })}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
      </div>

      {!samePalletList && <p className="error">No se puede reproducir: ambos runs deben tener el mismo palletOrder.</p>}
      {(runA && !layoutA) || (runB && !layoutB) ? <p className="error">No se encontró el layout de uno de los runs seleccionados.</p> : null}

      <div className="player-controls">
        <button disabled={!canPlay} onClick={() => setStatus('playing')}>Play</button>
        <button onClick={() => setStatus('paused')}>Pause</button>
        <button onClick={() => { setStatus('stopped'); setStepIndex(0); }}>Stop</button>
        <button disabled={!palletCount} onClick={() => selectPallet(safePalletIndex - 1)}>Prev pallet</button>
        <button disabled={!palletCount} onClick={() => selectPallet(safePalletIndex + 1)}>Next pallet</button>
        <button onClick={prevStep}>Prev step</button>
        <button onClick={nextStep}>Next step</button>
        <label>
          Velocidad (ms)
          <input
            type="number"
            min={MIN_SPEED_MS}
            value={prefs.speedMs}
            onChange={(event) => onChangePrefs({ ...prefs, speedMs: Math.max(MIN_SPEED_MS, Number(event.target.value) || MIN_SPEED_MS) })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={prefs.autoContinue}
            onChange={(event) => onChangePrefs({ ...prefs, autoContinue: event.target.checked })}
          />
          Auto-continuar pallet
        </label>
      </div>

      <p>
        Estado: {status} · Pallet {palletCount ? safePalletIndex + 1 : 0}/{Math.max(palletCount, 1)} · ID: {activePalletId ?? '-'} · Step {stepIndex}/{maxStep}
      </p>

      <PlayerCompare runA={runA} runB={runB} layoutA={layoutA} layoutB={layoutB} palletId={activePalletId} stepIndex={stepIndex} />
    </div>
  );
}
