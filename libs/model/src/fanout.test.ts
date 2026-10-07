import { describe, expect, it } from 'vitest';
import {
  addVoice,
  angle,
  beats,
  displayAngles,
  emptyPattern,
  hitsInWindow,
  ringDistance,
  type Pattern,
  type Sound,
} from './index';

const stack = (sounds: readonly Sound[], distance = 3, turns = 0.5): Pattern =>
  sounds.reduce(
    (pattern, sound) =>
      addVoice(pattern, sound, { distance: ringDistance(distance), angle: angle(turns) }, true),
    emptyPattern,
  );

const shown = (pattern: Pattern): number[] => {
  const angles = displayAngles(pattern);
  return pattern.voices.map((voice) => angles.get(voice.id) ?? Number.NaN);
};

describe('fan-out', () => {
  it('shows a Voice that is alone at its own angle', () => {
    expect(shown(stack(['kick']))).toEqual([0.5]);
  });

  it('separates Voices sharing a position, evenly around their true angle', () => {
    const [kick, snare, tom] = shown(stack(['kick', 'snare', 'tom']));
    expect(snare).toBeCloseTo(0.5);
    expect(0.5 - (kick ?? 0)).toBeCloseTo((tom ?? 0) - 0.5);
    expect(kick).toBeLessThan(0.5);
  });

  it('orders a fan by Sound regardless of the order the Voices were placed in', () => {
    const [tom, kick] = shown(stack(['tom', 'kick']));
    expect(kick).toBeLessThan(tom ?? 0);
  });

  it('keeps the on-screen gap the same on every Ring', () => {
    const gap = (distance: number) => {
      const [a, b] = shown(stack(['kick', 'snare'], distance));
      return ((b ?? 0) - (a ?? 0)) * distance;
    };
    expect(gap(1)).toBeCloseTo(gap(5));
  });

  it('wraps around 12 o\'clock', () => {
    const [kick, snare] = shown(stack(['kick', 'snare'], 3, 0));
    expect(kick).toBeGreaterThan(0.9);
    expect(snare).toBeLessThan(0.1);
  });

  it('leaves Voices at different positions alone', () => {
    const pattern = addVoice(
      stack(['kick']),
      'snare',
      { distance: ringDistance(3), angle: angle(0.625) },
      true,
    );
    expect(shown(pattern)).toEqual([0.5, 0.625]);
  });

  it('is only visual: fanned Voices still hit at the same time', () => {
    const times = hitsInWindow(stack(['kick', 'snare']), beats(0), beats(1)).map((hit) => hit.at);
    expect(times).toEqual([0.5, 0.5]);
  });
});
