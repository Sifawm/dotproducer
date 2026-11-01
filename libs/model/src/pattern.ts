import type { Sound } from './sound';
import {
  DEFAULT_TEMPO,
  DIVISIONS,
  angle,
  ringDistance,
  tempo,
  type Angle,
  type Brand,
  type MagnetMode,
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
  /** The Divisions the Magnet snaps to; kept while the Magnet is off. */
  readonly magnetMode: MagnetMode;
  readonly voices: readonly Voice[];
}

export const emptyPattern: Pattern = { tempo: DEFAULT_TEMPO, magnetMode: 'straight', voices: [] };

/**
 * Where a drop lands: on the nearest Ring and Division of the given mode, or as given
 * (Free placement) when there is nothing to snap to; always within the Rings.
 */
export const place = (position: Position, snap: MagnetMode | null): Position => {
  const distance = ringDistance(position.distance);
  const turns = angle(position.angle);
  if (!snap) return { distance, angle: turns };
  const divisions = DIVISIONS[snap];
  return {
    distance: ringDistance(Math.round(distance)),
    angle: angle(Math.round(turns * divisions) / divisions),
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
  snap: MagnetMode | null,
): Pattern => {
  const placed = place(position, snap);
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
  snap: MagnetMode | null,
): Pattern => {
  const moving = pattern.voices.find((voice) => voice.id === id);
  if (!moving) return pattern;
  const placed = place(position, snap);
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

export const setMagnetMode = (pattern: Pattern, magnetMode: MagnetMode): Pattern => ({
  ...pattern,
  magnetMode,
});

const RING_PREFERENCE: readonly Ring[] = [3, 4, 2, 5, 1];

/** The first Ring and Division of the Pattern's mode not yet taken by the given Sound, starting on Ring 3 on the beat. */
export const vacantPosition = (pattern: Pattern, sound: Sound): Position => {
  const divisions = DIVISIONS[pattern.magnetMode];
  for (const ring of RING_PREFERENCE) {
    for (let division = 0; division < divisions; division++) {
      const position = {
        distance: ringDistance(ring),
        angle: angle(division / divisions),
      };
      if (!occupant(pattern, sound, position)) return position;
    }
  }
  return { distance: ringDistance(3), angle: angle(0) };
};
