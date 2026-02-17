import type { Batch, PalletLine } from '../models/domain';

export const stripFileExtension = (name: string): string => {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return 'batch';
  return trimmed.replace(/\.[^.]+$/, '') || 'batch';
};

export const serializeBatch = (lines: PalletLine[], fileName: string): Batch => {
  const palletOrder: string[] = [];
  const palletMap = new Map<string, number[]>();
  const skuDict: string[] = [];
  const skuIndex = new Map<string, number>();

  lines.forEach((line) => {
    const palletId = String(line.pallet_id ?? '').trim();
    const sku = String(line.sku ?? '').trim();
    if (!palletId || !sku) return;

    if (!palletMap.has(palletId)) {
      palletMap.set(palletId, []);
      palletOrder.push(palletId);
    }

    let skuIdx = skuIndex.get(sku);
    if (skuIdx === undefined) {
      skuIdx = skuDict.length;
      skuDict.push(sku);
      skuIndex.set(sku, skuIdx);
    }

    palletMap.get(palletId)?.push(skuIdx);
  });

  const skuIdxFlat: number[] = [];
  const offsets: number[] = [0];
  palletOrder.forEach((palletId) => {
    const idxs = palletMap.get(palletId) ?? [];
    skuIdxFlat.push(...idxs);
    offsets.push(skuIdxFlat.length);
  });

  return {
    batchId: crypto.randomUUID(),
    name: stripFileExtension(fileName),
    createdAt: new Date().toISOString(),
    palletOrder,
    skuDict,
    skuIdxFlat,
    offsets,
    stats: {
      totalPallets: palletOrder.length,
      totalLines: skuIdxFlat.length,
      uniqueSkus: skuDict.length,
    },
  };
};

export const deserializeBatch = (batch: Batch): PalletLine[] => {
  const lines: PalletLine[] = [];
  batch.palletOrder.forEach((palletId, palletIndex) => {
    const start = batch.offsets[palletIndex] ?? 0;
    const end = batch.offsets[palletIndex + 1] ?? start;
    for (let idx = start; idx < end; idx += 1) {
      const sku = batch.skuDict[batch.skuIdxFlat[idx]];
      if (!sku) continue;
      lines.push({ pallet_id: palletId, sku });
    }
  });
  return lines;
};

export const insertBatch = (batches: Batch[], batch: Batch, max = 30): Batch[] => [batch, ...batches].slice(0, max);
export const removeBatch = (batches: Batch[], batchId: string): Batch[] => batches.filter((batch) => batch.batchId !== batchId);
