import type { Coord } from '../models/domain';

export const SPEED_PRESETS = [1000, 500, 250, 125, 60] as const;

export const speedLabel = (speedMs: number): string => {
  const x = 1000 / speedMs;
  if (x >= 1) return `${x.toFixed(x >= 2 ? 0 : 1)}x`;
  return `${x.toFixed(2)}x`;
};

export const coordKey = (coord: Coord): string => `${coord.x},${coord.y}`;

export const uniqueCoords = (coords: Coord[]): Coord[] => {
  const seen = new Set<string>();
  return coords.filter((coord) => {
    const key = coordKey(coord);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
