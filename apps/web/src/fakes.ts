import type { AudioEngine } from '@dotproducer/audio';
import {
  seconds,
  type AudioFormat,
  type Pattern,
  type Seconds,
  type Sound,
} from '@dotproducer/model';
import type { Scene, SceneIntent, SceneState } from '@dotproducer/scene';

/** A render the test finishes by hand, either way. */
export interface PendingRender {
  readonly pattern: Pattern;
  readonly format: AudioFormat;
  resolve(file: Blob): void;
  reject(error: Error): void;
}

/** An audio engine with a clock the test moves by hand, recording what it is asked to play and render. */
export class FakeAudioEngine implements AudioEngine {
  time = 0;
  unlocked = false;
  silences = 0;
  readonly played: { sound: Sound; at: Seconds }[] = [];
  readonly auditioned: Sound[] = [];
  readonly renders: PendingRender[] = [];

  unlock(): void {
    this.unlocked = true;
  }
  now(): Seconds {
    return seconds(this.time);
  }
  play(sound: Sound, at: Seconds): void {
    this.played.push({ sound, at });
  }
  audition(sound: Sound): void {
    this.auditioned.push(sound);
  }
  silence(): void {
    this.silences++;
  }
  render(pattern: Pattern, format: AudioFormat): Promise<Blob> {
    return new Promise((resolve, reject) => this.renders.push({ pattern, format, resolve, reject }));
  }
}

/** A scene without a canvas: it remembers the state it was given and lets the test act as the pointer. */
export class FakeScene implements Scene {
  state: SceneState | null = null;
  private readonly listeners = new Set<(intent: SceneIntent) => void>();

  mount(): void {}
  unmount(): void {}
  update(state: SceneState): void {
    this.state = state;
  }
  advance(): void {}
  onIntent(listener: (intent: SceneIntent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(intent: SceneIntent): void {
    this.listeners.forEach((listener) => listener(intent));
  }
}
