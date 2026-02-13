import type { Cell, Layout, MovementRules } from './domain';

export const defaultMovement = (): MovementRules => ({
  allowUp: true,
  allowDown: true,
  allowLeft: true,
  allowRight: true,
});

export const createCell = (): Cell => ({ type: 'WALL' });

export const createLayout = (nameOrWidth: string | number = 'Layout 1', widthArg = 16, heightArg = 12): Layout => {
  const name = typeof nameOrWidth === 'string' ? nameOrWidth : 'Layout';
  const width = typeof nameOrWidth === 'number' ? nameOrWidth : widthArg;
  const height = typeof nameOrWidth === 'number' ? widthArg : heightArg;
  return {
    layoutId: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    width,
    height,
    gridData: Array.from({ length: height }, () => Array.from({ length: width }, createCell)),
    movementRules: defaultMovement(),
  };
};
