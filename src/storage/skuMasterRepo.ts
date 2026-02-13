import type { SkuLocationSequence, SkuMaster, SkuMasterRow } from '../models/domain';

export const buildSkuIndex = (rows: SkuMasterRow[]): Record<string, SkuLocationSequence[]> => {
  const grouped = new Map<string, SkuLocationSequence[]>();
  for (const row of rows) {
    const current = grouped.get(row.sku) ?? [];
    current.push({ locationId: row.locationId, sequence: row.sequence });
    grouped.set(row.sku, current);
  }

  const index: Record<string, SkuLocationSequence[]> = {};
  grouped.forEach((list, sku) => {
    index[sku] = [...list].sort((a, b) => a.sequence - b.sequence);
  });
  return index;
};

export const createSkuMaster = (name: string, rows: SkuMasterRow[]): SkuMaster => ({
  skuMasterId: crypto.randomUUID(),
  name,
  createdAt: new Date().toISOString(),
  rows,
  index: buildSkuIndex(rows),
});

export const updateSkuMaster = (masters: SkuMaster[], master: SkuMaster): SkuMaster[] =>
  masters.map((item) => (item.skuMasterId === master.skuMasterId ? { ...master, index: buildSkuIndex(master.rows) } : item));

export const removeSkuMaster = (masters: SkuMaster[], skuMasterId: string): SkuMaster[] =>
  masters.filter((item) => item.skuMasterId !== skuMasterId);

export const duplicateSkuMaster = (masters: SkuMaster[], skuMasterId: string): SkuMaster[] => {
  const source = masters.find((item) => item.skuMasterId === skuMasterId);
  if (!source) return masters;

  const clone: SkuMaster = {
    ...source,
    skuMasterId: crypto.randomUUID(),
    name: `${source.name} (copia)`,
    rows: [...source.rows],
    index: buildSkuIndex(source.rows),
    createdAt: new Date().toISOString(),
  };

  return [clone, ...masters];
};
