import { createLayout } from '../models/defaults';
import type { Layout } from '../models/domain';

const MAX_LAYOUTS = 10;

export const createNewLayout = (layouts: Layout[]): Layout => {
  const nextNumber = layouts.length + 1;
  return createLayout(`Layout ${nextNumber}`);
};

export const insertLayout = (layouts: Layout[], layout: Layout): Layout[] => {
  if (layouts.length >= MAX_LAYOUTS) return layouts;
  return [layout, ...layouts];
};

export const updateLayout = (layouts: Layout[], layout: Layout): Layout[] =>
  layouts.map((item) => (item.layoutId === layout.layoutId ? layout : item));

export const removeLayout = (layouts: Layout[], layoutId: string): Layout[] => layouts.filter((item) => item.layoutId !== layoutId);

export const duplicateLayout = (layouts: Layout[], layoutId: string): Layout[] => {
  const source = layouts.find((layout) => layout.layoutId === layoutId);
  if (!source || layouts.length >= MAX_LAYOUTS) return layouts;

  const clone: Layout = {
    ...source,
    layoutId: crypto.randomUUID(),
    name: `${source.name} (copia)`,
    createdAt: new Date().toISOString(),
    gridData: structuredClone(source.gridData),
  };

  return [clone, ...layouts];
};

export const renameLayout = (layouts: Layout[], layoutId: string, name: string): Layout[] =>
  layouts.map((layout) => (layout.layoutId === layoutId ? { ...layout, name: name.trim() || layout.name } : layout));

export const getMaxLayouts = (): number => MAX_LAYOUTS;
