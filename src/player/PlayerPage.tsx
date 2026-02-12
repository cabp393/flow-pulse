import { useEffect, useMemo, useState } from 'react';
import type { Layout, PlayerPreferences, RunResult } from '../models/domain';
import { hashLayout } from '../utils/layout';
import { GridCanvas } from '../ui/GridCanvas';
import { SPEED_PRESETS, speedLabel, uniqueCoords } from './renderHelpers';
import { usePlayerEngine } from './usePlayerEngine';

interface Props {
  layout: Layout;
  run?: RunResult;
  savedPreferences: PlayerPreferences;
  onPreferencesChange: (prefs: PlayerPreferences) => void;
  preselectedPalletId?: string;
}

export function PlayerPage({ layout, run, savedPreferences, onPreferencesChange, preselectedPalletId }: Props) {
  const [zoom, setZoom] = useState(24);
  const [autoContinue, setAutoContinue] = useState(savedPreferences.autoContinue);
  const [followCamera, setFollowCamera] = useState(savedPreferences.followCamera);

  const initialPalletIndex = useMemo(() => {
    if (!run?.pallets.length) return 0;
    if (preselectedPalletId) {
      const fromQuery = run.pallets.findIndex((p) => p.palletId === preselectedPalletId);
      if (fromQuery >= 0) return fromQuery;
    }
    return Math.min(savedPreferences.palletIndex, run.pallets.length - 1);
  }, [preselectedPalletId, run?.pallets, savedPreferences.palletIndex]);

  const engine = usePlayerEngine({
    pallets: run?.pallets ?? [],
    initialPalletIndex,
    initialSpeedMs: savedPreferences.speedMs,
    autoContinue,
  });

  const currentCoord = engine.state.currentPath[engine.state.stepIndex] ?? engine.state.currentPath[0];
  const selectedStops = useMemo(() => uniqueCoords(engine.state.currentPallet?.stopDetails.map((s) => s.accessCell) ?? []), [engine.state.currentPallet]);

  const visitedStopCount = useMemo(() => {
    if (!engine.state.currentPath.length) return 0;
    const visitedSet = new Set(
      engine.state.currentPath.slice(0, engine.state.stepIndex + 1).map((coord) => `${coord.x},${coord.y}`),
    );
    return selectedStops.filter((stop) => visitedSet.has(`${stop.x},${stop.y}`)).length;
  }, [engine.state.currentPath, engine.state.stepIndex, selectedStops]);

  useEffect(() => {
    onPreferencesChange({
      runId: run?.runId,
      palletIndex: engine.state.palletIndex,
      speedMs: engine.state.speedMs,
      autoContinue,
      followCamera,
    });
  }, [autoContinue, engine.state.palletIndex, engine.state.speedMs, followCamera, onPreferencesChange, run?.runId]);

  const layoutMismatch = Boolean(run && run.layoutHash && run.layoutHash !== hashLayout(layout));

  if (!run) {
    return <div className="page">No hay run disponible. Genera resultados y luego vuelve al player.</div>;
  }

  return (
    <div className="page">
      <h2>Player / Playback</h2>
      {layoutMismatch && (
        <p className="error">Advertencia: el layout actual no coincide con el layout usado al generar este run.</p>
      )}
      <div className="player-controls">
        <button type="button" onClick={engine.play}>
          Play
        </button>
        <button type="button" onClick={engine.pause}>
          Pause
        </button>
        <button type="button" onClick={engine.stop}>
          Stop
        </button>
        <button type="button" onClick={engine.prevPallet}>
          Prev Pallet
        </button>
        <button type="button" onClick={engine.nextPallet}>
          Next Pallet
        </button>

        <label>
          Pallet
          <select value={engine.state.currentPallet?.palletId ?? ''} onChange={(e) => engine.setPalletIndex(run.pallets.findIndex((p) => p.palletId === e.target.value))}>
            {run.pallets.map((p) => (
              <option key={p.palletId} value={p.palletId}>
                {p.palletId}
              </option>
            ))}
          </select>
        </label>

        <label>
          Velocidad
          <select value={engine.state.speedMs} onChange={(e) => engine.setSpeedMs(Number(e.target.value))}>
            {SPEED_PRESETS.map((speed) => (
              <option key={speed} value={speed}>
                {speedLabel(speed)} ({speed} ms/paso)
              </option>
            ))}
          </select>
        </label>

        <label className="player-toggle">
          <input type="checkbox" checked={autoContinue} onChange={(e) => setAutoContinue(e.target.checked)} /> auto continuar
        </label>

        <label className="player-toggle">
          <input type="checkbox" checked={followCamera} onChange={(e) => setFollowCamera(e.target.checked)} /> seguir cámara
        </label>
      </div>

      <div className="player-indicators">
        <span>Estado: {engine.state.status}</span>
        <span>
          Pallet: {engine.state.palletIndex + 1}/{run.pallets.length} ({engine.state.currentPallet?.palletId ?? 'n/a'})
        </span>
        <span>
          Paso: {engine.state.currentPath.length ? engine.state.stepIndex + 1 : 0}/{engine.state.currentPath.length}
        </span>
        <span>Stops visitados: {visitedStopCount}/{selectedStops.length}</span>
        <span>Tiempo estimado: {Math.round((engine.state.currentPath.length * engine.state.speedMs) / 1000)}s</span>
      </div>

      {engine.state.missingPath && <p className="error">Este pallet no tiene path calculado. Usa Next/Prev o auto-continue para saltarlo.</p>}

      <div>
        <button type="button" onClick={() => setZoom((z) => Math.max(16, z - 4))}>
          -
        </button>
        <button type="button" onClick={() => setZoom((z) => Math.min(60, z + 4))}>
          +
        </button>
      </div>

      <GridCanvas
        layout={layout}
        zoom={zoom}
        selectedTool="AISLE"
        onPaint={() => undefined}
        onSelect={() => undefined}
        path={engine.state.currentPath}
        pickAccessCells={selectedStops}
        pickerPosition={currentCoord}
        followCamera={followCamera}
      />
    </div>
  );
}
