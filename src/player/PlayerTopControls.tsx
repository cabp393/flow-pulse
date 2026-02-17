import type { ReactNode } from 'react';
import { PalletSelector } from './PalletSelector';

interface PlayerTopControlsProps {
  palletIndex: number;
  palletTotal: number;
  palletOrder: string[];
  canPlay: boolean;
  playing: boolean;
  paused: boolean;
  stepIndex: number;
  maxStep: number;
  onSelectPallet: (palletId: string) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrevPallet: () => void;
  onNextPallet: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  autoContinue: boolean;
  setAutoContinue: (nextValue: boolean) => void;
  speedMs: number;
  setSpeedMs: (nextValue: number) => void;
  minSpeedMs: number;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export function PlayerTopControls({
  palletIndex,
  palletTotal,
  palletOrder,
  canPlay,
  playing,
  paused,
  stepIndex,
  maxStep,
  onSelectPallet,
  onPlay,
  onPause,
  onStop,
  onPrevPallet,
  onNextPallet,
  onPrevStep,
  onNextStep,
  autoContinue,
  setAutoContinue,
  speedMs,
  setSpeedMs,
  minSpeedMs,
}: PlayerTopControlsProps) {
  return (
    <div className="player-top-controls" role="toolbar" aria-label="Controles del player comparativo">
      <div className="player-top-section">
        <PalletSelector
          palletOrder={palletOrder}
          palletIndex={palletIndex}
          disabled={palletTotal === 0}
          onChange={onSelectPallet}
        />
        <small>{`(${palletTotal ? palletIndex + 1 : 0}/${Math.max(palletTotal, 1)})`}</small>
      </div>

      <div className="player-top-section">
        <button type="button" className="icon-btn" title="Play" disabled={!canPlay || palletTotal === 0} onClick={onPlay}>
          <Icon><polygon points="8 5 19 12 8 19 8 5" /></Icon>
        </button>
        <button type="button" className="icon-btn" title="Pause" disabled={paused} onClick={onPause}>
          <Icon><line x1="9" y1="5" x2="9" y2="19" /><line x1="15" y1="5" x2="15" y2="19" /></Icon>
        </button>
        <button type="button" className="icon-btn" title="Stop" disabled={!playing && stepIndex === 0} onClick={onStop}>
          <Icon><rect x="6" y="6" width="12" height="12" /></Icon>
        </button>
        <button type="button" className="icon-btn" title="Pallet anterior" disabled={palletTotal === 0 || palletIndex <= 0} onClick={onPrevPallet}>
          <Icon><line x1="18" y1="6" x2="18" y2="18" /><polyline points="14 17 9 12 14 7" /><polyline points="10 17 5 12 10 7" /></Icon>
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Pallet siguiente"
          disabled={palletTotal === 0 || palletIndex >= palletTotal - 1}
          onClick={onNextPallet}
        >
          <Icon><line x1="6" y1="6" x2="6" y2="18" /><polyline points="10 7 15 12 10 17" /><polyline points="14 7 19 12 14 17" /></Icon>
        </button>
        <button type="button" className="icon-btn" title="Paso anterior" disabled={stepIndex <= 0} onClick={onPrevStep}>
          <Icon><polyline points="15 18 9 12 15 6" /></Icon>
        </button>
        <button type="button" className="icon-btn" title="Paso siguiente" disabled={stepIndex >= maxStep} onClick={onNextStep}>
          <Icon><polyline points="9 18 15 12 9 6" /></Icon>
        </button>
      </div>

      <div className="player-top-section">
        <label className="player-compact-field">
          <input type="checkbox" checked={autoContinue} onChange={(event) => setAutoContinue(event.target.checked)} />
          Auto
        </label>
        <label className="player-compact-field">
          ms
          <input
            className="player-speed-input"
            type="number"
            min={minSpeedMs}
            value={speedMs}
            onChange={(event) => setSpeedMs(Math.max(minSpeedMs, Number(event.target.value) || minSpeedMs))}
          />
        </label>
      </div>
    </div>
  );
}
