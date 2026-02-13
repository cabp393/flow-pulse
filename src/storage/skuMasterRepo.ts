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
