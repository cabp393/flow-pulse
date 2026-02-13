import { useEffect, useMemo, useRef } from 'react';
import type { CellType, Coord, Layout } from '../models/domain';

interface Props {
  layout: Layout;
  zoom: number;
  selectedTool: CellType;
  onPaint: (coord: Coord) => void;
  onSelect: (coord: Coord) => void;
  selected?: Coord;
  focusCoord?: Coord;
  highlightedCells?: Coord[];
  heatmap?: number[][];
  pickAccessCells?: Coord[];
  pickerPosition?: Coord;
  visitCounts?: Record<string, number>;
  followCamera?: boolean;
}

const colorByType: Record<CellType, string> = {
  WALL: '#1f2937',
  AISLE: '#e5e7eb',
  PICK: '#fbbf24',
  START: '#34d399',
  END: '#f87171',
};

export function GridCanvas({
  layout,
  zoom,
  onPaint,
  onSelect,
  selected,
  focusCoord,
  highlightedCells,
  heatmap,
  pickAccessCells,
  pickerPosition,
  visitCounts,
  followCamera,
}: Props) {
  const maxHeat = Math.max(0, ...(heatmap?.flat() ?? [0]));
  const pickAccessSet = useMemo(() => new Set((pickAccessCells ?? []).map((c) => `${c.x},${c.y}`)), [pickAccessCells]);
  const highlightSet = useMemo(() => new Set((highlightedCells ?? []).map((c) => `${c.x},${c.y}`)), [highlightedCells]);
  const pickerKey = pickerPosition ? `${pickerPosition.x},${pickerPosition.y}` : '';
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!followCamera || !pickerPosition || !rootRef.current) return;
    const target = rootRef.current.querySelector<HTMLButtonElement>(`button[data-coord="${pickerKey}"]`);
    target?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [followCamera, pickerKey, pickerPosition]);

  useEffect(() => {
    if (!focusCoord || !rootRef.current) return;
    const target = rootRef.current.querySelector<HTMLButtonElement>(`button[data-coord="${focusCoord.x},${focusCoord.y}"]`);
    target?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [focusCoord]);

  return (
    <div ref={rootRef} className="grid-canvas" style={{ gridTemplateColumns: `repeat(${layout.width}, ${zoom}px)` }}>
      {layout.gridData.map((row, y) =>
        row.map((cell, x) => {
          const heat = heatmap?.[y]?.[x] ?? 0;
          const intensity = maxHeat ? heat / maxHeat : 0;
          const isSelected = selected?.x === x && selected.y === y;
          const isPickAccess = pickAccessSet.has(`${x},${y}`);
          const isPicker = pickerKey === `${x},${y}`;
          const hasIssue = highlightSet.has(`${x},${y}`);
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              data-coord={`${x},${y}`}
              title={`${cell.type} (${x},${y})`}
              className={`cell ${isSelected ? 'selected' : ''} ${isPickAccess ? 'pick-access-path' : ''} ${isPicker ? 'picker' : ''} ${hasIssue ? 'issue' : ''}`}
              style={{
                width: zoom,
                height: zoom,
                background: heatmap ? `rgba(239,68,68,${Math.max(0.06, intensity)})` : colorByType[cell.type],
              }}
              onClick={(e) => {
                if (e.shiftKey) {
                  onSelect({ x, y });
                } else {
                  onPaint({ x, y });
                }
              }}
            >
              {visitCounts?.[`${x},${y}`] ? <span className="cell-visit-count">{visitCounts[`${x},${y}`]}</span> : cell.type === 'PICK' ? 'P' : ''}
            </button>
          );
        }),
      )}
    </div>
  );
}
