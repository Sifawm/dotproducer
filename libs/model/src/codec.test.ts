import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  SOUNDS,
  addVoice,
  angle,
  decodePattern,
  emptyPattern,
  encodePattern,
  ringDistance,
  setTempo,
  toggleMuted,
  type Pattern,
} from './index';

const at = (distance: number, turns: number) => ({
  distance: ringDistance(distance),
  angle: angle(turns),
});

const example = ((): Pattern => {
  const voices = addVoice(addVoice(emptyPattern, 'kick', at(3, 0), true), 'snare', at(3, 0.5), true);
  const snare = voices.voices[1];
  if (!snare) throw new Error('no voice');
  return setTempo(toggleMuted(voices, snare.id), 96);
})();

const patterns = fc
  .record({
    bpm: fc.integer({ min: 60, max: 180 }),
    voices: fc.array(
      fc.record({
        sound: fc.constantFrom(...SOUNDS),
        distance: fc.double({ min: 1, max: 5, noNaN: true }),
        turns: fc.double({ min: 0, max: 0.999, noNaN: true }),
        magnet: fc.boolean(),
        muted: fc.boolean(),
      }),
      { maxLength: 12 },
    ),
  })
  .map(({ bpm, voices }) =>
    voices.reduce((pattern, { sound, distance, turns, magnet, muted }) => {
      const added = addVoice(pattern, sound, at(distance, turns), magnet);
      const voice = added.voices[added.voices.length - 1];
      return muted && voice && added !== pattern ? toggleMuted(added, voice.id) : added;
    }, setTempo(emptyPattern, bpm)),
  );

describe('URL codec', () => {
  it('encodes a Pattern compactly behind a version marker', () => {
    expect(encodePattern(example)).toBe('v1~96~k3_0~S3_0.5');
  });

  it('decodes what it encoded, including Muted Voices and the Tempo', () => {
    expect(decodePattern('v1~96~k3_0~S3_0.5')).toEqual(example);
  });

  it('round-trips any Pattern exactly, Free placement included', () => {
    fc.assert(
      fc.property(patterns, (pattern) => {
        expect(decodePattern(encodePattern(pattern))).toEqual(pattern);
      }),
    );
  });

  it('yields an empty Pattern for unreadable input', () => {
    for (const text of ['', 'garbage', '~~~', 'v1', 'v2~120~k3_0', '%E0%A4%A', 'v1~~']) {
      expect(decodePattern(text)).toEqual(emptyPattern);
    }
  });

  it('drops the Voices it cannot interpret and keeps the rest', () => {
    const decoded = decodePattern('v1~120~k3_0~x1_0~s~h2~c2_~t_0.5~o1_abc~s4_0.25');
    expect(decoded.voices.map((voice) => voice.sound)).toEqual(['kick', 'snare']);
  });

  it('survives a truncated link', () => {
    expect(decodePattern('v1~96~k3_0~S3_').voices.map((voice) => voice.sound)).toEqual(['kick']);
    expect(decodePattern('v1~96~k3_0~S3_0.').voices).toHaveLength(2);
  });

  it('clamps out-of-range values', () => {
    const decoded = decodePattern('v1~999~k77_1.25~s-3_-0.25');
    expect(decoded.tempo).toBe(180);
    expect(decoded.voices).toMatchObject([
      { distance: 5, angle: 0.25 },
      { distance: 1, angle: 0.75 },
    ]);
  });

  it('falls back to the default Tempo when it is unreadable', () => {
    expect(decodePattern('v1~fast~k3_0')).toMatchObject({ tempo: 120, voices: [{ sound: 'kick' }] });
  });

  it('merges duplicated Voices in a tampered link', () => {
    expect(decodePattern('v1~120~k3_0~k3_0').voices).toHaveLength(1);
  });

  it('never throws', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        expect(() => decodePattern(text)).not.toThrow();
        expect(() => decodePattern(`v1~120~${text}`)).not.toThrow();
      }),
    );
  });
});
