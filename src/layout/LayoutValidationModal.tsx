import type { Coord } from '../models/domain';
import type { LayoutValidationIssue } from './validateLayout';

interface Props {
  open: boolean;
  errors: LayoutValidationIssue[];
  warnings: LayoutValidationIssue[];
  showDetails: boolean;
  onClose: () => void;
  onViewDetails: () => void;
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

export function LayoutValidationModal({ open, errors, warnings, showDetails, onClose, onViewDetails, onGoToCell }: Props) {
  if (!open) return null;
  const totalIssues = errors.length + warnings.length;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>Resultado de guardado</h3>
        <p>Se guardó el layout con {errors.length} errores y {warnings.length} warnings ({totalIssues} issues).</p>

        {showDetails && (
          <>
            <h4>Errores ({errors.length})</h4>
            <IssueList issues={errors} onGoToCell={onGoToCell} />

            <h4>Warnings ({warnings.length})</h4>
            <IssueList issues={warnings} onGoToCell={onGoToCell} />
          </>
        )}

        <div className="modal-actions">
          {!showDetails && <button type="button" onClick={onViewDetails}>Ver</button>}
          <button type="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
