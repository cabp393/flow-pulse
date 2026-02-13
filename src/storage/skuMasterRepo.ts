import type { SkuMaster } from '../models/domain';

export const createSkuMaster = (name: string, mapping: Record<string, string>): SkuMaster => ({
  skuMasterId: crypto.randomUUID(),
  name,
  mapping,
  createdAt: new Date().toISOString(),
});

export const updateSkuMaster = (masters: SkuMaster[], master: SkuMaster): SkuMaster[] =>
  masters.map((item) => (item.skuMasterId === master.skuMasterId ? master : item));

export const removeSkuMaster = (masters: SkuMaster[], skuMasterId: string): SkuMaster[] =>
  masters.filter((item) => item.skuMasterId !== skuMasterId);

export const duplicateSkuMaster = (masters: SkuMaster[], skuMasterId: string): SkuMaster[] => {
  const source = masters.find((item) => item.skuMasterId === skuMasterId);
  if (!source) return masters;

  const clone: SkuMaster = {
    ...source,
    skuMasterId: crypto.randomUUID(),
    name: `${source.name} (copia)`,
    mapping: { ...source.mapping },
    createdAt: new Date().toISOString(),
  };

  return [clone, ...masters];
};
