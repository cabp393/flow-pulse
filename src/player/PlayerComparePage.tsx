import { useEffect, useMemo, useRef, useState } from 'react';
import { PlayerCompare } from '../components/PlayerCompare';
import type { Batch, Layout, PlayerComparePreferences, RunConfig, RunResult, SkuMaster } from '../models/domain';
import { PalletSelector } from './PalletSelector';
import { buildRunPath, hasSamePalletList } from './playerCompareUtils';
import { buildRunFromConfig } from '../runs/runSession';

const MIN_SPEED_MS = 40;
type PlaybackStatus = 'stopped' | 'playing' | 'paused' | 'finished';

export function PlayerComparePage({ layouts, batches, masters, runConfigs, prefs, onChangePrefs }: { layouts: Layout[]; batches: Batch[]; masters: SkuMaster[]; runConfigs: RunConfig[]; prefs: PlayerComparePreferences; onChangePrefs: (prefs: PlayerComparePreferences) => void; }) {
  const [status, setStatus] = useState<PlaybackStatus>('stopped');
  const [stepIndex, setStepIndex] = useState(0);
  const [runA, setRunA] = useState<RunResult>();
  const [runB, setRunB] = useState<RunResult>();
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  const configA = useMemo(() => runConfigs.find((run) => run.runConfigId === prefs.runAId), [prefs.runAId, runConfigs]);
  const configB = useMemo(() => runConfigs.find((run) => run.runConfigId === prefs.runBId), [prefs.runBId, runConfigs]);

  const requestedPalletId = useMemo(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const queryFromHash = hash.split('?')[1];
    const params = new URLSearchParams(queryFromHash || window.location.search);
    return params.get('pallet') || undefined;
  }, []);

  useEffect(() => { const resolve = async () => {
    if (!configA) return setRunA(undefined);
    const layout = layouts.find((item) => item.layoutId === configA.layoutId);
    const master = masters.find((item) => item.skuMasterId === configA.skuMasterId);
    const batch = batches.find((item) => item.batchId === configA.batchId);
    if (!layout || !master || !batch) return setRunA(undefined);
    setRunA(await buildRunFromConfig(configA, layout, master, batch));
  }; void resolve(); }, [batches, configA, layouts, masters]);

  useEffect(() => { const resolve = async () => {
    if (!configB) return setRunB(undefined);
    const layout = layouts.find((item) => item.layoutId === configB.layoutId);
    const master = masters.find((item) => item.skuMasterId === configB.skuMasterId);
    const batch = batches.find((item) => item.batchId === configB.batchId);
    if (!layout || !master || !batch) return setRunB(undefined);
    setRunB(await buildRunFromConfig(configB, layout, master, batch));
  }; void resolve(); }, [batches, configB, layouts, masters]);

  const layoutA = useMemo(() => layouts.find((layout) => layout.layoutId === runA?.layoutId), [layouts, runA?.layoutId]);
  const layoutB = useMemo(() => layouts.find((layout) => layout.layoutId === runB?.layoutId), [layouts, runB?.layoutId]);
  const samePalletList = hasSamePalletList(runA, runB);
  const canPlay = Boolean(runA && runB && layoutA && layoutB && samePalletList);

  const palletOrder = useMemo(() => runA?.palletOrder ?? runB?.palletOrder ?? [], [runA?.palletOrder, runB?.palletOrder]);
  useEffect(() => {
    if (!requestedPalletId || !palletOrder.length) return;
    const nextIndex = palletOrder.indexOf(requestedPalletId);
    if (nextIndex < 0 || nextIndex === prefs.palletIndex) return;
    onChangePrefs({ ...prefs, palletIndex: nextIndex });
  }, [onChangePrefs, palletOrder, prefs, requestedPalletId]);
  const safePalletIndex = Math.max(0, Math.min(prefs.palletIndex, Math.max(palletOrder.length - 1, 0)));
  const activePalletId = palletOrder[safePalletIndex];
  const pathA = useMemo(() => (!runA || !layoutA || !activePalletId ? [] : buildRunPath(layoutA, runA, activePalletId)), [activePalletId, layoutA, runA]);
  const pathB = useMemo(() => (!runB || !layoutB || !activePalletId ? [] : buildRunPath(layoutB, runB, activePalletId)), [activePalletId, layoutB, runB]);
  const maxStep = Math.max(pathA.length - 1, pathB.length - 1, 0);

  useEffect(() => { setStepIndex((current) => Math.min(current, maxStep)); }, [maxStep]);

  useEffect(() => {
    if (status !== 'playing' || !canPlay) return;
    const interval = window.setInterval(() => {
      if (statusRef.current !== 'playing') return;
      setStepIndex((current) => (current < maxStep ? current + 1 : current));
    }, Math.max(MIN_SPEED_MS, prefs.speedMs));
    return () => window.clearInterval(interval);
  }, [canPlay, maxStep, prefs.speedMs, status]);

  return <div className="page"><h2>Player comparativo (configs)</h2>
    <div className="compare-grid-wrap">
      <label>Config A<select value={prefs.runAId ?? ''} onChange={(event) => onChangePrefs({ ...prefs, runAId: event.target.value || undefined, palletIndex: 0 })}><option value="">--</option>{runConfigs.map((run) => <option key={run.runConfigId} value={run.runConfigId}>{run.name}</option>)}</select></label>
      <label>Config B<select value={prefs.runBId ?? ''} onChange={(event) => onChangePrefs({ ...prefs, runBId: event.target.value || undefined, palletIndex: 0 })}><option value="">--</option>{runConfigs.map((run) => <option key={run.runConfigId} value={run.runConfigId}>{run.name}</option>)}</select></label>
    </div>
    <div className="player-controls"><button disabled={!canPlay} onClick={() => setStatus('playing')}>Play</button><button onClick={() => setStatus('paused')}>Pause</button><PalletSelector palletOrder={palletOrder} palletIndex={safePalletIndex} disabled={!palletOrder.length} onChange={(palletId) => onChangePrefs({ ...prefs, palletIndex: Math.max(0, palletOrder.indexOf(palletId)) })} /></div>
    <p>Estado: {status} · Pallet ID: {activePalletId ?? '-'} · Step {stepIndex}/{maxStep}</p>
    <PlayerCompare runA={runA} runB={runB} layoutA={layoutA} layoutB={layoutB} palletId={activePalletId} stepIndex={stepIndex} />
  </div>;
}
