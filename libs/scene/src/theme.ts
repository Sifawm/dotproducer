import type { Sound } from '@dotproducer/model';

export type VoiceShape = 'circle' | 'ring' | 'square' | 'triangle' | 'diamond' | 'hexagon';

export interface SoundLook {
  readonly color: string;
  /** Tells Sounds apart without relying on colour. */
  readonly shape: VoiceShape;
  /** Relative size of the dot; 1 is the base size. */
  readonly size: number;
  readonly ripple: {
    /** Stroke width in pixels at birth. */
    readonly width: number;
    readonly seconds: number;
    /** How far the Ripple travels, in Ring spacings. */
    readonly reach: number;
  };
}

/** The slice of the shared design tokens the scene draws with. */
export interface SceneTheme {
  /** Colour of the Core, Rings and Links. */
  readonly ink: string;
  readonly sounds: Readonly<Record<Sound, SoundLook>>;
  readonly motion: {
    /** Time a dropped Voice takes to settle into place. */
    readonly settleSeconds: number;
    /** Length of the beat of the Core and of the cue on a Voice when a Pulse is born. */
    readonly cueSeconds: number;
  };
}
