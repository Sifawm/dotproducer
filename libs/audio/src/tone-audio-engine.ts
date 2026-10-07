import type { Seconds, Sound } from '@dotproducer/model';
import { Filter, Gain, MembraneSynth, NoiseSynth, getContext, start } from 'tone';
import type { AudioEngine } from './audio-engine';

type Trigger = (time: number) => void;

/** How long the output stays closed after `silence`; must cover the caller's scheduling lookahead. */
const SILENCE_SECONDS = 0.15;
/** Monophonic synths reject two triggers at the same instant. */
const MIN_RETRIGGER_SECONDS = 0.005;

const membrane = (
  output: Gain,
  note: string,
  volume: number,
  pitchDecay: number,
  octaves: number,
  decay: number,
): Trigger => {
  const synth = new MembraneSynth({
    volume,
    pitchDecay,
    octaves,
    envelope: { attack: 0.001, decay, sustain: 0, release: 0.05 },
  }).connect(output);
  return (time) => synth.triggerAttackRelease(note, decay, time);
};

const noise = (
  output: Gain,
  volume: number,
  filter: 'highpass' | 'bandpass',
  frequency: number,
  decay: number,
): Trigger => {
  const shaped = new Filter(frequency, filter).connect(output);
  const synth = new NoiseSynth({
    volume,
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay, sustain: 0, release: 0.02 },
  }).connect(shaped);
  return (time) => synth.triggerAttackRelease(decay, time);
};

// ponytail: all six Sounds are synthesised. The spec wants CC0 samples for Clap,
// Closed Hat and Open Hat; swap those three triggers for Tone.Player once sourced.
export const createToneAudioEngine = (): AudioEngine => {
  const output = new Gain(1).toDestination();
  // The fixed mix: volumes in dB.
  const triggers: Readonly<Record<Sound, Trigger>> = {
    kick: membrane(output, 'C1', -2, 0.05, 6, 0.4),
    snare: noise(output, -8, 'bandpass', 1800, 0.18),
    clap: noise(output, -6, 'bandpass', 1100, 0.12),
    closedHat: noise(output, -16, 'highpass', 7000, 0.04),
    openHat: noise(output, -18, 'highpass', 7000, 0.3),
    tom: membrane(output, 'G2', -6, 0.08, 2, 0.3),
  };
  const lastTrigger = new Map<Sound, number>();
  const now = (): number => getContext().currentTime;

  const play = (sound: Sound, at: number): void => {
    const time = Math.max(at, now());
    if (time - (lastTrigger.get(sound) ?? -Infinity) < MIN_RETRIGGER_SECONDS) return;
    lastTrigger.set(sound, time);
    triggers[sound](time);
  };

  return {
    unlock: () => void start(),
    now: () => now() as Seconds,
    play,
    audition: (sound) => play(sound, now()),
    silence: () => {
      const time = now();
      output.gain.cancelScheduledValues(time);
      output.gain.setValueAtTime(0, time);
      output.gain.setValueAtTime(1, time + SILENCE_SECONDS);
    },
  };
};
