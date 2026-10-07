declare const brand: unique symbol;
/** A nominal type; brands compose, so a Period is also a time in Beats. */
export type Brand<T, Name extends string> = T & {
  readonly [brand]: { readonly [Key in Name]: true };
};

/** Distance from the Core in Ring units: 1 (first Ring) to 5 (last Ring), fractional in Free placement. */
export type RingDistance = Brand<number, 'RingDistance'>;
/** Angle around the Core in turns, clockwise from 12 o'clock, in [0, 1). */
export type Angle = Brand<number, 'Angle'>;
/** A time or duration on the musical timeline. */
export type Beats = Brand<number, 'Beats'>;
/** A time or duration on the audio clock. */
export type Seconds = Brand<number, 'Seconds'>;
/** Beats per minute, a whole number from 60 to 180. */
export type Tempo = Brand<number, 'Tempo'>;
/** The duration of one trip of a Pulse along its Link. */
export type Period = Brand<Beats, 'Period'>;
/** The offset of a Voice within its own Period, as a fraction of it in [0, 1). */
export type Phase = Brand<number, 'Phase'>;

/** The Rings by number, from the nearest to the Core (1/16 of a bar) to the farthest (1 bar). */
export const RINGS = [1, 2, 3, 4, 5] as const;
export type Ring = (typeof RINGS)[number];
export const RING_COUNT = RINGS.length;
export const ANGULAR_DIVISIONS = 8;
export const MIN_TEMPO = 60;
export const MAX_TEMPO = 180;
export const DEFAULT_TEMPO = 120 as Tempo;

const clamp = (value: number, min: number, max: number): number =>
  Number.isNaN(value) ? min : Math.min(Math.max(value, min), max);

export const ringDistance = (value: number): RingDistance =>
  clamp(value, 1, RING_COUNT) as RingDistance;

export const angle = (turns: number): Angle =>
  (Number.isFinite(turns) ? ((turns % 1) + 1) % 1 : 0) as Angle;

export const tempo = (bpm: number): Tempo =>
  Math.round(clamp(bpm, MIN_TEMPO, MAX_TEMPO)) as Tempo;

export const beats = (value: number): Beats => value as Beats;
export const seconds = (value: number): Seconds => value as Seconds;
