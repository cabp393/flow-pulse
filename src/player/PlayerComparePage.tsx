import { useEffect, useMemo, useRef, useState } from 'react';
import { PlayerCompare } from '../components/PlayerCompare';
import type { Layout, PlayerComparePreferences, RunResult } from '../models/domain';
import { PalletSelector } from './PalletSelector';
import { buildRunPath, hasSamePalletList } from './playerCompareUtils';

const MIN_SPEED_MS = 40;

type PlaybackStatus = 'stopped' | 'playing' | 'paused' | 'finished';
type AdvanceReason = 'manual' | 'auto';

const buildPlayablePalletSet = (
  palletOrder: string[],
  pathAByPallet: Record<string, number>,
  pathBByPallet: Record<string, number>,
): Set<string> => {
  const set = new Set<string>();
  palletOrder.forEach((palletId) => {
    if ((pathAByPallet[palletId] ?? 0) > 0 || (pathBByPallet[palletId] ?? 0) > 0) set.add(palletId);
  });
  return set;
};

const buildSelectablePalletOrder = (runA?: RunResult, runB?: RunResult): string[] => {
  const base = runA?.palletOrder ?? [];
  const fallback = runB?.palletOrder ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  [...base, ...fallback].forEach((palletId) => {
    if (seen.has(palletId)) return;
    seen.add(palletId);
    result.push(palletId);
  });
  return result;
};

