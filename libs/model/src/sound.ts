/** The closed set of Sounds, in Dock order. */
export const SOUNDS = ['kick', 'snare', 'clap', 'closedHat', 'openHat', 'tom'] as const;
export type Sound = (typeof SOUNDS)[number];
