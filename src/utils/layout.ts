import type { Coord, Layout } from '../models/domain';

export const keyOf = ({ x, y }: Coord): string => `${x},${y}`;

export const isInside = (layout: Layout, c: Coord): boolean =>
  c.x >= 0 && c.x < layout.width && c.y >= 0 && c.y < layout.height;

export const adjacent = (a: Coord, b: Coord): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

export const findSingleCell = (layout: Layout, type: 'START' | 'END'): Coord | undefined => {
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      if (layout.grid[y][x].type === type) return { x, y };
    }
  }
  return undefined;
};

export const hashLayout = (layout: Layout): string => {
  let hash = 0;
  const raw = JSON.stringify(layout);
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
};
