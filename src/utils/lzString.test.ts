import { describe, expect, it } from 'vitest';
import { compressToUTF16, decompressFromUTF16 } from './lzString';

describe('lzString utf16 codec', () => {
  it('restores original content after compression', () => {
    const payload = JSON.stringify({
      runs: Array.from({ length: 50 }, (_, index) => ({ id: `run-${index}`, steps: index * 2, name: 'Heatmap enterprise' })),
      layout: { width: 80, height: 40, title: 'Layout Norte' },
    });

    const compressed = compressToUTF16(payload);
    const restored = decompressFromUTF16(compressed);

    expect(restored).toBe(payload);
    expect(compressed.length).toBeGreaterThan(0);
  });
});
