import { useMemo } from 'react';
import type { Layout, RunResult } from '../models/domain';
import { GridCanvas } from '../ui/GridCanvas';
import { maxHeatValue, normalizeHeatmap } from '../utils/compareUtils';

export function HeatmapSideBySide({ layout, runA, runB, sharedScale }: { layout: Layout; runA?: RunResult; runB?: RunResult; sharedScale: boolean }) {
  const maxA = maxHeatValue(runA);
  const maxB = maxHeatValue(runB);
  const target = Math.max(maxA, maxB);

  const heatA = useMemo(() => {
    if (!runA) return undefined;
    return sharedScale ? normalizeHeatmap(runA.heatmapSteps, maxA, target) : runA.heatmapSteps;
  }, [maxA, runA, sharedScale, target]);

  const heatB = useMemo(() => {
    if (!runB) return undefined;
    return sharedScale ? normalizeHeatmap(runB.heatmapSteps, maxB, target) : runB.heatmapSteps;
  }, [maxB, runB, sharedScale, target]);

  return (
    <div className="compare-grid-wrap">
      <div>
        <h4>Run A</h4>
        {runA && <GridCanvas layout={layout} zoom={20} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} heatmap={heatA} />}
      </div>
      <div>
        <h4>Run B</h4>
        {runB && <GridCanvas layout={layout} zoom={20} selectedTool="AISLE" onPaint={() => undefined} onSelect={() => undefined} heatmap={heatB} />}
      </div>
    </div>
  );
}
