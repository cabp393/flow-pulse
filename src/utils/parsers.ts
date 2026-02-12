import * as XLSX from 'xlsx';
import type { PalletLine } from '../models/domain';

export const parseSkuCsv = (text: string): Record<string, string> => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return {};

  const [header, ...rows] = lines;
  const headers = header.split(',').map((h) => h.trim().toLowerCase());
  const skuIdx = headers.indexOf('sku');
  const locIdx = headers.indexOf('locationid');
  if (skuIdx < 0 || locIdx < 0) {
    throw new Error('CSV debe contener columnas sku,locationId');
  }

  const map: Record<string, string> = {};
  rows.forEach((row, i) => {
    const parts = row.split(',').map((p) => p.trim());
    const sku = parts[skuIdx];
    const loc = parts[locIdx];
    if (!sku || !loc) throw new Error(`Fila inválida en línea ${i + 2}`);
    map[sku] = loc;
  });

  return map;
};

export const parsePalletXlsx = async (file: File): Promise<PalletLine[]> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer);
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('XLSX sin hojas');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: '' });
  if (!rows.length) return [];

  const normalized = rows.map((row) => {
    const entries = Object.entries(row).reduce<Record<string, unknown>>((acc, [k, v]) => {
      acc[k.trim().toLowerCase()] = v;
      return acc;
    }, {});
    return {
      pallet_id: String(entries.pallet_id ?? '').trim(),
      sku: String(entries.sku ?? '').trim(),
    };
  });

  if (normalized.some((r) => !r.pallet_id || !r.sku)) {
    throw new Error('XLSX debe contener columnas pallet_id y sku con datos');
  }

  return normalized;
};
