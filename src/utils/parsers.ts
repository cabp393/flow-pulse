import * as XLSX from 'xlsx';
import type { PalletLine, SkuMasterRow } from '../models/domain';

export interface ParsedSkuMasterCsv {
  rows: SkuMasterRow[];
  warnings: string[];
}

const splitCsvRow = (line: string): string[] => line.split(',').map((part) => part.trim());

const expectedHeaders = ['ubicacion', 'secuencia', 'sku'] as const;

const resolveHeaderIndexes = (headerRow: string[]): number[] | undefined => {
  const normalized = headerRow.map((item) => item.toLowerCase());
  if (!expectedHeaders.every((name) => normalized.includes(name))) return undefined;
  return expectedHeaders.map((name) => normalized.indexOf(name));
};

export const parseSkuMasterCsv = (text: string): ParsedSkuMasterCsv => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return { rows: [], warnings: [] };

  const firstRow = splitCsvRow(lines[0]);
  const explicitHeader = resolveHeaderIndexes(firstRow);
  const columnIndexes = explicitHeader ?? [0, 1, 2];
  const dataRows = explicitHeader ? lines.slice(1) : lines;

  const rows: SkuMasterRow[] = [];
  const warnings: string[] = [];
  const dedupe = new Set<string>();

  dataRows.forEach((rawRow, i) => {
    const parts = splitCsvRow(rawRow);
    if (parts.length < 3) throw new Error(`Fila inválida en línea ${i + (explicitHeader ? 2 : 1)}`);

    const [locationId, sequenceRaw, sku] = columnIndexes.map((index) => parts[index] ?? '');
    if (!locationId || !sku) throw new Error(`Fila inválida en línea ${i + (explicitHeader ? 2 : 1)}`);

    const sequence = Number(sequenceRaw);
    if (!Number.isFinite(sequence)) {
      throw new Error(`Secuencia no numérica en línea ${i + (explicitHeader ? 2 : 1)}`);
    }

    const key = `${sku}::${locationId}`;
    if (dedupe.has(key)) {
      warnings.push(`Duplicado SKU+ubicacion ignorado en línea ${i + (explicitHeader ? 2 : 1)}: ${sku} + ${locationId}`);
      return;
    }

    dedupe.add(key);
    rows.push({ sku, locationId, sequence });
  });

  return { rows, warnings };
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
