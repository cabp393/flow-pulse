import { useMemo } from 'react';
import type { Layout, RunResult } from '../models/domain';
import { buildRunPath, buildVisitCounts } from '../player/playerCompareUtils';
import { PickProgressPanel } from '../player/PickProgressPanel';
import { GridCanvas } from '../ui/GridCanvas';

interface PlayerRunPaneProps {
  title: string;
  run?: RunResult;
  layout?: Layout;
  palletId?: string;
  stepIndex: number;
  runId?: string;
  runOptions: RunResult[];
  onSelectRun: (runId?: string) => void;
}

function PlayerRunPane({
  title,
  run,
  layout,
  palletId,
  stepIndex,
  runId,
  runOptions,
  onSelectRun,
}: PlayerRunPaneProps) {
  const path = useMemo(() => {
    if (!run || !layout || !palletId) return [];
    return buildRunPath(layout, run, palletId);
  }, [layout, palletId, run]);

  const palletResult = useMemo(() => run?.palletResults.find((item) => item.palletId === palletId), [palletId, run]);
  const pickPlan = palletResult?.pickPlan ?? [];
  const clampedStep = Math.min(stepIndex, Math.max(path.length - 1, 0));
  const visitCounts = useMemo(() => buildVisitCounts(path, clampedStep), [clampedStep, path]);

  return (
    <section className="page">
      <div className="player-pane-header">
        <label>
          {title}
          <select value={runId ?? ''} onChange={(event) => onSelectRun(event.target.value || undefined)}>
            <option value="">--</option>
            {runOptions.map((option) => (
              <option key={option.runId} value={option.runId}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        {layout ? <small>{layout.name}</small> : <small>Sin layout</small>}
      </div>
      {layout && (
        <GridCanvas
          layout={layout}
          zoom={16}
          selectedTool="AISLE"
          onPaint={() => undefined}
          onSelect={() => undefined}
          pickerPosition={path[clampedStep]}
          visitCounts={visitCounts}
          followCamera
        />
      )}
      <PickProgressPanel
        path={path}
        stepIndex={clampedStep}
        pickPlan={pickPlan}
        hasPath={Boolean(path.length)}
      />
    </section>
  );
}

export function PlayerCompare({
  runA,
  runB,
  layoutA,
  layoutB,
  palletId,
  stepIndex,
  runs,
  runAId,
  runBId,
  onSelectRunA,
  onSelectRunB,
}: {
  runA?: RunResult;
  runB?: RunResult;
  layoutA?: Layout;
  layoutB?: Layout;
  palletId?: string;
  stepIndex: number;
  runs: RunResult[];
  runAId?: string;
  runBId?: string;
  onSelectRunA: (runId?: string) => void;
  onSelectRunB: (runId?: string) => void;
}) {
  return (
    <div className="compare-grid-wrap">
      <PlayerRunPane
        title="Run A"
        run={runA}
        layout={layoutA}
        palletId={palletId}
        stepIndex={stepIndex}
        runOptions={runs}
        runId={runAId}
        onSelectRun={onSelectRunA}
      />
      <PlayerRunPane
        title="Run B"
        run={runB}
        layout={layoutB}
        palletId={palletId}
        stepIndex={stepIndex}
        runOptions={runs}
        runId={runBId}
        onSelectRun={onSelectRunB}
      />
    </div>
  );
}
