import type { Coord, RunPickPlanItem } from '../models/domain';
import { usePickProgress } from './usePickProgress';

interface PickProgressPanelProps {
  path: Coord[];
  stepIndex: number;
  pickPlan: RunPickPlanItem[];
  hasPath: boolean;
}

const renderSequence = (sequence: number): string => {
  if (!Number.isFinite(sequence) || sequence >= Number.MAX_SAFE_INTEGER) return '—';
  return String(sequence);
};

export function PickProgressPanel({ path, stepIndex, pickPlan, hasPath }: PickProgressPanelProps) {
  const items = usePickProgress(pickPlan, path, stepIndex);

  return (
    <div className="pick-progress-panel">
      <small>Pasos totales: {path.length > 0 ? path.length : '—'}</small>
      {!hasPath && <small>Sin ruta / issues</small>}
      <table className="pick-progress-table">
        <thead>
          <tr>
            <th>Indice</th>
            <th>sku</th>
            <th>ubicacion</th>
            <th>secuencia</th>
            <th>estado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.index}-${item.sku}`}>
              <td>{item.index}</td>
              <td>{item.sku}</td>
              <td>{item.locationId || '—'}</td>
              <td>{renderSequence(item.sequence)}</td>
              <td>{item.icon}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
