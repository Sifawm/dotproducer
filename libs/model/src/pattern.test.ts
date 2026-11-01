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
  setMagnetMode,
  setTempo,
  soloVoice,
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
  it('snaps to the nearer Ring and of the 8 Divisions in Straight', () => {
    expect(place(at(2.4, 0.49), 'straight')).toEqual(at(2, 0.5));
    expect(place(at(2.6, 0.07), 'straight')).toEqual(at(3, 0.125));
  });

  it('snaps an angle just before 12 o\'clock back to 12 o\'clock', () => {
    expect(place(at(1, 0.99), 'straight')).toEqual(at(1, 0));
  });

  it('snaps to the nearer Ring and of the 12 Divisions in Triplet', () => {
    expect(place(at(2.6, 0.65), 'triplet')).toEqual(at(3, 2 / 3));
    expect(place(at(3.1, 0.3), 'triplet')).toEqual(at(3, 1 / 3));
    expect(place(at(1.4, 0.07), 'triplet')).toEqual(at(1, 1 / 12));
  });

  it('lands exactly on the third, so the angle is written in a link as 2/3 is', () => {
    expect(place(at(3, 0.65), 'triplet').angle).toBe(2 / 3);
  });

  it('snaps an angle just before 12 o\'clock back to 12 o\'clock in Triplet', () => {
    expect(place(at(1, 0.97), 'triplet')).toEqual(at(1, 0));
  });

  it('keeps distance and angle as given with nothing to snap to', () => {
    expect(place(at(2.4, 0.49), null)).toEqual(at(2.4, 0.49));
  });

  it('settles drops inside the first Ring or beyond the last one onto them', () => {
    expect(place(at(0.2, 0.3), null).distance).toBe(1);
    expect(place(at(9, 0.3), null).distance).toBe(5);
    expect(place(at(9, 0.3), 'straight').distance).toBe(5);
  });

  it('always yields a distance within range', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        fc.constantFrom('straight' as const, 'triplet' as const, null),
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
    expect(emptyPattern).toEqual({ tempo: 120, magnetMode: 'straight', voices: [] });
  });

  it('switches between Straight and Triplet without moving any Voice', () => {
    const start = addVoice(emptyPattern, 'kick', at(2, 0.125), 'straight');
    const triplet = setMagnetMode(start, 'triplet');
    expect(triplet).toEqual({ ...start, magnetMode: 'triplet' });
    expect(setMagnetMode(triplet, 'straight')).toEqual(start);
  });

  it('adds a Voice with its Sound at the placed position, not Muted', () => {
    const voice = only(addVoice(emptyPattern, 'kick', at(2.9, 0.26), 'straight'));
    expect(voice).toMatchObject({ sound: 'kick', distance: 3, angle: 0.25, muted: false });
  });

  it('gives every Voice its own identity', () => {
    const pattern = addVoice(addVoice(emptyPattern, 'kick', at(1, 0), 'straight'), 'kick', at(2, 0), 'straight');
    const ids = pattern.voices.map((voice) => voice.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('never changes the Pattern it was given', () => {
    const before = addVoice(emptyPattern, 'kick', at(1, 0), 'straight');
    const snapshot = structuredClone(before);
    addVoice(before, 'snare', at(2, 0), 'straight');
    toggleMuted(before, only(before).id);
    expect(before).toEqual(snapshot);
  });

  it('moves a Voice, keeping its identity, Sound and Muted state', () => {
    const start = addVoice(emptyPattern, 'tom', at(1, 0), 'straight');
    const id = only(start).id;
    const moved = only(moveVoice(toggleMuted(start, id), id, at(4.2, 0.6), 'straight'));
    expect(moved).toEqual({ id, sound: 'tom', distance: 4, angle: 0.625, muted: true });
  });

  it('removes a Voice', () => {
    const start = addVoice(emptyPattern, 'clap', at(1, 0), 'straight');
    expect(removeVoice(start, only(start).id).voices).toEqual([]);
  });

  it('clears every Voice and keeps the Tempo and Triplet', () => {
    const start = setMagnetMode(setTempo(addVoice(emptyPattern, 'clap', at(1, 0), 'straight'), 90), 'triplet');
    expect(clearVoices(start)).toEqual({ tempo: 90, magnetMode: 'triplet', voices: [] });
  });

  it('toggles Muted back and forth', () => {
    const start = addVoice(emptyPattern, 'clap', at(1, 0), 'straight');
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

describe('solo', () => {
  const three = (['kick', 'snare', 'tom'] as const).reduce(
    (pattern, sound, index) => addVoice(pattern, sound, at(index + 1, 0), 'straight'),
    emptyPattern,
  );
  const snareId = three.voices[1]?.id;
  if (snareId === undefined) throw new Error('no voice');
  const muted = (pattern: Pattern) => pattern.voices.map((voice) => voice.muted);

  it('mutes every other Voice', () => {
    expect(muted(soloVoice(three, snareId))).toEqual([true, false, true]);
  });

  it('unmutes the Voice itself if it was Muted', () => {
    expect(muted(soloVoice(toggleMuted(three, snareId), snareId))).toEqual([true, false, true]);
  });

  it('brings every Voice back when the Voice is already the only one heard', () => {
    expect(soloVoice(soloVoice(three, snareId), snareId)).toEqual(three);
  });
});

describe('merging', () => {
  const kick = addVoice(emptyPattern, 'kick', at(2, 0.5), 'straight');

  it('merges a Voice added onto one of the same Sound at the same position', () => {
    expect(addVoice(kick, 'kick', at(2.1, 0.52), 'straight')).toEqual(kick);
  });

  it('keeps Voices of different Sounds at the same position', () => {
    expect(addVoice(kick, 'snare', at(2, 0.5), 'straight').voices).toHaveLength(2);
  });

  it('merges a Voice moved onto one of the same Sound at the same position', () => {
    const two = addVoice(kick, 'kick', at(4, 0), 'straight');
    const movedId = two.voices[1]?.id;
    if (movedId === undefined) throw new Error('no voice');
    expect(moveVoice(two, movedId, at(2, 0.5), 'straight')).toEqual(kick);
  });

  it('does not merge a Voice with itself when it is dropped where it was', () => {
    expect(moveVoice(kick, only(kick).id, at(2, 0.5), 'straight')).toEqual(kick);
  });
});

describe('default keyboard position', () => {
  it('is on the Magnet grid and free for that Sound', () => {
    let pattern = emptyPattern;
    for (let count = 1; count <= 40; count++) {
      pattern = addVoice(pattern, 'kick', vacantPosition(pattern, 'kick'), 'straight');
      expect(pattern.voices).toHaveLength(count);
    }
  });

  it('starts on Ring 3, on the beat', () => {
    expect(vacantPosition(emptyPattern, 'kick')).toEqual(at(3, 0));
  });

  it('steps through the 12 Divisions in Triplet', () => {
    let pattern = setMagnetMode(emptyPattern, 'triplet');
    for (let count = 1; count <= 60; count++) {
      pattern = addVoice(pattern, 'kick', vacantPosition(pattern, 'kick'), 'triplet');
      expect(pattern.voices).toHaveLength(count);
    }
    expect(pattern.voices[1]).toMatchObject(at(3, 1 / 12));
  });
});
