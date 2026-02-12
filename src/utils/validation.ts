import type { Layout } from '../models/domain';
import { adjacent, findSingleCell, isInside } from './layout';

export const validateLayout = (layout: Layout): string[] => {
  const errors: string[] = [];
  const start = findSingleCell(layout, 'START');
  const end = findSingleCell(layout, 'END');

  if (!start) errors.push('Debe existir exactamente una celda START.');
  if (!end) errors.push('Debe existir exactamente una celda END.');

  const pickIds = new Set<string>();

  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const cell = layout.grid[y][x];
      if (cell.type === 'PICK') {
        if (!cell.pick?.locationId) errors.push(`PICK en (${x},${y}) sin locationId.`);
        if (cell.pick && pickIds.has(cell.pick.locationId)) errors.push(`locationId duplicado: ${cell.pick.locationId}`);
        if (cell.pick?.locationId) pickIds.add(cell.pick.locationId);
        if (cell.pick?.sequence === undefined || Number.isNaN(cell.pick.sequence)) {
          errors.push(`PICK ${cell.pick?.locationId ?? `(${x},${y})`} sin sequence válido.`);
        }
        if (!cell.pick?.accessCell || !isInside(layout, cell.pick.accessCell)) {
          errors.push(`PICK ${cell.pick?.locationId ?? `(${x},${y})`} sin accessCell válido.`);
        } else {
          const access = layout.grid[cell.pick.accessCell.y][cell.pick.accessCell.x];
          if (!['AISLE', 'START', 'END'].includes(access.type)) {
            errors.push(`PICK ${cell.pick.locationId} debe apuntar a accessCell transitable.`);
          }
          if (!adjacent({ x, y }, cell.pick.accessCell)) {
            errors.push(`accessCell de ${cell.pick.locationId} debe ser adyacente.`);
          }
        }
      }
    }
  }

  return errors;
};
