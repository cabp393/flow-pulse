import type { Coord } from '../models/domain';
import type { LayoutValidationIssue } from './validateLayout';

interface Props {
  open: boolean;
  errors: LayoutValidationIssue[];
  warnings: LayoutValidationIssue[];
  onClose: () => void;
  onGoToCell: (cell: Coord) => void;
}

const IssueList = ({ issues, onGoToCell }: { issues: LayoutValidationIssue[]; onGoToCell: (cell: Coord) => void }) => {
  if (!issues.length) return <p>Sin elementos.</p>;
  return (
    <ul className="validation-list">
      {issues.map((issue) => (
        <li key={issue.id}>
          <span>{issue.message}</span>
          {issue.cell && <button type="button" onClick={() => issue.cell && onGoToCell(issue.cell)}>Ir a celda</button>}
        </li>
      ))}
    </ul>
  );
};

export function LayoutValidationModal({ open, errors, warnings, onClose, onGoToCell }: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>Validación de layout</h3>
        <p>Corrige los errores para poder guardar.</p>

        <h4>Errores ({errors.length})</h4>
        <IssueList issues={errors} onGoToCell={onGoToCell} />

        <h4>Warnings ({warnings.length})</h4>
        <IssueList issues={warnings} onGoToCell={onGoToCell} />

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
