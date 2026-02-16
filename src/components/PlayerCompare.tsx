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
}

function PlayerRunPane({ title, run, layout, palletId, stepIndex }: PlayerRunPaneProps) {
  const path = useMemo(() => {
    if (!run || !layout || !palletId) return [];
    return buildRunPath(layout, run, palletId);
  }, [layout, palletId, run]);

  const palletResult = useMemo(() => run?.palletResults.find((item) => item.palletId === palletId), [palletId, run]);
  const pickPlan = palletResult?.pickPlan ?? [];
  const clampedStep = Math.min(stepIndex, Math.max(path.length - 1, 0));
  const visitCounts = useMemo(() => buildVisitCounts(path, clampedStep), [clampedStep, path]);
  const isFinished = path.length > 0 && stepIndex >= path.length - 1;

  return (
    <section className="page">
      <h3>{title}</h3>
      <p>
        {run ? `${run.name}${isFinished ? ' 🏁' : ''}` : 'Sin run seleccionado'}
        {layout ? ` · Layout: ${layout.name}` : ' · Sin layout'}
      </p>
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
}: {
  runA?: RunResult;
  runB?: RunResult;
  layoutA?: Layout;
  layoutB?: Layout;
  palletId?: string;
  stepIndex: number;
}) {
  if (!runB || !layoutB) {
    return <PlayerRunPane title="Run" run={runA} layout={layoutA} palletId={palletId} stepIndex={stepIndex} />;
  }

  return (
    <div className="compare-grid-wrap">
      <PlayerRunPane title="Run A" run={runA} layout={layoutA} palletId={palletId} stepIndex={stepIndex} />
      <PlayerRunPane title="Run B" run={runB} layout={layoutB} palletId={palletId} stepIndex={stepIndex} />
    </div>
  );
}
