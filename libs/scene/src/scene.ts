import type { Beats, Pattern, Point, Size, Sound, VoiceId } from '@dotproducer/model';

export interface SceneState {
  readonly pattern: Pattern;
  readonly magnet: boolean;
  readonly playing: boolean;
  readonly focusedVoiceId: VoiceId | null;
}

/** A drop on the canvas; the application turns the point into a position through the model. */
interface Drop {
  readonly point: Point;
  readonly canvas: Size;
  /** True when the Magnet is inverted for this drag (Alt held). */
  readonly invertMagnet: boolean;
}

export type SceneIntent =
  | { readonly type: 'dockAuditioned'; readonly sound: Sound }
  /** A drag began, from the Dock (`voiceId` is null) or on an existing Voice. */
  | { readonly type: 'dragStarted'; readonly voiceId: VoiceId | null }
  /** A drag ended without any effect. */
  | { readonly type: 'dragCancelled' }
  | ({ readonly type: 'soundDropped'; readonly sound: Sound } & Drop)
  | ({ readonly type: 'voiceDropped'; readonly voiceId: VoiceId } & Drop)
  | { readonly type: 'voiceDroppedOnDock'; readonly voiceId: VoiceId }
  | { readonly type: 'voiceTapped'; readonly voiceId: VoiceId }
  /** The second of two quick taps on the same Voice; the first was already emitted as `voiceTapped`. */
  | { readonly type: 'voiceDoubleTapped'; readonly voiceId: VoiceId }
  | { readonly type: 'coreTapped' };

export interface Scene {
  mount(host: HTMLElement): void;
  unmount(): void;
  /** Receives the state to draw; the scene never changes the Pattern itself. */
  update(state: SceneState): void;
  /** Draws a frame for the given position on the musical timeline. */
  advance(position: Beats): void;
  /** Subscribes to user intents; returns the function that unsubscribes. */
  onIntent(listener: (intent: SceneIntent) => void): () => void;
}
