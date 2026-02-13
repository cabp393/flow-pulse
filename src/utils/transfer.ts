import type { Layout, SkuMasterRow } from '../models/domain';

export const sanitizeFileToken = (value: string): string => {
  const cleaned = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'untitled';
};

export const compactTimestamp = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}_${hour}${minute}`;
};

export const downloadFile = (filename: string, payload: string, mime: string): void => {
  const blob = new Blob([payload], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const toSkuMasterCsv = (rows: SkuMasterRow[]): string => {
  const lines = rows.map((row) => `${row.locationId},${row.sequence},${row.sku}`);
  return ['ubicacion,secuencia,sku', ...lines].join('\n');
};

export const validateImportedLayout = (input: unknown): { ok: true; layout: Layout } | { ok: false; error: string } => {
  if (!input || typeof input !== 'object') return { ok: false, error: 'JSON inválido: objeto esperado.' };
  const maybe = input as Partial<Layout>;
  if (typeof maybe.name !== 'string' || !maybe.name.trim()) return { ok: false, error: 'Layout inválido: name requerido.' };
  if (typeof maybe.width !== 'number' || typeof maybe.height !== 'number' || maybe.width <= 0 || maybe.height <= 0) {
    return { ok: false, error: 'Layout inválido: width/height deben ser números positivos.' };
  }
  if (!Array.isArray(maybe.gridData) || maybe.gridData.length !== maybe.height) {
    return { ok: false, error: 'Layout inválido: gridData no coincide con height.' };
  }
  if (!maybe.gridData.every((row) => Array.isArray(row) && row.length === maybe.width)) {
    return { ok: false, error: 'Layout inválido: filas de gridData no coinciden con width.' };
  }
  if (!maybe.startCell || typeof maybe.startCell.x !== 'number' || typeof maybe.startCell.y !== 'number') {
    return { ok: false, error: 'Layout inválido: startCell requerido.' };
  }
  if (!maybe.endCell || typeof maybe.endCell.x !== 'number' || typeof maybe.endCell.y !== 'number') {
    return { ok: false, error: 'Layout inválido: endCell requerido.' };
  }
  if (!maybe.movementRules) {
    return { ok: false, error: 'Layout inválido: movementRules requeridas.' };
  }

  const layout: Layout = {
    layoutId: typeof maybe.layoutId === 'string' && maybe.layoutId ? maybe.layoutId : crypto.randomUUID(),
    name: maybe.name.trim(),
    createdAt: typeof maybe.createdAt === 'string' && maybe.createdAt ? maybe.createdAt : new Date().toISOString(),
    width: maybe.width,
    height: maybe.height,
    gridData: maybe.gridData,
    movementRules: maybe.movementRules,
    startCell: maybe.startCell,
    endCell: maybe.endCell,
  };

  return { ok: true, layout };
};
