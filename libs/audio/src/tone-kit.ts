import type { Sound } from '@dotproducer/model';
import { Filter, Gain, MembraneSynth, NoiseSynth } from 'tone';
import type { BaseContext, InputNode } from 'tone';

type Trigger = (time: number) => void;

/** One set of the six Sounds, playing into its own bus. */
export interface ToneKit {
  /** Plays a Sound at an instant on the kit's context clock. */
  play(sound: Sound, at: number): void;
  /** From an instant on, lets every Sound of the kit through again. */
  open(at: number): void;
  /** From an instant on, keeps every Sound of the kit unheard, dropping any change scheduled after it. */
  close(at: number): void;
}

/** Monophonic synths reject two triggers at the same instant. */
const MIN_RETRIGGER_SECONDS = 0.005;

const membrane = (
  context: BaseContext,
  output: Gain,
  note: string,
  volume: number,
  pitchDecay: number,
  octaves: number,
  decay: number,
): Trigger => {
  const synth = new MembraneSynth({
    context,
    volume,
    pitchDecay,
    octaves,
    envelope: { attack: 0.001, decay, sustain: 0, release: 0.05 },
  }).connect(output);
  return (time) => synth.triggerAttackRelease(note, decay, time);
};

const noise = (
  context: BaseContext,
  output: Gain,
  volume: number,
  type: 'highpass' | 'bandpass',
  frequency: number,
  decay: number,
): Trigger => {
  const shaped = new Filter({ context, frequency, type }).connect(output);
  const synth = new NoiseSynth({
    context,
    volume,
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay, sustain: 0, release: 0.02 },
  }).connect(shaped);
  return (time) => synth.triggerAttackRelease(decay, time);
};

// ponytail: all six Sounds are synthesised. The spec wants CC0 samples for Clap,
// Closed Hat and Open Hat; swap those three triggers for Tone.Player once sourced.
/**
 * Builds the six Sounds and their bus on the given context, never on Tone's global
 * one, so a kit can live on an offline context while the live one keeps playing.
 * Hits are played in time order: no earlier than the context's clock, and a Sound
 * repeated within 5 ms is dropped.
 */
export const createToneKit = (context: BaseContext, destination: InputNode): ToneKit => {
  const bus = new Gain({ context, gain: 1 }).connect(destination);
  // The fixed mix: volumes in dB.
  const triggers: Readonly<Record<Sound, Trigger>> = {
    kick: membrane(context, bus, 'C1', -2, 0.05, 6, 0.4),
    snare: noise(context, bus, -8, 'bandpass', 1800, 0.18),
    clap: noise(context, bus, -6, 'bandpass', 1100, 0.12),
    closedHat: noise(context, bus, -16, 'highpass', 7000, 0.04),
    openHat: noise(context, bus, -18, 'highpass', 7000, 0.3),
    tom: membrane(context, bus, 'G2', -6, 0.08, 2, 0.3),
  };
  const lastTrigger = new Map<Sound, number>();
  return {
    open: (at) => void bus.gain.setValueAtTime(1, at),
    close: (at) => {
      bus.gain.cancelScheduledValues(at);
      bus.gain.setValueAtTime(0, at);
    },
    play: (sound, at) => {
      const time = Math.max(at, context.currentTime);
      if (time - (lastTrigger.get(sound) ?? -Infinity) < MIN_RETRIGGER_SECONDS) return;
      lastTrigger.set(sound, time);
      triggers[sound](time);
    },
  };
};
