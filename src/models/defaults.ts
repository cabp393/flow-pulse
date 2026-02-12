import type { Cell, Layout, MovementRules } from './domain';

export const defaultMovement = (): MovementRules => ({
  allowUp: true,
  allowDown: true,
  allowLeft: true,
  allowRight: true,
});

export const createCell = (): Cell => ({ type: 'WALL' });

export const createLayout = (width = 16, height = 12): Layout => ({
  width,
  height,
  grid: Array.from({ length: height }, () => Array.from({ length: width }, createCell)),
});
