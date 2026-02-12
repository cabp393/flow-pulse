import { useEffect, useMemo, useRef } from 'react';
import type { CellType, Coord, Layout } from '../models/domain';

interface Props {
  layout: Layout;
  zoom: number;
  selectedTool: CellType;
  onPaint: (coord: Coord) => void;
  onSelect: (coord: Coord) => void;
  selected?: Coord;
  heatmap?: number[][];
  path?: Coord[];
  pickAccessCells?: Coord[];
  pickerPosition?: Coord;
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
  heatmap,
  path,
  pickAccessCells,
  pickerPosition,
  followCamera,
}: Props) {
  const maxHeat = Math.max(0, ...(heatmap?.flat() ?? [0]));
  const pathSet = useMemo(() => new Set((path ?? []).map((c) => `${c.x},${c.y}`)), [path]);
  const pickAccessSet = useMemo(() => new Set((pickAccessCells ?? []).map((c) => `${c.x},${c.y}`)), [pickAccessCells]);
  const pickerKey = pickerPosition ? `${pickerPosition.x},${pickerPosition.y}` : '';
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!followCamera || !pickerPosition || !rootRef.current) return;
    const target = rootRef.current.querySelector<HTMLButtonElement>(`button[data-coord="${pickerKey}"]`);
    target?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [followCamera, pickerKey, pickerPosition]);

  return (
    <div ref={rootRef} className="grid-canvas" style={{ gridTemplateColumns: `repeat(${layout.width}, ${zoom}px)` }}>
      {layout.grid.map((row, y) =>
        row.map((cell, x) => {
          const heat = heatmap?.[y]?.[x] ?? 0;
          const intensity = maxHeat ? heat / maxHeat : 0;
          const isSelected = selected?.x === x && selected.y === y;
          const inPath = pathSet.has(`${x},${y}`);
          const isPickAccess = pickAccessSet.has(`${x},${y}`);
          const isPicker = pickerKey === `${x},${y}`;
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              data-coord={`${x},${y}`}
              title={`${cell.type} (${x},${y})`}
              className={`cell ${isSelected ? 'selected' : ''} ${inPath ? 'path' : ''} ${isPickAccess ? 'pick-access-path' : ''} ${isPicker ? 'picker' : ''}`}
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
              {isPicker ? '●' : cell.type === 'PICK' ? 'P' : ''}
            </button>
          );
        }),
      )}
    </div>
  );
}
