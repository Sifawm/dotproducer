import type { SceneTheme } from '@dotproducer/scene';

/**
 * The single set of design tokens: the scene draws with them and the HTML
 * controls read them as CSS custom properties, so the two cannot diverge.
 *
 * Provisional values, to be replaced by the design session.
 */
export const tokens = {
  ground: '#101116',
  ink: '#f3f1ea',
  font: 'ui-rounded, system-ui, sans-serif',
  sounds: {
    kick: {
      color: '#ff5d5d',
      shape: 'circle',
      size: 1.3,
      ripple: { width: 6, seconds: 0.6, reach: 5 },
    },
    snare: {
      color: '#ffc145',
      shape: 'square',
      size: 1,
      ripple: { width: 3, seconds: 0.35, reach: 3.5 },
    },
    clap: {
      color: '#ff8fd0',
      shape: 'triangle',
      size: 1,
      ripple: { width: 3, seconds: 0.3, reach: 3 },
    },
    closedHat: {
      color: '#5ce1e6',
      shape: 'diamond',
      size: 0.75,
      ripple: { width: 1, seconds: 0.18, reach: 2 },
    },
    openHat: {
      color: '#8ad88a',
      shape: 'ring',
      size: 0.95,
      ripple: { width: 1.5, seconds: 0.45, reach: 4 },
    },
    tom: {
      color: '#b79cff',
      shape: 'hexagon',
      size: 1.1,
      ripple: { width: 4, seconds: 0.45, reach: 4 },
    },
  },
  motion: { settleSeconds: 0.25, cueSeconds: 0.18, fadeSeconds: 0.4 },
} as const satisfies SceneTheme & { ground: string; font: string; motion: { fadeSeconds: number } };

export const applyTokens = (root: HTMLElement): void => {
  root.style.setProperty('--ground', tokens.ground);
  root.style.setProperty('--ink', tokens.ink);
  root.style.setProperty('--font', tokens.font);
  root.style.setProperty('--fade', `${tokens.motion.fadeSeconds}s`);
};
