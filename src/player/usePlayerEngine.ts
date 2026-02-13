import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type EngineStatus = 'playing' | 'paused' | 'stopped' | 'finished';

interface Options {
  maxStep: number;
  maxPallet: number;
  initialPalletIndex: number;
  initialSpeedMs: number;
  autoContinue: boolean;
}

interface EngineState {
  palletIndex: number;
  stepIndex: number;
  speedMs: number;
  status: EngineStatus;
}

export interface PlayerEngine {
  state: EngineState;
  setSpeedMs: (speed: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextPallet: () => void;
  prevPallet: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setPalletIndex: (next: number) => void;
  setMaxStep: (next: number) => void;
}

const clamp = (value: number, max: number): number => Math.max(0, Math.min(value, Math.max(0, max)));

export function usePlayerEngine({ maxStep, maxPallet, initialPalletIndex, initialSpeedMs, autoContinue }: Options): PlayerEngine {
  const [state, setState] = useState<EngineState>({
    palletIndex: clamp(initialPalletIndex, maxPallet),
    stepIndex: 0,
    speedMs: Math.max(40, initialSpeedMs),
    status: 'stopped',
  });

  const frameRef = useRef<number>();
  const lastRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const mutableRef = useRef({ maxStep, maxPallet, autoContinue, speedMs: state.speedMs });

  const resetTimingRefs = useCallback(() => {
    lastRef.current = 0;
    elapsedRef.current = 0;
  }, []);

  useEffect(() => {
    mutableRef.current = { ...mutableRef.current, maxStep, maxPallet, autoContinue, speedMs: state.speedMs };
  }, [autoContinue, maxPallet, maxStep, state.speedMs]);

  const tick = useCallback((timestamp: number) => {
    frameRef.current = window.requestAnimationFrame(tick);
    if (lastRef.current === 0) lastRef.current = timestamp;
    const delta = timestamp - lastRef.current;
    lastRef.current = timestamp;

    setState((prev) => {
      if (prev.status !== 'playing') return prev;
      const { speedMs, maxStep: currentMaxStep, maxPallet: currentMaxPallet, autoContinue: continueNext } = mutableRef.current;
      elapsedRef.current += delta;
      if (elapsedRef.current < speedMs) return prev;
      elapsedRef.current = 0;

      if (prev.stepIndex < currentMaxStep) {
        return { ...prev, stepIndex: prev.stepIndex + 1 };
      }

      if (continueNext && prev.palletIndex < currentMaxPallet) {
        return { ...prev, palletIndex: prev.palletIndex + 1, stepIndex: 0 };
      }

      return { ...prev, status: 'finished' };
    });
  }, []);

  useEffect(() => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [tick]);

  const api = useMemo<PlayerEngine>(() => ({
    state,
    setSpeedMs: (speed) => setState((prev) => ({ ...prev, speedMs: Math.max(40, Math.floor(speed)) })),
    play: () => {
      resetTimingRefs();
      setState((prev) => ({ ...prev, status: 'playing' }));
    },
    pause: () => setState((prev) => ({ ...prev, status: 'paused' })),
    stop: () => {
      resetTimingRefs();
      setState((prev) => ({ ...prev, status: 'stopped', stepIndex: 0 }));
    },
    nextPallet: () => {
      resetTimingRefs();
      setState((prev) => ({ ...prev, palletIndex: clamp(prev.palletIndex + 1, mutableRef.current.maxPallet), stepIndex: 0 }));
    },
    prevPallet: () => {
      resetTimingRefs();
      setState((prev) => ({ ...prev, palletIndex: clamp(prev.palletIndex - 1, mutableRef.current.maxPallet), stepIndex: 0 }));
    },
    nextStep: () => setState((prev) => ({ ...prev, stepIndex: clamp(prev.stepIndex + 1, mutableRef.current.maxStep) })),
    prevStep: () => setState((prev) => ({ ...prev, stepIndex: clamp(prev.stepIndex - 1, mutableRef.current.maxStep) })),
    setPalletIndex: (next) => {
      resetTimingRefs();
      setState((prev) => ({ ...prev, palletIndex: clamp(next, mutableRef.current.maxPallet), stepIndex: 0, status: 'stopped' }));
    },
    setMaxStep: (next) => setState((prev) => ({ ...prev, stepIndex: clamp(prev.stepIndex, next) })),
  }), [resetTimingRefs, state]);

  return api;
}
