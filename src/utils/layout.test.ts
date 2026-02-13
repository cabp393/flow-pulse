import { describe, expect, it } from 'vitest';
import { createLayout, defaultMovement } from '../models/defaults';
import { resizeLayout } from './layout';

describe('resizeLayout', () => {
  it('keeps existing cells while enlarging', () => {
    const layout = createLayout(2, 2);
    layout.gridData[0][0] = { type: 'START' };
    layout.gridData[0][1] = { type: 'AISLE', movement: defaultMovement() };

    const resized = resizeLayout(layout, 3, 3);

    expect(resized.width).toBe(3);
    expect(resized.height).toBe(3);
    expect(resized.gridData[0][0].type).toBe('START');
    expect(resized.gridData[0][1].type).toBe('AISLE');
    expect(resized.gridData[2][2].type).toBe('WALL');
  });

  it('trims cells outside next bounds', () => {
    const layout = createLayout(3, 3);
    layout.gridData[2][2] = { type: 'END' };

    const resized = resizeLayout(layout, 2, 2);

    expect(resized.width).toBe(2);
    expect(resized.height).toBe(2);
    expect(resized.gridData.flat().some((cell) => cell.type === 'END')).toBe(false);
  });
});
