import type { Coord, RunPickPlanItem } from '../models/domain';
import { usePickProgress } from './usePickProgress';

interface PickProgressPanelProps {
  path: Coord[];
  stepIndex: number;
  pickPlan: RunPickPlanItem[];
  hasPath: boolean;
}

export function PickProgressPanel({ path, stepIndex, pickPlan, hasPath }: PickProgressPanelProps) {
  const items = usePickProgress(pickPlan, path, stepIndex);

  return (
    <div className="pick-progress-panel">
      <small>Pasos totales: {path.length > 0 ? path.length : '—'}</small>
      {!hasPath && <small>Sin ruta / issues</small>}
      <ol className="pick-progress-list">
        {items.map((item, index) => (
          <li key={`${item.sku}-${index}`}>
            {index + 1}) {item.sku} - {item.icon}
          </li>
        ))}
      </ol>
    </div>
  );
}
