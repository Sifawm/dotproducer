import type { AudioFormat, Pattern, Seconds, Sound } from '@dotproducer/model';

export interface AudioEngine {
  /** Must be called from a user gesture; browsers keep audio blocked until then. */
  unlock(): void;
  /** The current time on the audio clock. */
  now(): Seconds;
  /** Schedules a Sound at an instant on the audio clock. */
  play(sound: Sound, at: Seconds): void;
  /** Plays a Sound right away, outside the Pattern. */
  audition(sound: Sound): void;
  /** Drops every Sound that is scheduled but not yet heard. */
  silence(): void;
  /**
   * Renders the exported bars of a Pattern offline, without disturbing playback,
   * and encodes them as a file of the given format.
   */
  render(pattern: Pattern, format: AudioFormat): Promise<Blob>;
}
