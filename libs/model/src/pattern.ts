import type { Sound } from './sound';
import {
  ANGULAR_DIVISIONS,
  DEFAULT_TEMPO,
  angle,
  ringDistance,
  tempo,
  type Angle,
  type Brand,
  type Ring,
  type RingDistance,
  type Tempo,
} from './units';

export type VoiceId = Brand<number, 'VoiceId'>;

export interface Position {
  readonly distance: RingDistance;
  readonly angle: Angle;
}

export interface Voice extends Position {
  readonly id: VoiceId;
  readonly sound: Sound;
  readonly muted: boolean;
}

export interface Pattern {
  readonly tempo: Tempo;
  readonly voices: readonly Voice[];
}

export const emptyPattern: Pattern = { tempo: DEFAULT_TEMPO, voices: [] };

/** Where a drop lands: snapped to the Magnet grid when the Magnet is on, always within the Rings. */
export const place = (position: Position, magnet: boolean): Position => {
  const distance = ringDistance(position.distance);
  const turns = angle(position.angle);
  if (!magnet) return { distance, angle: turns };
  return {
    distance: ringDistance(Math.round(distance)),
    angle: angle(Math.round(turns * ANGULAR_DIVISIONS) / ANGULAR_DIVISIONS),
  };
};

const EPSILON = 1e-9;

export const samePosition = (a: Position, b: Position): boolean => {
  const turns = Math.abs(a.angle - b.angle);
  return Math.abs(a.distance - b.distance) < EPSILON && Math.min(turns, 1 - turns) < EPSILON;
};

const occupant = (pattern: Pattern, sound: Sound, position: Position, except?: VoiceId) =>
  pattern.voices.find(
    (voice) => voice.id !== except && voice.sound === sound && samePosition(voice, position),
  );

export const addVoice = (
  pattern: Pattern,
  sound: Sound,
  position: Position,
  magnet: boolean,
): Pattern => {
  const placed = place(position, magnet);
  if (occupant(pattern, sound, placed)) return pattern;
  const id = (Math.max(0, ...pattern.voices.map((voice) => voice.id)) + 1) as VoiceId;
  return { ...pattern, voices: [...pattern.voices, { id, sound, ...placed, muted: false }] };
};

export const removeVoice = (pattern: Pattern, id: VoiceId): Pattern => ({
  ...pattern,
  voices: pattern.voices.filter((voice) => voice.id !== id),
});

export const moveVoice = (
  pattern: Pattern,
  id: VoiceId,
  position: Position,
  magnet: boolean,
): Pattern => {
  const moving = pattern.voices.find((voice) => voice.id === id);
  if (!moving) return pattern;
  const placed = place(position, magnet);
  if (occupant(pattern, moving.sound, placed, id)) return removeVoice(pattern, id);
  return {
    ...pattern,
    voices: pattern.voices.map((voice) => (voice.id === id ? { ...voice, ...placed } : voice)),
  };
};

export const clearVoices = (pattern: Pattern): Pattern => ({ ...pattern, voices: [] });

export const toggleMuted = (pattern: Pattern, id: VoiceId): Pattern => ({
  ...pattern,
  voices: pattern.voices.map((voice) =>
    voice.id === id ? { ...voice, muted: !voice.muted } : voice,
  ),
});

/**
 * Mutes every Voice but the given one. When that Voice is already the only one
 * heard, every Voice is brought back instead.
 */
export const soloVoice = (pattern: Pattern, id: VoiceId): Pattern => {
  const alreadySolo = pattern.voices.every((voice) => voice.muted === (voice.id !== id));
  return {
    ...pattern,
    voices: pattern.voices.map((voice) => ({ ...voice, muted: !alreadySolo && voice.id !== id })),
  };
};

export const setTempo = (pattern: Pattern, bpm: number): Pattern => ({
  ...pattern,
  tempo: tempo(bpm),
});

const RING_PREFERENCE: readonly Ring[] = [3, 4, 2, 5, 1];

/** The first Ring and angular division not yet taken by the given Sound, starting on Ring 3 on the beat. */
export const vacantPosition = (pattern: Pattern, sound: Sound): Position => {
  for (const ring of RING_PREFERENCE) {
    for (let division = 0; division < ANGULAR_DIVISIONS; division++) {
      const position = {
        distance: ringDistance(ring),
        angle: angle(division / ANGULAR_DIVISIONS),
      };
      if (!occupant(pattern, sound, position)) return position;
    }
  }
  return { distance: ringDistance(3), angle: angle(0) };
};
