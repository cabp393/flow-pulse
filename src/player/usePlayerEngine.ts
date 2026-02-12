import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Coord, RunPalletResult } from '../models/domain';

type EngineStatus = 'playing' | 'paused' | 'stopped' | 'finished';

interface Options {
  pallets: RunPalletResult[];
  initialPalletIndex: number;
  initialSpeedMs: number;
  autoContinue: boolean;
}

interface EngineState {
  palletIndex: number;
  stepIndex: number;
  speedMs: number;
  status: EngineStatus;
  currentPath: Coord[];
  currentPallet?: RunPalletResult;
  missingPath: boolean;
}

export interface PlayerEngine {
  state: EngineState;
  setSpeedMs: (speed: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextPallet: () => void;
  prevPallet: () => void;
  setPalletIndex: (next: number) => void;
}

const clampIndex = (index: number, size: number): number => {
  if (size <= 0) return 0;
  return Math.min(Math.max(0, index), size - 1);
};

export function usePlayerEngine({ pallets, initialPalletIndex, initialSpeedMs, autoContinue }: Options): PlayerEngine {
  const [palletIndex, setPalletIndexState] = useState(() => clampIndex(initialPalletIndex, pallets.length));
  const [stepIndex, setStepIndex] = useState(0);
  const [speedMs, setSpeedMs] = useState(Math.max(40, initialSpeedMs));
  const [status, setStatus] = useState<EngineStatus>('stopped');

  const rafRef = useRef<number | null>(null);
  const speedRef = useRef(speedMs);
  const statusRef = useRef(status);
  const autoContinueRef = useRef(autoContinue);
  const frameElapsedRef = useRef(0);
  const frameLastTsRef = useRef<number | null>(null);

  useEffect(() => {
    autoContinueRef.current = autoContinue;
  }, [autoContinue]);

  useEffect(() => {
    speedRef.current = speedMs;
  }, [speedMs]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    setPalletIndexState((prev) => clampIndex(prev, pallets.length));
  }, [pallets.length]);

  const setPalletIndex = useCallback(
    (next: number) => {
      setPalletIndexState(clampIndex(next, pallets.length));
      setStepIndex(0);
      setStatus('stopped');
    },
    [pallets.length],
  );

  const currentPallet = pallets[palletIndex];
  const currentPath = currentPallet?.visited ?? [];
  const missingPath = !currentPath.length;

  const movePallet = useCallback(
    (direction: -1 | 1): boolean => {
      if (!pallets.length) return false;
      const next = clampIndex(palletIndex + direction, pallets.length);
      if (next === palletIndex) return false;
      setPalletIndexState(next);
      setStepIndex(0);
      return true;
    },
    [palletIndex, pallets.length],
  );

  const animate = useCallback(
    (ts: number) => {
      if (statusRef.current !== 'playing') {
        frameLastTsRef.current = null;
        frameElapsedRef.current = 0;
        return;
      }

      const lastTs = frameLastTsRef.current ?? ts;
      frameLastTsRef.current = ts;
      frameElapsedRef.current += ts - lastTs;

      const pathLen = currentPath.length;
      if (pathLen <= 1) {
        if (autoContinueRef.current && palletIndex < pallets.length - 1) {
          setPalletIndexState((idx) => clampIndex(idx + 1, pallets.length));
          setStepIndex(0);
          frameElapsedRef.current = 0;
          frameLastTsRef.current = ts;
        } else {
          setStatus('finished');
        }
        return;
      }

      let consumedSteps = 0;
      const interval = speedRef.current;
      while (frameElapsedRef.current >= interval) {
        frameElapsedRef.current -= interval;
        consumedSteps += 1;
      }

      if (!consumedSteps) return;

      setStepIndex((prev) => {
        const tentative = prev + consumedSteps;
        if (tentative < pathLen - 1) return tentative;

        if (autoContinueRef.current && palletIndex < pallets.length - 1) {
          setPalletIndexState((idx) => clampIndex(idx + 1, pallets.length));
          frameElapsedRef.current = 0;
          frameLastTsRef.current = ts;
          return 0;
        }

        setStatus(autoContinueRef.current ? 'finished' : 'paused');
        return pathLen - 1;
      });
    },
    [currentPath.length, palletIndex, pallets.length],
  );

  useEffect(() => {
    const loop = (ts: number) => {
      animate(ts);
      rafRef.current = window.requestAnimationFrame(loop);
    };

    rafRef.current = window.requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [animate]);

  useEffect(() => {
    setStepIndex(0);
    if (statusRef.current === 'finished') setStatus('stopped');
  }, [palletIndex]);

  const controls = useMemo(
    () => ({
      setSpeedMs: (speed: number) => setSpeedMs(Math.max(40, Math.floor(speed))),
      play: () => {
        if (!pallets.length) return;
        setStatus('playing');
      },
      pause: () => setStatus('paused'),
      stop: () => {
        setStatus('stopped');
        setStepIndex(0);
        frameElapsedRef.current = 0;
      },
      nextPallet: () => {
        const changed = movePallet(1);
        if (!changed) setStatus('finished');
      },
      prevPallet: () => {
        movePallet(-1);
      },
      setPalletIndex,
    }),
    [movePallet, pallets.length, setPalletIndex],
  );

  return {
    state: {
      palletIndex,
      stepIndex,
      speedMs,
      status,
      currentPath,
      currentPallet,
      missingPath,
    },
    ...controls,
  };
}