const findNextPlayableIndex = (startIndex: number, palletOrder: string[], playable: Set<string>): number | undefined => {
  for (let index = startIndex; index < palletOrder.length; index += 1) {
    if (playable.has(palletOrder[index])) return index;
  }
  return undefined;
};

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

  const statusRef = useRef(status);
  const prefsRef = useRef(prefs);
  const lastAdvanceReasonRef = useRef<AdvanceReason>('manual');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const runA = useMemo(() => runs.find((run) => run.runId === prefs.runAId), [prefs.runAId, runs]);
  const runB = useMemo(() => runs.find((run) => run.runId === prefs.runBId), [prefs.runBId, runs]);
  const layoutA = useMemo(() => layouts.find((layout) => layout.layoutId === runA?.layoutId), [layouts, runA?.layoutId]);
  const layoutB = useMemo(() => layouts.find((layout) => layout.layoutId === runB?.layoutId), [layouts, runB?.layoutId]);

  const samePalletList = hasSamePalletList(runA, runB);
  const canPlay = Boolean(runA && runB && layoutA && layoutB && samePalletList);

  const palletOrder = useMemo(() => buildSelectablePalletOrder(runA, runB), [runA, runB]);
  const palletCount = palletOrder.length;
  const safePalletIndex = Math.max(0, Math.min(prefs.palletIndex, Math.max(palletCount - 1, 0)));
  const activePalletId = palletOrder[safePalletIndex];

  const pathAByPallet = useMemo(() => {
    const lengths: Record<string, number> = {};
    if (!runA || !layoutA) return lengths;
    palletOrder.forEach((palletId) => {
      lengths[palletId] = buildRunPath(layoutA, runA, palletId).length;
    });
    return lengths;
  }, [layoutA, palletOrder, runA]);

  const pathBByPallet = useMemo(() => {
    const lengths: Record<string, number> = {};
    if (!runB || !layoutB) return lengths;
    palletOrder.forEach((palletId) => {
      lengths[palletId] = buildRunPath(layoutB, runB, palletId).length;
    });
    return lengths;
  }, [layoutB, palletOrder, runB]);

  const playablePallets = useMemo(() => buildPlayablePalletSet(palletOrder, pathAByPallet, pathBByPallet), [palletOrder, pathAByPallet, pathBByPallet]);

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
    const reason = lastAdvanceReasonRef.current;
    setStepIndex(0);
    if (reason === 'manual') {
      setStatus('paused');
    }
    lastAdvanceReasonRef.current = 'manual';
  }, [prefs.runAId, prefs.runBId, prefs.palletIndex]);

  useEffect(() => {
    if (status !== 'playing' || !canPlay) return;
    if (palletCount === 0) {
      setStatus('stopped');
      return;
    }

    const interval = window.setInterval(() => {
      if (statusRef.current !== 'playing') return;
      setStepIndex((currentStep) => {
        if (currentStep < maxStep) return currentStep + 1;

        const currentPrefs = prefsRef.current;
        if (!currentPrefs.autoContinue) {
          setStatus('finished');
          return currentStep;
        }

        const currentIndex = Math.max(0, Math.min(currentPrefs.palletIndex, Math.max(palletCount - 1, 0)));
        const nextIndex = findNextPlayableIndex(currentIndex + 1, palletOrder, playablePallets);
        if (nextIndex !== undefined) {
          lastAdvanceReasonRef.current = 'auto';
          onChangePrefs({ ...currentPrefs, palletIndex: nextIndex });
          return 0;
        }

        setStatus('finished');
        return currentStep;
      });
    }, Math.max(MIN_SPEED_MS, prefs.speedMs));

    return () => window.clearInterval(interval);
  }, [canPlay, maxStep, onChangePrefs, palletCount, palletOrder, playablePallets, prefs.speedMs, status]);

  const selectPalletByIndex = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(nextIndex, Math.max(palletCount - 1, 0)));
    lastAdvanceReasonRef.current = 'manual';
    onChangePrefs({ ...prefs, palletIndex: clamped });
    setStepIndex(0);
    setStatus('paused');
  };

  const selectPalletById = (palletId: string) => {
    const nextIndex = palletOrder.indexOf(palletId);
    if (nextIndex < 0) return;
    selectPalletByIndex(nextIndex);
  };

  const nextStep = () => setStepIndex((current) => Math.min(current + 1, maxStep));
  const prevStep = () => setStepIndex((current) => Math.max(current - 1, 0));

  return (
    <div className="player-page">
      <section className="card compare-toolbar">
        <label>Run A<select value={prefs.runAId ?? ''} onChange={(event) => { lastAdvanceReasonRef.current = 'manual'; onChangePrefs({ ...prefs, runAId: event.target.value || undefined, palletIndex: 0 }); }}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
        <label>Run B<select value={prefs.runBId ?? ''} onChange={(event) => { lastAdvanceReasonRef.current = 'manual'; onChangePrefs({ ...prefs, runBId: event.target.value || undefined, palletIndex: 0 }); }}><option value="">--</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.name}</option>)}</select></label>
      </section>
      {!samePalletList && <p className="error">No se puede reproducir: ambos runs deben tener el mismo palletOrder.</p>}
      {(runA && !layoutA) || (runB && !layoutB) ? <p className="error">No se encontró el layout de uno de los runs seleccionados.</p> : null}

      <section className="card player-controls">
        <button disabled={!canPlay || palletCount === 0} onClick={() => setStatus('playing')}>Play</button>
        <button onClick={() => setStatus('paused')}>Pause</button>
        <button onClick={() => { setStatus('stopped'); setStepIndex(0); }}>Stop</button>
        <PalletSelector palletOrder={palletOrder} palletIndex={safePalletIndex} disabled={!palletCount} onChange={selectPalletById} />
        <button disabled={!palletCount} onClick={() => selectPalletByIndex(safePalletIndex - 1)}>Prev pallet</button>
        <button disabled={!palletCount} onClick={() => selectPalletByIndex(safePalletIndex + 1)}>Next pallet</button>
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
      </section>

      <p className="player-status">
        Estado: {status} · Pallet {palletCount ? safePalletIndex + 1 : 0}/{Math.max(palletCount, 1)} · ID: {activePalletId ?? '-'} · Step {stepIndex}/{maxStep}
      </p>

      <section className="card">
      <PlayerCompare runA={runA} runB={runB} layoutA={layoutA} layoutB={layoutB} palletId={activePalletId} stepIndex={stepIndex} />
      </section>
    </div>
  );
}
