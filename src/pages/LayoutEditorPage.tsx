import { useEffect, useMemo, useState } from 'react';
import type { CellType, Coord, Layout } from '../models/domain';
import { defaultMovement } from '../models/defaults';
import { LayoutValidationModal } from '../layout/LayoutValidationModal';
import { useLayoutDraft } from '../layout/useLayoutDraft';
import { validateLayout } from '../layout/validateLayout';
import { GridCanvas } from '../ui/GridCanvas';
import { adjacent, isInside, resizeLayout } from '../utils/layout';

interface Props {
  layout?: Layout;
  setLayout: (layout: Layout) => void;
  onEditorStateChange: (state: { isDirty: boolean; save: () => boolean; discard: () => void }) => void;
}

const tools: CellType[] = ['WALL', 'AISLE', 'PICK', 'START', 'END'];
const offsets = [-1, 0, 1];

const syncLayoutMetadata = (layout: Layout): Layout => {
  let startCell: Coord | undefined;
  let endCell: Coord | undefined;
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      if (layout.gridData[y][x].type === 'START') startCell = { x, y };
      if (layout.gridData[y][x].type === 'END') endCell = { x, y };
    }
  }
  return { ...layout, startCell, endCell };
};

export function LayoutEditorPage({ layout, setLayout, onEditorStateChange }: Props) {
  const [tool, setTool] = useState<CellType>('AISLE');
  const [zoom, setZoom] = useState(25);
  const [selected, setSelected] = useState<Coord>();
  const [focusCoord, setFocusCoord] = useState<Coord>();
  const [draftWidth, setDraftWidth] = useState(layout?.width ?? 1);
  const [draftHeight, setDraftHeight] = useState(layout?.height ?? 1);
  const [toastMessage, setToastMessage] = useState<string>();
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);

  const {
    draft,
    isDirty,
    discardChanges,
    commitDraft,
    updateDraft,
  } = useLayoutDraft(layout);

  const validation = useMemo(() => (draft ? validateLayout(draft) : { errors: [], warnings: [] }), [draft]);
  const issueCells = useMemo(
    () => validation.errors.concat(validation.warnings).flatMap((issue) => (issue.cell ? [issue.cell] : [])),
    [validation.errors, validation.warnings],
  );

  useEffect(() => {
    if (!draft) return;
    setDraftWidth(draft.width);
    setDraftHeight(draft.height);
  }, [draft?.layoutId, draft?.height, draft?.width]);

  useEffect(() => {
    if (!isDirty) {
      setValidationAttempted(false);
      setShowValidationModal(false);
      setShowValidationDetails(false);
    }
  }, [isDirty]);

  const saveLayout = () => {
    if (!draft) return false;
    setValidationAttempted(true);

    const committed = commitDraft();
    if (!committed) return false;
    setLayout(syncLayoutMetadata(committed));
    const totalIssues = validation.errors.length + validation.warnings.length;
    setShowValidationModal(totalIssues > 0);
    setShowValidationDetails(false);
    setToastMessage(totalIssues > 0 ? 'Layout guardado con issues pendientes.' : 'Layout guardado.');
    window.setTimeout(() => setToastMessage(undefined), 2200);
    return true;
  };

  const discardLayoutChanges = () => {
    discardChanges();
    setShowValidationModal(false);
    setShowValidationDetails(false);
    setValidationAttempted(false);
  };

  useEffect(() => {
    onEditorStateChange({ isDirty, save: saveLayout, discard: discardLayoutChanges });
  }, [isDirty, onEditorStateChange, saveLayout]);

  if (!draft) return <div className="page"><p>Seleccione un layout para editar.</p></div>;

  const updateCell = (coord: Coord, updater: (current: Layout['gridData'][number][number]) => Layout['gridData'][number][number]) => {
    updateDraft((next) => {
      next.gridData[coord.y][coord.x] = updater(next.gridData[coord.y][coord.x]);
      return syncLayoutMetadata(next);
    });
  };

  const paint = (coord: Coord) => {
    updateDraft((next) => {
      const cell = next.gridData[coord.y][coord.x];
      cell.type = tool;
      if (tool === 'AISLE') cell.movement = cell.movement ?? defaultMovement();
      if (tool === 'START' || tool === 'END') {
        for (let y = 0; y < next.height; y += 1) {
          for (let x = 0; x < next.width; x += 1) {
            if (next.gridData[y][x].type === tool && (x !== coord.x || y !== coord.y)) next.gridData[y][x].type = 'AISLE';
          }
        }
      }
      if (tool !== 'PICK') cell.pick = undefined;
      if (tool === 'PICK' && !cell.pick) cell.pick = { locationId: '', accessCell: coord };
      if (tool === 'WALL') cell.movement = undefined;
      return syncLayoutMetadata(next);
    });
  };

  const selectedCell = selected ? draft.gridData[selected.y][selected.x] : undefined;

  return (
    <div className="page">
      <div className="toolbar">
        {tools.map((t) => <button key={t} className={tool === t ? 'active' : ''} onClick={() => setTool(t)}>{t}</button>)}
        <button onClick={() => setZoom((z) => Math.max(16, z - 4))}>-</button>
        <button onClick={() => setZoom((z) => Math.min(60, z + 4))}>+</button>
        <label>Ancho<input type="number" min={1} value={draftWidth} onChange={(e) => setDraftWidth(Number.parseInt(e.target.value, 10) || 1)} /></label>
        <label>Alto<input type="number" min={1} value={draftHeight} onChange={(e) => setDraftHeight(Number.parseInt(e.target.value, 10) || 1)} /></label>
        <button onClick={() => updateDraft((current) => syncLayoutMetadata(resizeLayout(current, draftWidth, draftHeight)))}>Aplicar tamaño</button>

        <button onClick={saveLayout}>Guardar layout</button>
        <button onClick={discardLayoutChanges}>Descartar cambios</button>
        <button onClick={discardLayoutChanges}>Revertir a último guardado</button>

        {isDirty && <span className="status-badge dirty">Cambios sin guardar</span>}
        {isDirty && !validationAttempted && <span className="status-badge pending">Validación pendiente</span>}
        {isDirty && <span className="status-badge">Issues pendientes: {validation.errors.length + validation.warnings.length}</span>}
      </div>

      {toastMessage && <p className="toast-success">{toastMessage}</p>}

      <div className="layout-content">
        <GridCanvas
          layout={draft}
          zoom={zoom}
          selectedTool={tool}
          onPaint={paint}
          onSelect={setSelected}
          selected={selected}
          focusCoord={focusCoord}
          highlightedCells={showValidationDetails ? issueCells : []}
        />
        <aside className="panel">
          {selected && selectedCell ? (
            <>
              <p>Celda ({selected.x},{selected.y}) {selectedCell.type}</p>
              {selectedCell.type === 'AISLE' && <div className="form-grid">{(['allowUp', 'allowDown', 'allowLeft', 'allowRight'] as const).map((k) => <label key={k}><input type="checkbox" checked={selectedCell.movement?.[k] ?? false} onChange={(e) => updateCell(selected, (c) => ({ ...c, movement: { ...(c.movement ?? defaultMovement()), [k]: e.target.checked } }))} />{k}</label>)}</div>}
              {selectedCell.type === 'PICK' && <div className="form-grid"><label>locationId<input value={selectedCell.pick?.locationId ?? ''} onChange={(e) => updateCell(selected, (c) => ({ ...c, pick: { ...c.pick!, locationId: e.target.value } }))} /></label><div><p>accessCell (selector 3x3)</p><div className="access-selector">{offsets.map((offsetY) => offsets.map((offsetX) => {
                const target = { x: selected.x + offsetX, y: selected.y + offsetY };
                const inside = isInside(draft, target);
                const isCenter = offsetX === 0 && offsetY === 0;
                const isAdjacent = adjacent(selected, target);
                const cellType = inside ? draft.gridData[target.y][target.x].type : undefined;
                const walkable = cellType ? ['AISLE', 'START', 'END'].includes(cellType) : false;
                const disabled = isCenter || !inside || !isAdjacent || !walkable;
                const active = selectedCell.pick?.accessCell.x === target.x && selectedCell.pick?.accessCell.y === target.y;
                return <button type="button" key={`${offsetX}-${offsetY}`} className={`access-cell ${active ? 'active' : ''}`} disabled={disabled} onClick={() => updateCell(selected, (c) => ({ ...c, pick: { ...c.pick!, accessCell: target } }))}>{inside ? `${target.x},${target.y}` : '·'}</button>;
              }))}</div></div></div>}
            </>
          ) : <p>Selecciona una celda para editar propiedades.</p>}
        </aside>
      </div>

      <LayoutValidationModal
        open={showValidationModal}
        errors={validation.errors}
        warnings={validation.warnings}
        showDetails={showValidationDetails}
        onClose={() => {
          setShowValidationModal(false);
          setShowValidationDetails(false);
        }}
        onViewDetails={() => setShowValidationDetails(true)}
        onGoToCell={(cell) => {
          setSelected(cell);
          setFocusCoord(cell);
        }}
      />
    </div>
  );
}
