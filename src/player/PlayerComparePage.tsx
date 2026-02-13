import { useEffect, useMemo, useState } from 'react';
import { PlayerCompare } from '../components/PlayerCompare';
import type { Layout, PlayerComparePreferences, RunResult } from '../models/domain';
import { hashLayout } from '../utils/layout';

export function PlayerComparePage({
  layout,
  runs,
  prefs,
  onChangePrefs,
}: {
  layout: Layout;
  runs: RunResult[];
  prefs: PlayerComparePreferences;
  onChangePrefs: (prefs: PlayerComparePreferences) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const runA = useMemo(() => runs.find((r) => r.runId === prefs.runAId), [prefs.runAId, runs]);
  const runB = useMemo(() => runs.find((r) => r.runId === prefs.runBId), [prefs.runBId, runs]);

  const compatible = !runA || !runB || runA.layoutVersionId === runB.layoutVersionId;
  const currentLayoutHash = hashLayout(layout);
  const layoutWarning = [runA, runB].filter(Boolean).some((run) => run!.layoutHash !== currentLayoutHash);

  const palletCount = Math.max(runA?.palletOrder.length ?? 0, runB?.palletOrder.length ?? 0);
  const currentPalletId = runA?.palletOrder[prefs.palletIndex] ?? runB?.palletOrder[prefs.palletIndex];
  const stepsA = runA?.palletResults.find((item) => item.palletId === currentPalletId)?.steps ?? 0;
  const stepsB = runB?.palletResults.find((item) => item.palletId === currentPalletId)?.steps ?? 0;
  const maxSteps = Math.max(stepsA, stepsB, 1);

  useEffect(() => {
    if (status !== 'playing' || !compatible) return;
    if (stepIndex >= maxSteps - 1) {
      if (prefs.autoContinue && prefs.palletIndex < palletCount - 1) {
        setStepIndex(0);
        onChangePrefs({ ...prefs, palletIndex: prefs.palletIndex + 1 });
      } else {
        setStatus('paused');
      }
      return;
    }
    const timer = window.setTimeout(() => setStepIndex((s) => s + 1), prefs.speedMs);
    return () => window.clearTimeout(timer);
  }, [compatible, maxSteps, onChangePrefs, palletCount, prefs, status, stepIndex]);

  return (
    <div className="page">
      <h2>Player comparativo</h2>
      <div className="compare-grid-wrap">
        <label>Run A<select value={prefs.runAId ?? ''} onChange={(e) => onChangePrefs({ ...prefs, runAId: e.target.value || undefined })}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
        <label>Run B<select value={prefs.runBId ?? ''} onChange={(e) => onChangePrefs({ ...prefs, runBId: e.target.value || undefined })}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
      </div>
      {!compatible && <p className="error">Los runs deben compartir layoutVersionId para reproducir.</p>}
      {layoutWarning && <p className="error">Advertencia: el layout actual cambió respecto al hash del run.</p>}
      <div className="player-controls">
        <button disabled={!compatible} onClick={() => setStatus('playing')}>Play</button>
        <button onClick={() => setStatus('paused')}>Pause</button>
        <button onClick={() => { setStatus('idle'); setStepIndex(0); }}>Stop</button>
        <button onClick={() => { setStepIndex(0); onChangePrefs({ ...prefs, palletIndex: Math.max(0, Math.min(palletCount - 1, prefs.palletIndex - 1)) }); }}>Prev pallet</button>
        <button onClick={() => { setStepIndex(0); onChangePrefs({ ...prefs, palletIndex: Math.max(0, Math.min(palletCount - 1, prefs.palletIndex + 1)) }); }}>Next pallet</button>
        <label>Velocidad(ms)<input type="number" value={prefs.speedMs} min={40} onChange={(e) => onChangePrefs({ ...prefs, speedMs: Number(e.target.value) || 250 })} /></label>
        <label><input type="checkbox" checked={prefs.autoContinue} onChange={(e) => onChangePrefs({ ...prefs, autoContinue: e.target.checked })} /> autoContinue</label>
      </div>
      <p>Pallet: {prefs.palletIndex + 1}/{Math.max(palletCount, 1)} · Step: {stepIndex}</p>
      <PlayerCompare layout={layout} runA={runA} runB={runB} palletIndex={prefs.palletIndex} stepIndex={stepIndex} />
    </div>
  );
}
