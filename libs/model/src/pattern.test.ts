import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  addVoice,
  clearVoices,
  angle,
  emptyPattern,
  vacantPosition,
  moveVoice,
  place,
  removeVoice,
  ringDistance,
  setTempo,
  toggleMuted,
  type Pattern,
  type Position,
} from './index';

const at = (distance: number, turns: number): Position => ({
  distance: ringDistance(distance),
  angle: angle(turns),
});

const only = (pattern: Pattern) => {
  expect(pattern.voices).toHaveLength(1);
  const [voice] = pattern.voices;
  if (!voice) throw new Error('no voice');
  return voice;
};

describe('placement', () => {
  it('snaps to the nearer Ring and angular division when the Magnet is on', () => {
    expect(place(at(2.4, 0.49), true)).toEqual(at(2, 0.5));
    expect(place(at(2.6, 0.07), true)).toEqual(at(3, 0.125));
  });

  it('snaps an angle just before 12 o\'clock back to 12 o\'clock', () => {
    expect(place(at(1, 0.99), true)).toEqual(at(1, 0));
  });

  it('keeps distance and angle as given when the Magnet is off', () => {
    expect(place(at(2.4, 0.49), false)).toEqual(at(2.4, 0.49));
  });

  it('settles drops inside the first Ring or beyond the last one onto them', () => {
    expect(place(at(0.2, 0.3), false).distance).toBe(1);
    expect(place(at(9, 0.3), false).distance).toBe(5);
    expect(place(at(9, 0.3), true).distance).toBe(5);
  });

  it('always yields a distance within range', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        fc.boolean(),
        (distance, turns, magnet) => {
          const placed = place(at(distance, turns), magnet);
          expect(placed.distance).toBeGreaterThanOrEqual(1);
          expect(placed.distance).toBeLessThanOrEqual(5);
          expect(placed.angle).toBeGreaterThanOrEqual(0);
          expect(placed.angle).toBeLessThan(1);
        },
      ),
    );
  });
});

describe('Pattern operations', () => {
  it('starts empty at 120 BPM', () => {
    expect(emptyPattern).toEqual({ tempo: 120, voices: [] });
  });

  it('adds a Voice with its Sound at the placed position, not Muted', () => {
    const voice = only(addVoice(emptyPattern, 'kick', at(2.9, 0.26), true));
    expect(voice).toMatchObject({ sound: 'kick', distance: 3, angle: 0.25, muted: false });
  });

  it('gives every Voice its own identity', () => {
    const pattern = addVoice(addVoice(emptyPattern, 'kick', at(1, 0), true), 'kick', at(2, 0), true);
    const ids = pattern.voices.map((voice) => voice.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('never changes the Pattern it was given', () => {
    const before = addVoice(emptyPattern, 'kick', at(1, 0), true);
    const snapshot = structuredClone(before);
    addVoice(before, 'snare', at(2, 0), true);
    toggleMuted(before, only(before).id);
    expect(before).toEqual(snapshot);
  });

  it('moves a Voice, keeping its identity, Sound and Muted state', () => {
    const start = addVoice(emptyPattern, 'tom', at(1, 0), true);
    const id = only(start).id;
    const moved = only(moveVoice(toggleMuted(start, id), id, at(4.2, 0.6), true));
    expect(moved).toEqual({ id, sound: 'tom', distance: 4, angle: 0.625, muted: true });
  });

  it('removes a Voice', () => {
    const start = addVoice(emptyPattern, 'clap', at(1, 0), true);
    expect(removeVoice(start, only(start).id).voices).toEqual([]);
  });

  it('clears every Voice and keeps the Tempo', () => {
    const start = setTempo(addVoice(emptyPattern, 'clap', at(1, 0), true), 90);
    expect(clearVoices(start)).toEqual({ tempo: 90, voices: [] });
  });

  it('toggles Muted back and forth', () => {
    const start = addVoice(emptyPattern, 'clap', at(1, 0), true);
    const id = only(start).id;
    expect(only(toggleMuted(start, id)).muted).toBe(true);
    expect(only(toggleMuted(toggleMuted(start, id), id)).muted).toBe(false);
  });

  it('keeps the Tempo between 60 and 180 BPM in whole beats', () => {
    expect(setTempo(emptyPattern, 97.4).tempo).toBe(97);
    expect(setTempo(emptyPattern, 20).tempo).toBe(60);
    expect(setTempo(emptyPattern, 999).tempo).toBe(180);
  });
});

describe('merging', () => {
  const kick = addVoice(emptyPattern, 'kick', at(2, 0.5), true);

  it('merges a Voice added onto one of the same Sound at the same position', () => {
    expect(addVoice(kick, 'kick', at(2.1, 0.52), true)).toEqual(kick);
  });

  it('keeps Voices of different Sounds at the same position', () => {
    expect(addVoice(kick, 'snare', at(2, 0.5), true).voices).toHaveLength(2);
  });

  it('merges a Voice moved onto one of the same Sound at the same position', () => {
    const two = addVoice(kick, 'kick', at(4, 0), true);
    const movedId = two.voices[1]?.id;
    if (movedId === undefined) throw new Error('no voice');
    expect(moveVoice(two, movedId, at(2, 0.5), true)).toEqual(kick);
  });

  it('does not merge a Voice with itself when it is dropped where it was', () => {
    expect(moveVoice(kick, only(kick).id, at(2, 0.5), true)).toEqual(kick);
  });
});

describe('default keyboard position', () => {
  it('is on the Magnet grid and free for that Sound', () => {
    let pattern = emptyPattern;
    for (let count = 1; count <= 40; count++) {
      pattern = addVoice(pattern, 'kick', vacantPosition(pattern, 'kick'), true);
      expect(pattern.voices).toHaveLength(count);
    }
  });

  it('starts on Ring 3, on the beat', () => {
    expect(vacantPosition(emptyPattern, 'kick')).toEqual(at(3, 0));
  });
});
