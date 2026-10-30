import {
  BEATS_PER_BAR,
  EXPORTED_BARS,
  beats,
  beatsToSeconds,
  exportedHits,
  type AudioFormat,
  type Pattern,
  type Seconds,
} from '@dotproducer/model';
import { Offline, getContext, start } from 'tone';
import type { AudioEngine } from './audio-engine';
import { createToneKit } from './tone-kit';
import { encodeMp3 } from './mp3';
import { encodeWav } from './wav';

const EXPORT_SAMPLE_RATE = 48000;
const EXPORT_CHANNELS = 2;

const ENCODERS: Readonly<Record<AudioFormat, (channels: readonly Float32Array[]) => Blob | Promise<Blob>>> = {
  wav: (channels) => new Blob([encodeWav(channels, EXPORT_SAMPLE_RATE)], { type: 'audio/wav' }),
  mp3: (channels) => encodeMp3(channels, EXPORT_SAMPLE_RATE),
};

/**
 * Renders the pre-roll bar and the exported bars on an offline context with a kit of
 * their own, then keeps only the exported bars: they open with the pre-roll's tails.
 */
const renderPattern = async (pattern: Pattern, format: AudioFormat): Promise<Blob> => {
  const bar = beatsToSeconds(beats(BEATS_PER_BAR), pattern.tempo);
  const rendered = await Offline(
    (context) => {
      const kit = createToneKit(context, context.destination);
      for (const hit of exportedHits(pattern, EXPORTED_BARS)) {
        kit.play(hit.sound, bar + beatsToSeconds(hit.at, pattern.tempo));
      }
    },
    (EXPORTED_BARS + 1) * bar,
    EXPORT_CHANNELS,
    EXPORT_SAMPLE_RATE,
  );
  const from = Math.round(bar * EXPORT_SAMPLE_RATE);
  const to = from + Math.round(EXPORTED_BARS * bar * EXPORT_SAMPLE_RATE);
  const channels = Array.from({ length: EXPORT_CHANNELS }, (_, channel) =>
    rendered.getChannelData(channel).subarray(from, to),
  );
  return ENCODERS[format](channels);
};

export const createToneAudioEngine = (): AudioEngine => {
  const context = getContext();
  const now = (): number => context.currentTime;
  // The Pattern is scheduled ahead of the clock, so auditioning gets a kit of its
  // own: a tap on the Dock must sound now, whatever is already queued.
  const pattern = createToneKit(context, context.destination);
  const auditionKit = createToneKit(context, context.destination);
  let silenced = false;

  return {
    unlock: () => void start(),
    now: () => now() as Seconds,
    play: (sound, at) => {
      if (silenced) {
        pattern.bus.gain.setValueAtTime(1, now());
        silenced = false;
      }
      pattern.play(sound, at);
    },
    audition: (sound) => auditionKit.play(sound, now()),
    // Closed until the next hit is scheduled, so tails and queued hits stay unheard.
    silence: () => {
      pattern.bus.gain.cancelScheduledValues(now());
      pattern.bus.gain.setValueAtTime(0, now());
      silenced = true;
    },
    render: renderPattern,
  };
};
