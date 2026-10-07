import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  addVoice,
  angle,
  beats,
  beatsToSeconds,
  emptyPattern,
  hitsInWindow,
  pauseTimeline,
  period,
  phase,
  positionAt,
  pulseProgress,
  resumeTimeline,
  retimeTimeline,
  ringDistance,
  seconds,
  secondsAt,
  startTimeline,
  tempo,
  toggleMuted,
  type Pattern,
  type Sound,
} from './index';

const withVoice = (pattern: Pattern, sound: Sound, distance: number, turns: number): Pattern =>
  addVoice(pattern, sound, { distance: ringDistance(distance), angle: angle(turns) }, false);

const first = (pattern: Pattern) => {
  const [voice] = pattern.voices;
  if (!voice) throw new Error('no voice');
  return voice;
};

describe('Period', () => {
  it('is 1/16 of a bar on the first Ring and doubles on each Ring after it', () => {
    expect([1, 2, 3, 4, 5].map((ring) => period(ringDistance(ring)))).toEqual([0.25, 0.5, 1, 2, 4]);
  });

  it('is interpolated exponentially between Rings', () => {
    expect(period(ringDistance(2.5))).toBeCloseTo(0.5 * Math.SQRT2);
    expect(period(ringDistance(2.5)) / period(ringDistance(2))).toBeCloseTo(
      period(ringDistance(3)) / period(ringDistance(2.5)),
    );
  });

  it('lasts longer in seconds at a slower Tempo', () => {
    expect(beatsToSeconds(period(ringDistance(5)), tempo(120))).toBe(2);
    expect(beatsToSeconds(period(ringDistance(5)), tempo(60))).toBe(4);
  });
});

describe('Phase', () => {
  it('is zero at 12 o\'clock and half a Period at 6 o\'clock', () => {
    expect(phase(angle(0))).toBe(0);
    expect(phase(angle(0.5))).toBe(0.5);
    expect(phase(angle(0.125))).toBe(0.125);
  });
});

describe('Pulse', () => {
  const onBeat = first(withVoice(emptyPattern, 'kick', 3, 0));
  const offBeat = first(withVoice(emptyPattern, 'kick', 3, 0.5));

  it('is born at the Voice on its hit and reaches the Core one Period later', () => {
    expect(pulseProgress(onBeat, beats(0))).toBe(0);
    expect(pulseProgress(onBeat, beats(0.25))).toBe(0.25);
    expect(pulseProgress(onBeat, beats(0.999))).toBeCloseTo(0.999);
    expect(pulseProgress(onBeat, beats(1))).toBe(0);
  });

  it('is offset by the Phase of its Voice', () => {
    expect(pulseProgress(offBeat, beats(0))).toBe(0.5);
    expect(pulseProgress(offBeat, beats(0.5))).toBe(0);
  });

  it('travels a far Link more slowly than a near one', () => {
    const far = first(withVoice(emptyPattern, 'kick', 5, 0));
    expect(pulseProgress(far, beats(1))).toBe(0.25);
  });

  it('depends only on the timeline position, also before it starts', () => {
    expect(pulseProgress(onBeat, beats(-0.25))).toBe(0.75);
  });
});

describe('hits', () => {
  const backbeat = withVoice(withVoice(emptyPattern, 'kick', 3, 0), 'snare', 3, 0.5);
  const sounds = (pattern: Pattern, from: number, to: number) =>
    hitsInWindow(pattern, beats(from), beats(to)).map((hit) => [hit.sound, hit.at]);

  it('alternate for a Kick at 12 o\'clock and a Snare at 6 o\'clock on the same Ring', () => {
    expect(sounds(backbeat, 0, 2)).toEqual([
      ['kick', 0],
      ['snare', 0.5],
      ['kick', 1],
      ['snare', 1.5],
    ]);
  });

  it('include the start of the window and exclude its end', () => {
    expect(sounds(backbeat, 0.5, 1)).toEqual([['snare', 0.5]]);
  });

  it('carry the Voice they come from', () => {
    const [hit] = hitsInWindow(backbeat, beats(0), beats(0.1));
    expect(hit?.voiceId).toBe(first(backbeat).id);
  });

  it('come four to a beat from the first Ring', () => {
    expect(sounds(withVoice(emptyPattern, 'closedHat', 1, 0), 0, 1)).toEqual([
      ['closedHat', 0],
      ['closedHat', 0.25],
      ['closedHat', 0.5],
      ['closedHat', 0.75],
    ]);
  });

  it('are not produced by Muted Voices, whose Pulses still travel', () => {
    const muted = toggleMuted(backbeat, first(backbeat).id);
    expect(sounds(muted, 0, 2)).toEqual([
      ['snare', 0.5],
      ['snare', 1.5],
    ]);
    expect(pulseProgress(first(muted), beats(0.25))).toBe(0.25);
  });

  it('are found exactly once across consecutive windows', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 5, noNaN: true }),
        fc.double({ min: 0, max: 0.999, noNaN: true }),
        fc.array(fc.double({ min: 0.001, max: 3, noNaN: true }), { minLength: 1, maxLength: 12 }),
        (distance, turns, steps) => {
          const pattern = withVoice(emptyPattern, 'tom', distance, turns);
          let cursor = 0;
          const pieces = steps.flatMap((step) => {
            const from = cursor;
            cursor += step;
            return hitsInWindow(pattern, beats(from), beats(cursor));
          });
          expect(pieces).toEqual(hitsInWindow(pattern, beats(0), beats(cursor)));
        },
      ),
    );
  });
});

describe('timeline', () => {
  const started = startTimeline(tempo(120), seconds(10));

  it('advances at the rate set by the Tempo', () => {
    expect(positionAt(started, seconds(10))).toBe(0);
    expect(positionAt(started, seconds(11))).toBe(2);
  });

  it('stops while paused and resumes from where it stopped', () => {
    const paused = pauseTimeline(started, seconds(11));
    expect(positionAt(paused, seconds(15))).toBe(2);
    const resumed = resumeTimeline(paused, seconds(20));
    expect(positionAt(resumed, seconds(20))).toBe(2);
    expect(positionAt(resumed, seconds(20.5))).toBe(3);
  });

  it('does not jump when the Tempo changes', () => {
    const slower = retimeTimeline(started, tempo(60), seconds(12));
    expect(positionAt(slower, seconds(12))).toBe(4);
    expect(positionAt(slower, seconds(13))).toBe(5);
  });

  it('keeps a Tempo change made while paused', () => {
    const paused = retimeTimeline(pauseTimeline(started, seconds(11)), tempo(60), seconds(12));
    expect(positionAt(paused, seconds(30))).toBe(2);
    expect(positionAt(resumeTimeline(paused, seconds(30)), seconds(31))).toBe(3);
  });

  it('tells when on the audio clock a timeline position falls', () => {
    expect(secondsAt(started, beats(3))).toBe(11.5);
    expect(secondsAt(retimeTimeline(started, tempo(60), seconds(12)), beats(6))).toBe(14);
  });

  it('spaces the hits of a Voice by its Period at the current Tempo', () => {
    const pattern = withVoice(emptyPattern, 'kick', 3, 0);
    const slower = retimeTimeline(started, tempo(60), seconds(12));
    const times = hitsInWindow(pattern, beats(3), beats(7)).map((hit) => secondsAt(slower, hit.at));
    expect(times).toEqual([11, 12, 13, 14]);
  });
});
