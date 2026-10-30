import type { Seconds } from '@dotproducer/model';
import { getContext, start } from 'tone';
import type { AudioEngine } from './audio-engine';
import { createToneKit } from './tone-kit';

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
  };
};
