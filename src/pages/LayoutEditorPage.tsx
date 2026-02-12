import { useEffect, useMemo, useState } from 'react';
import type { CellType, Coord, Layout } from '../models/domain';
import { defaultMovement } from '../models/defaults';
import { GridCanvas } from '../ui/GridCanvas';
import { adjacent, isInside, resizeLayout } from '../utils/layout';
import { validateLayout } from '../utils/validation';

interface Props {
  layout: Layout;
  setLayout: (layout: Layout) => void;
}

const tools: CellType[] = ['WALL', 'AISLE', 'PICK', 'START', 'END'];

const offsets = [-1, 0, 1];

export function LayoutEditorPage({ layout, setLayout }: Props) {
  const [tool, setTool] = useState<CellType>('AISLE');
  const [zoom, setZoom] = useState(28);
  const [selected, setSelected] = useState<Coord>();
  const [draftWidth, setDraftWidth] = useState(layout.width);
  const [draftHeight, setDraftHeight] = useState(layout.height);
  const errors = useMemo(() => validateLayout(layout), [layout]);

  useEffect(() => {
    setDraftWidth(layout.width);
    setDraftHeight(layout.height);
  }, [layout.width, layout.height]);

  useEffect(() => {
    if (!selected) return;
    if (selected.x < layout.width && selected.y < layout.height) return;
    setSelected(undefined);
  }, [layout.width, layout.height, selected]);

  const updateCell = (coord: Coord, updater: (current: Layout['grid'][number][number]) => Layout['grid'][number][number]) => {
    const next = structuredClone(layout);
    next.grid[coord.y][coord.x] = updater(next.grid[coord.y][coord.x]);
    setLayout(next);
  };

  const paint = (coord: Coord) => {
    const next = structuredClone(layout);
    const cell = next.grid[coord.y][coord.x];
    cell.type = tool;
    if (tool === 'AISLE') cell.movement = cell.movement ?? defaultMovement();
    if (tool === 'START' || tool === 'END') {
      for (let y = 0; y < next.height; y += 1) {
        for (let x = 0; x < next.width; x += 1) {
          if (next.grid[y][x].type === tool && (x !== coord.x || y !== coord.y)) next.grid[y][x].type = 'AISLE';
        }
      }
    }
    if (tool !== 'PICK') cell.pick = undefined;
    if (tool === 'PICK' && !cell.pick) {
      cell.pick = { locationId: '', sequence: 0, accessCell: coord };
    }
    if (tool === 'WALL') cell.movement = undefined;
    setLayout(next);
  };

  const selectedCell = selected ? layout.grid[selected.y][selected.x] : undefined;

  return (
    <div className="page">
      <div className="toolbar">
        {tools.map((t) => (
          <button key={t} className={tool === t ? 'active' : ''} onClick={() => setTool(t)}>
            {t}
          </button>
        ))}
        <button onClick={() => setZoom((z) => Math.max(16, z - 4))}>-</button>
        <button onClick={() => setZoom((z) => Math.min(60, z + 4))}>+</button>
        <label>
          Ancho
          <input type="number" min={1} value={draftWidth} onChange={(e) => setDraftWidth(Number.parseInt(e.target.value, 10) || 1)} />
        </label>
        <label>
          Alto
          <input type="number" min={1} value={draftHeight} onChange={(e) => setDraftHeight(Number.parseInt(e.target.value, 10) || 1)} />
        </label>
        <button onClick={() => setLayout(resizeLayout(layout, draftWidth, draftHeight))}>Aplicar tamaño</button>
        <span>Shift+Click para seleccionar celda</span>
      </div>

      <div className="layout-content">
        <GridCanvas layout={layout} zoom={zoom} selectedTool={tool} onPaint={paint} onSelect={setSelected} selected={selected} />
        <aside className="panel">
          <h3>Propiedades</h3>
          {selected && selectedCell ? (
            <>
              <p>
                Celda ({selected.x},{selected.y}) {selectedCell.type}
              </p>
              {selectedCell.type === 'AISLE' && (
                <div className="form-grid">
                  {(['allowUp', 'allowDown', 'allowLeft', 'allowRight'] as const).map((k) => (
                    <label key={k}>
                      <input
                        type="checkbox"
                        checked={selectedCell.movement?.[k] ?? false}
                        onChange={(e) =>
                          updateCell(selected, (c) => ({
                            ...c,
                            movement: { ...(c.movement ?? defaultMovement()), [k]: e.target.checked },
                          }))
                        }
                      />
                      {k}
                    </label>
                  ))}
                </div>
              )}
              {selectedCell.type === 'PICK' && (
                <div className="form-grid">
                  <label>
                    locationId
                    <input
                      value={selectedCell.pick?.locationId ?? ''}
                      onChange={(e) => updateCell(selected, (c) => ({ ...c, pick: { ...c.pick!, locationId: e.target.value } }))}
                    />
                  </label>
                  <label>
                    sequence
                    <input
                      type="number"
                      value={selectedCell.pick?.sequence ?? 0}
                      onChange={(e) =>
                        updateCell(selected, (c) => ({ ...c, pick: { ...c.pick!, sequence: Number.parseInt(e.target.value, 10) || 0 } }))
                      }
                    />
                  </label>
                  <div>
                    <p>accessCell (selector 3x3)</p>
                    <div className="access-selector">
                      {offsets.map((offsetY) =>
                        offsets.map((offsetX) => {
                          const target = { x: selected.x + offsetX, y: selected.y + offsetY };
                          const inside = isInside(layout, target);
                          const isCenter = offsetX === 0 && offsetY === 0;
                          const isAdjacent = adjacent(selected, target);
                          const cellType = inside ? layout.grid[target.y][target.x].type : undefined;
                          const walkable = cellType ? ['AISLE', 'START', 'END'].includes(cellType) : false;
                          const disabled = isCenter || !inside || !isAdjacent || !walkable;
                          const active =
                            selectedCell.pick?.accessCell.x === target.x &&
                            selectedCell.pick?.accessCell.y === target.y;

                          return (
                            <button
                              type="button"
                              key={`${offsetX}-${offsetY}`}
                              className={`access-cell ${active ? 'active' : ''}`}
                              disabled={disabled}
                              onClick={() => updateCell(selected, (c) => ({ ...c, pick: { ...c.pick!, accessCell: target } }))}
                              title={inside ? `${cellType} (${target.x},${target.y})` : 'Fuera de layout'}
                            >
                              {inside ? `${target.x},${target.y}` : '·'}
                            </button>
                          );
                        }),
                      )}
                    </div>
                    <small>Solo se habilitan celdas adyacentes transitables.</small>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p>Selecciona una celda para editar propiedades.</p>
          )}

          <h4>Validaciones</h4>
          {errors.length ? <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul> : <p>Layout válido.</p>}
        </aside>
      </div>
    </div>
  );
}
