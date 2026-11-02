import { describe, expect, it } from 'vitest';
import { DIVISIONS, EXAMPLES, decodePattern, encodePattern } from './index';

describe('Examples', () => {
  it('offers techno, breakbeat and shuffle, in that order', () => {
    expect(EXAMPLES.map((example) => example.name)).toEqual(['techno', 'breakbeat', 'shuffle']);
  });

  it('brings each style its own Tempo and Straight or Triplet', () => {
    const settings = EXAMPLES.map(({ encoded }) => {
      const { tempo, magnetMode } = decodePattern(encoded);
      return { tempo, magnetMode };
    });
    expect(settings).toEqual([
      { tempo: 128, magnetMode: 'straight' },
      { tempo: 132, magnetMode: 'straight' },
      { tempo: 96, magnetMode: 'triplet' },
    ]);
  });

  describe.each(EXAMPLES)('$name', ({ encoded }) => {
    const pattern = decodePattern(encoded);

    it('decodes to a non-empty Pattern', () => {
      expect(pattern.voices.length).toBeGreaterThan(0);
    });

    it('encodes back to exactly the same link', () => {
      expect(encodePattern(pattern)).toBe(encoded);
    });

    it('puts every Voice on a Ring and on a Division of its own mode', () => {
      const divisions = DIVISIONS[pattern.magnetMode];
      for (const voice of pattern.voices) {
        expect(Number.isInteger(voice.distance)).toBe(true);
        const steps = voice.angle * divisions;
        expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
      }
    });
  });
});
