import { describe, expect, it } from 'vitest';
import { buildRunName, normalizeSlug } from './runName';

describe('normalizeSlug', () => {
  it('normalizes names using only [a-z0-9]', () => {
    expect(normalizeSlug('baSE')).toBe('base');
    expect(normalizeSlug('princi_PAL-de')).toBe('principalde');
    expect(normalizeSlug('Hoja 1')).toBe('hoja1');
  });
});

describe('buildRunName', () => {
  it('builds YYYYMMDDHHmm_layout_skumaster_xlsx format', () => {
    const date = new Date(2026, 1, 14, 15, 30);
    const value = buildRunName(date, 'baSE', 'princi_PAL-de', 'Hoja 1.xlsx');
    expect(value).toBe('202602141530_base_principalde_hoja1');
  });

  it('uses safe fallbacks when normalized segments are empty', () => {
    const date = new Date(2026, 1, 14, 15, 30);
    const value = buildRunName(date, '___', '---', undefined);
    expect(value).toBe('202602141530_layout_skumaster_xlsx');
  });

  it('falls back to xlsx when filename has no slug chars', () => {
    const date = new Date(2026, 1, 14, 15, 30);
    const value = buildRunName(date, 'base', 'master', '...xlsx');
    expect(value).toBe('202602141530_base_master_xlsx');
  });
});
