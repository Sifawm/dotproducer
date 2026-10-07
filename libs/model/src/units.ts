declare const brand: unique symbol;
type Brand<T, Name extends string> = T & { readonly [brand]: Name };

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
export type Period = Beats;
/** The offset of a Voice within its own Period, as a fraction of it in [0, 1). */
export type Phase = Brand<number, 'Phase'>;

export const RING_COUNT = 5;
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
