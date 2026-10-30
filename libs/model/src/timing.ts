import type { Pattern, Voice, VoiceId } from './pattern';
import type { Sound } from './sound';
import type { Angle, Beats, Period, Phase, RingDistance, Seconds, Tempo } from './units';

export const BEATS_PER_BAR = 4;
const FIRST_RING_PERIOD = BEATS_PER_BAR / 16;

/** 1/16 of a bar on the first Ring, doubling on each Ring after it, exponential in between. */
export const period = (distance: RingDistance): Period =>
  (FIRST_RING_PERIOD * 2 ** (distance - 1)) as Period;

export const phase = (turns: Angle): Phase => (turns as number) as Phase;

export const beatsToSeconds = (duration: Beats, tempo: Tempo): Seconds =>
  ((duration * 60) / tempo) as Seconds;

/** How far the Pulse of a Voice is along its Link: 0 at the Voice, approaching 1 at the Core. */
export const pulseProgress = (voice: Voice, at: Beats): number => {
  const cycles = at / period(voice.distance) - phase(voice.angle);
  return ((cycles % 1) + 1) % 1;
};

export interface Hit {
  readonly voiceId: VoiceId;
  readonly sound: Sound;
  readonly at: Beats;
}

/** The hits of every Voice that is not Muted within [from, to), in time order. */
export const hitsInWindow = (pattern: Pattern, from: Beats, to: Beats): readonly Hit[] => {
  const hits: Hit[] = [];
  for (const voice of pattern.voices) {
    if (voice.muted) continue;
    const length = period(voice.distance);
    const voicePhase = phase(voice.angle);
    const hitTime = (cycle: number): number => (cycle + voicePhase) * length;
    // Both window edges are compared against the same expression, so consecutive
    // windows never drop or repeat a hit to rounding.
    let cycle = Math.ceil(from / length - voicePhase);
    while (hitTime(cycle - 1) >= from) cycle--;
    while (hitTime(cycle) < from) cycle++;
    for (; hitTime(cycle) < to; cycle++) {
      hits.push({ voiceId: voice.id, sound: voice.sound, at: hitTime(cycle) as Beats });
    }
  }
  return hits.sort((a, b) => a.at - b.at);
};

/** An audio export always covers this many bars. */
export const EXPORTED_BARS = 4;

/**
 * The hits of an export: the first bars of playback after one pre-roll bar, Muted
 * Voices excluded. The first exported bar starts at 0, so pre-roll hits are negative;
 * the pre-roll is rendered for its tails and then discarded.
 */
export const exportedHits = (pattern: Pattern, bars: number): readonly Hit[] =>
  hitsInWindow(pattern, 0 as Beats, ((bars + 1) * BEATS_PER_BAR) as Beats).map((hit) => ({
    ...hit,
    at: (hit.at - BEATS_PER_BAR) as Beats,
  }));

/** Maps the audio clock onto the musical timeline; pausing and Tempo changes never make it jump. */
export interface Timeline {
  readonly tempo: Tempo;
  readonly running: boolean;
  readonly anchorBeats: Beats;
  readonly anchorSeconds: Seconds;
}

export const startTimeline = (tempo: Tempo, now: Seconds): Timeline => ({
  tempo,
  running: true,
  anchorBeats: 0 as Beats,
  anchorSeconds: now,
});

export const positionAt = (timeline: Timeline, now: Seconds): Beats =>
  (timeline.running
    ? timeline.anchorBeats + ((now - timeline.anchorSeconds) * timeline.tempo) / 60
    : timeline.anchorBeats) as Beats;

export const secondsAt = (timeline: Timeline, position: Beats): Seconds =>
  (timeline.anchorSeconds +
    beatsToSeconds((position - timeline.anchorBeats) as Beats, timeline.tempo)) as Seconds;

const anchoredAt = (timeline: Timeline, now: Seconds): Timeline => ({
  ...timeline,
  anchorBeats: positionAt(timeline, now),
  anchorSeconds: now,
});

export const pauseTimeline = (timeline: Timeline, now: Seconds): Timeline => ({
  ...anchoredAt(timeline, now),
  running: false,
});

export const resumeTimeline = (timeline: Timeline, now: Seconds): Timeline => ({
  ...timeline,
  anchorSeconds: now,
  running: true,
});

export const retimeTimeline = (timeline: Timeline, tempo: Tempo, now: Seconds): Timeline => ({
  ...anchoredAt(timeline, now),
  tempo,
});
