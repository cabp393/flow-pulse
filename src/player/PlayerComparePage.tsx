import { useEffect, useMemo } from 'react';
import { PlayerCompare } from '../components/PlayerCompare';
import type { Layout, PlayerComparePreferences, RunResult } from '../models/domain';
import { usePlayerEngine } from './usePlayerEngine';

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
  const runA = useMemo(() => runs.find((r) => r.runId === prefs.runAId), [prefs.runAId, runs]);
  const runB = useMemo(() => runs.find((r) => r.runId === prefs.runBId), [prefs.runBId, runs]);
  const compatible = !runA || !runB || runA.layoutId === runB.layoutId;
  const layout = layouts.find((item) => item.layoutId === (runA?.layoutId ?? runB?.layoutId));

  const palletCount = Math.max(runA?.palletOrder.length ?? 0, runB?.palletOrder.length ?? 0);
  const currentPalletId = runA?.palletOrder[prefs.palletIndex] ?? runB?.palletOrder[prefs.palletIndex];
  const stepsA = runA?.palletResults.find((item) => item.palletId === currentPalletId)?.steps ?? 0;
  const stepsB = runB?.palletResults.find((item) => item.palletId === currentPalletId)?.steps ?? 0;
  const maxStep = Math.max(stepsA, stepsB, 0);

  const engine = usePlayerEngine({
    maxStep,
    maxPallet: Math.max(0, palletCount - 1),
    initialPalletIndex: prefs.palletIndex,
    initialSpeedMs: prefs.speedMs,
    autoContinue: prefs.autoContinue,
  });

  useEffect(() => {
    engine.setPalletIndex(prefs.palletIndex);
  }, [prefs.palletIndex]);

  useEffect(() => {
    engine.setSpeedMs(prefs.speedMs);
  }, [prefs.speedMs]);

  useEffect(() => {
    engine.setMaxStep(maxStep);
  }, [maxStep]);

  useEffect(() => {
    if (engine.state.palletIndex !== prefs.palletIndex) {
      onChangePrefs({ ...prefs, palletIndex: engine.state.palletIndex });
    }
  }, [engine.state.palletIndex, onChangePrefs, prefs]);

  const missingRun = Boolean((prefs.runAId && !runA) || (prefs.runBId && !runB));

  return (
    <div className="page">
      <h2>Player comparativo</h2>
      <div className="compare-grid-wrap">
        <label>Run A<select value={prefs.runAId ?? ''} onChange={(e) => onChangePrefs({ ...prefs, runAId: e.target.value || undefined, palletIndex: 0 })}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
        <label>Run B<select value={prefs.runBId ?? ''} onChange={(e) => onChangePrefs({ ...prefs, runBId: e.target.value || undefined, palletIndex: 0 })}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
      </div>
      {missingRun && <p className="error">Run inexistente.</p>}
      {!layout && (runA || runB) && <p className="error">Layout inexistente.</p>}
      {!compatible && <p className="error">Los runs deben compartir layoutId para reproducir.</p>}
      {((runA && !runA.palletOrder.length) || (runB && !runB.palletOrder.length)) && <p className="error">palletOrder vacío.</p>}
      <div className="player-controls">
        <button disabled={!compatible || !layout || missingRun} onClick={engine.play}>Play</button>
        <button onClick={engine.pause}>Pause</button>
        <button onClick={engine.stop}>Stop</button>
        <button onClick={engine.prevPallet}>Prev pallet</button>
        <button onClick={engine.nextPallet}>Next pallet</button>
        <button onClick={engine.prevStep}>Prev step</button>
        <button onClick={engine.nextStep}>Next step</button>
        <label>Velocidad(ms)<input type="number" value={prefs.speedMs} min={40} onChange={(e) => onChangePrefs({ ...prefs, speedMs: Number(e.target.value) || 250 })} /></label>
        <label><input type="checkbox" checked={prefs.autoContinue} onChange={(e) => onChangePrefs({ ...prefs, autoContinue: e.target.checked })} /> autoContinue</label>
      </div>
      <p>Pallet: {engine.state.palletIndex + 1}/{Math.max(palletCount, 1)} · Step: {engine.state.stepIndex}</p>
      {layout && <PlayerCompare layout={layout} runA={runA} runB={runB} palletIndex={engine.state.palletIndex} stepIndex={engine.state.stepIndex} />}
    </div>
  );
}
