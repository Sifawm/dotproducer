import type { Sound } from '@dotproducer/model';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { FakeAudioEngine, FakeScene } from './fakes';

// Ring spacing is 100 on this canvas and the Core sits at (700, 700).
const canvas = { width: 1400, height: 1400 };
const ring3OnTheBeat = { x: 700, y: 400 };
const ring3OffTheBeat = { x: 700, y: 1000 };

let audio: FakeAudioEngine;
let scene: FakeScene;
const user = userEvent.setup({ delay: null });

const open = (hash = ''): void => {
  window.history.replaceState(null, '', `/${hash}`);
  render(<App audio={audio} scene={scene} />);
};

/** Lets real time pass: the audio clock and the timers move together. */
const wait = (duration: number): void => {
  for (let elapsed = 0; elapsed < duration; elapsed += 0.025) {
    act(() => {
      audio.time += 0.025;
      vi.advanceTimersByTime(25);
    });
  }
};

const drop = (sound: Sound, point = ring3OnTheBeat, invertMagnet = false): void => {
  act(() => scene.emit({ type: 'dragStarted', voiceId: null }));
  act(() => scene.emit({ type: 'soundDropped', sound, point, canvas, invertMagnet }));
};

const voiceIds = () => scene.state?.pattern.voices.map((voice) => voice.id) ?? [];
const firstVoiceId = () => {
  const [id] = voiceIds();
  if (id === undefined) throw new Error('no Voice in the scene');
  return id;
};
const playedTimes = (sound?: Sound) =>
  audio.played.filter((hit) => !sound || hit.sound === sound).map((hit) => hit.at as number);
const gaps = (times: readonly number[]) => times.slice(1).map((time, index) => time - (times[index] ?? 0));
const voiceButtons = () =>
  screen.queryAllByRole('button').filter((button) => button.closest('[aria-label="Voices"]'));
const status = () => screen.getByRole('status').textContent;
const hint = () => screen.queryByText('Drag a dot onto the canvas', { ignore: '[aria-hidden="true"]' });

beforeEach(() => {
  // Only the timers the application runs on; Testing Library needs a real setTimeout.
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame'],
  });
  audio = new FakeAudioEngine();
  audio.time = 10;
  scene = new FakeScene();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('first visit', () => {
  it('shows a hint that goes away on the first drag and never returns', () => {
    open();
    expect(hint()).not.toBeNull();
    drop('kick');
    expect(hint()).toBeNull();
    act(() => scene.emit({ type: 'voiceDroppedOnDock', voiceId: firstVoiceId() }));
    expect(voiceButtons()).toHaveLength(0);
    expect(hint()).toBeNull();
  });

  it('plays a Sound when its Dock dot is tapped, without creating a Voice', () => {
    open();
    act(() => scene.emit({ type: 'dockAuditioned', sound: 'clap' }));
    expect(audio.unlocked).toBe(true);
    expect(audio.auditioned).toEqual(['clap']);
    expect(voiceButtons()).toHaveLength(0);
  });

  it('is silent until something is placed', () => {
    open();
    wait(2);
    expect(audio.unlocked).toBe(false);
    expect(audio.played).toEqual([]);
  });
});

describe('playing', () => {
  it('starts with the first Voice dropped and hits once per Period', () => {
    open();
    drop('kick');
    expect(audio.unlocked).toBe(true);
    wait(2);
    const times = playedTimes('kick');
    expect(times.length).toBeGreaterThanOrEqual(4);
    expect(times[0]).toBeGreaterThanOrEqual(10);
    expect(times[0]).toBeLessThan(10.2);
    // Ring 3 is a quarter of a bar: half a second at 120 BPM.
    for (const gap of gaps(times)) expect(gap).toBeCloseTo(0.5);
  });

  it('schedules hits ahead of the audio clock, never late', () => {
    open();
    drop('closedHat', { x: 700, y: 600 });
    wait(1);
    const before = audio.played.length;
    act(() => {
      audio.time += 0.025;
      vi.advanceTimersByTime(25);
    });
    for (const hit of audio.played.slice(before)) expect(hit.at).toBeGreaterThan(audio.time);
  });

  it('alternates a Kick at 12 o\'clock and a Snare at 6 o\'clock on the same Ring', () => {
    open();
    drop('kick', ring3OnTheBeat);
    drop('snare', ring3OffTheBeat);
    wait(2);
    const [kick = 0, nextKick = 0] = playedTimes('kick').slice(-2);
    const snare = playedTimes('snare').find((time) => time > kick && time < nextKick);
    expect((snare ?? 0) - kick).toBeCloseTo(0.25);
  });

  it('gives the scene the Pattern to draw', () => {
    open();
    drop('tom');
    expect(scene.state?.pattern.voices).toMatchObject([{ sound: 'tom', distance: 3, angle: 0 }]);
    expect(scene.state?.playing).toBe(true);
  });

  it('pauses on the Core and resumes from where it stopped', () => {
    open();
    drop('kick');
    wait(1.2);
    act(() => scene.emit({ type: 'coreTapped' }));
    expect(audio.silences).toBe(1);
    expect(scene.state?.playing).toBe(false);
    const pausedAt = audio.time;
    const heardBeforePause = playedTimes().filter((time) => time <= pausedAt);
    const lastHeard = heardBeforePause[heardBeforePause.length - 1] ?? 0;
    const scheduled = audio.played.length;

    wait(3);
    expect(audio.played).toHaveLength(scheduled);

    act(() => scene.emit({ type: 'coreTapped' }));
    const resumedAt = audio.time;
    wait(1);
    const next = playedTimes().find((time) => time >= resumedAt) ?? 0;
    // The time since the last hit, with the pause taken out, is still one Period.
    expect(pausedAt - lastHeard + (next - resumedAt)).toBeCloseTo(0.5);
  });

  it('keeps playing a held Voice from where it was, and stays in time on drop', () => {
    open();
    drop('kick');
    wait(1);
    const id = firstVoiceId();
    act(() => scene.emit({ type: 'dragStarted', voiceId: id }));
    const picked = audio.played.length;
    wait(2);
    expect(audio.played.length).toBeGreaterThanOrEqual(picked + 3);

    act(() =>
      scene.emit({ type: 'voiceDropped', voiceId: id, point: ring3OnTheBeat, canvas, invertMagnet: false }),
    );
    wait(1);
    // One unbroken half-second grid: before, while held and after the drop.
    for (const gap of gaps(playedTimes())) expect(gap).toBeCloseTo(0.5);
  });

  it('follows the Tempo', async () => {
    open();
    drop('kick');
    screen.getByRole('spinbutton', { name: 'Tempo' }).focus();
    for (let presses = 0; presses < 6; presses++) await user.keyboard('{PageDown}');
    expect(screen.getByRole('spinbutton')).toHaveProperty('ariaValueNow', '60');
    wait(0.3);
    const from = audio.played.length;
    wait(4);
    for (const gap of gaps(playedTimes().slice(from))) expect(gap).toBeCloseTo(1);
  });
});

describe('Magnet', () => {
  const nearRing3 = { x: 700, y: 440 };

  it('snaps drops to the Rings by default', () => {
    open();
    drop('kick', nearRing3);
    expect(scene.state?.pattern.voices[0]?.distance).toBe(3);
  });

  it('allows Free placement when turned off, without moving what is already placed', async () => {
    open();
    await user.click(screen.getByRole('button', { name: 'Magnet' }));
    expect(scene.state?.magnet).toBe(false);
    drop('kick', nearRing3);
    expect(scene.state?.pattern.voices[0]?.distance).toBeCloseTo(2.6);
    await user.click(screen.getByRole('button', { name: 'Magnet' }));
    expect(scene.state?.pattern.voices[0]?.distance).toBeCloseTo(2.6);
  });

  it('is inverted for one drag while Alt is held', () => {
    open();
    drop('kick', nearRing3, true);
    expect(scene.state?.pattern.voices[0]?.distance).toBeCloseTo(2.6);
  });
});

describe('pointer intents', () => {
  it('toggles Muted on a tapped Voice, which then stops hitting', () => {
    open();
    drop('kick');
    wait(1);
    act(() => scene.emit({ type: 'voiceTapped', voiceId: firstVoiceId() }));
    expect(scene.state?.pattern.voices[0]?.muted).toBe(true);
    wait(0.2);
    const muted = audio.played.length;
    wait(2);
    expect(audio.played).toHaveLength(muted);
    act(() => scene.emit({ type: 'voiceTapped', voiceId: firstVoiceId() }));
    wait(1);
    expect(audio.played.length).toBeGreaterThan(muted);
  });

  it('mutes the rest on a double tap, as a single step of history, and back again', () => {
    open('#v1~120~k3_0~s3_0.5~t4_0');
    const before = window.history.length;
    const doubleTap = (): void => {
      act(() => scene.emit({ type: 'voiceTapped', voiceId: firstVoiceId() }));
      act(() => scene.emit({ type: 'voiceDoubleTapped', voiceId: firstVoiceId() }));
    };
    doubleTap();
    expect(window.location.hash).toBe('#v1~120~k3_0~S3_0.5~T4_0');
    expect(window.history.length).toBe(before + 1);
    expect(status()).toBe('Kick solo');

    act(() => scene.emit({ type: 'coreTapped' }));
    wait(2);
    expect(new Set(audio.played.map((hit) => hit.sound))).toEqual(new Set(['kick']));

    doubleTap();
    expect(window.location.hash).toBe('#v1~120~k3_0~s3_0.5~t4_0');
    expect(status()).toBe('All Voices unmuted');
  });

  it('moves a dropped Voice and removes one dropped on the Dock', () => {
    open();
    drop('kick');
    const id = firstVoiceId();
    act(() => scene.emit({ type: 'dragStarted', voiceId: id }));
    act(() =>
      scene.emit({ type: 'voiceDropped', voiceId: id, point: ring3OffTheBeat, canvas, invertMagnet: false }),
    );
    expect(scene.state?.pattern.voices).toMatchObject([{ id, angle: 0.5 }]);
    act(() => scene.emit({ type: 'voiceDroppedOnDock', voiceId: id }));
    expect(scene.state?.pattern.voices).toEqual([]);
  });
});

describe('clearing', () => {
  it('offers nothing to clear on an empty canvas', () => {
    open();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('removes every Voice in one step that Back can undo, keeping the Tempo', async () => {
    open('#v1~96~k3_0~s3_0.5');
    const before = window.history.length;
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(voiceButtons()).toHaveLength(0);
    expect(scene.state?.pattern.voices).toEqual([]);
    expect(status()).toBe('Pattern cleared');
    expect(window.location.hash).toBe('#v1~96');
    expect(window.history.length).toBe(before + 1);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('stops the hits', async () => {
    open();
    drop('kick');
    wait(1);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    wait(0.2);
    const cleared = audio.played.length;
    wait(2);
    expect(audio.played).toHaveLength(cleared);
  });
});

describe('keyboard', () => {
  it('creates, moves, mutes and removes a Voice, announcing each change', async () => {
    open();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add Kick' }));
    await user.keyboard('{Enter}');
    expect(status()).toBe('Kick added, Ring 3, on the beat');
    expect(audio.unlocked).toBe(true);

    const voice = screen.getByRole('button', { name: 'Kick, Ring 3, on the beat' });
    act(() => voice.focus());
    expect(scene.state?.focusedVoiceId).toBe(firstVoiceId());

    await user.keyboard('{ArrowUp}');
    expect(status()).toBe('Kick moved to Ring 4, on the beat');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Kick, Ring 2, 1/8 past the beat' }),
    );
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(status()).toBe('Kick moved to Ring 2, 7/8 past the beat');

    await user.keyboard('{Enter}');
    expect(status()).toBe('Kick muted');
    expect(screen.getByRole('button', { name: 'Kick, Ring 2, 7/8 past the beat, muted' })).toBeTruthy();
    await user.keyboard('{Enter}');
    expect(status()).toBe('Kick unmuted');

    await user.keyboard('{Delete}');
    expect(status()).toBe('Kick removed');
    expect(voiceButtons()).toHaveLength(0);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Pause' }));
    expect(scene.state?.focusedVoiceId).toBeNull();
  });

  it('mutes the rest with S on the focused Voice', async () => {
    open('#v1~120~k3_0~s3_0.5');
    act(() => screen.getByRole('button', { name: 'Snare, Ring 3, off the beat' }).focus());
    await user.keyboard('s');
    expect(status()).toBe('Snare solo');
    expect(voiceButtons().map((button) => button.textContent)).toEqual([
      'Kick, Ring 3, on the beat, muted',
      'Snare, Ring 3, off the beat',
    ]);
  });

  it('adds every new Voice of a Sound at its own position', async () => {
    open();
    await user.click(screen.getByRole('button', { name: 'Add Snare' }));
    await user.click(screen.getByRole('button', { name: 'Add Snare' }));
    expect(voiceButtons().map((button) => button.textContent)).toEqual([
      'Snare, Ring 3, on the beat',
      'Snare, Ring 3, 1/8 past the beat',
    ]);
  });

  it('reaches the Dock, the Voices, the Core, the Tempo and the Magnet in order', async () => {
    open('#v1~120~k3_0');
    const stops: (string | null)[] = [];
    for (let presses = 0; presses < 10; presses++) {
      await user.tab();
      stops.push(document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? null);
    }
    expect(stops).toEqual([
      'Add Kick',
      'Add Snare',
      'Add Clap',
      'Add Closed Hat',
      'Add Open Hat',
      'Add Tom',
      'Kick, Ring 3, on the beat',
      'Play',
      'Tempo',
      'Magnet',
    ]);
  });

  it('pauses and resumes from the Core', async () => {
    open();
    drop('kick');
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(status()).toBe('Paused');
    expect(scene.state?.playing).toBe(false);
    screen.getByRole('button', { name: 'Play' }).focus();
    await user.keyboard(' ');
    expect(status()).toBe('Playing');
    expect(scene.state?.playing).toBe(true);
  });

  it('changes the Tempo with the arrow keys, within its range', async () => {
    open();
    const tempo = screen.getByRole('spinbutton', { name: 'Tempo' });
    expect(tempo.textContent).toBe('120');
    tempo.focus();
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowDown}');
    expect(tempo.textContent).toBe('121');
    for (let presses = 0; presses < 8; presses++) await user.keyboard('{PageUp}');
    expect(tempo.textContent).toBe('180');
  });
});

describe('URL', () => {
  it('holds the Pattern after each committed change', async () => {
    open();
    expect(window.location.hash).toBe('');
    drop('kick');
    expect(window.location.hash).toBe('#v1~120~k3_0');
    drop('snare', ring3OffTheBeat);
    expect(window.location.hash).toBe('#v1~120~k3_0~s3_0.5');
    act(() => scene.emit({ type: 'voiceTapped', voiceId: firstVoiceId() }));
    expect(window.location.hash).toBe('#v1~120~K3_0~s3_0.5');
    act(() => scene.emit({ type: 'voiceDroppedOnDock', voiceId: firstVoiceId() }));
    expect(window.location.hash).toBe('#v1~120~s3_0.5');
    screen.getByRole('spinbutton', { name: 'Tempo' }).focus();
    await user.keyboard('{ArrowUp}');
    expect(window.location.hash).toBe('#v1~121~s3_0.5');
  });

  it('adds one history entry per committed change', () => {
    open();
    const before = window.history.length;
    drop('kick');
    drop('snare', ring3OffTheBeat);
    expect(window.history.length).toBe(before + 2);
  });

  it('adds one history entry for a Tempo key that is held down', async () => {
    open();
    drop('kick');
    const before = window.history.length;
    screen.getByRole('spinbutton', { name: 'Tempo' }).focus();
    await user.keyboard('{ArrowUp>5/}');
    expect(window.location.hash).toBe('#v1~125~k3_0');
    expect(window.history.length).toBe(before + 1);
  });

  it('leaves history alone when nothing changes', async () => {
    open();
    const before = window.history.length;
    for (let presses = 0; presses < 10; presses++) await user.tab();
    expect(window.history.length).toBe(before);
    expect(window.location.hash).toBe('');
  });

  it('restores the Pattern when history is navigated', () => {
    open();
    drop('kick');
    drop('snare', ring3OffTheBeat);
    // What the browser does on Back: the address changes, then popstate fires.
    act(() => {
      window.history.replaceState(null, '', '#v1~120~k3_0');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(voiceButtons().map((button) => button.textContent)).toEqual(['Kick, Ring 3, on the beat']);
    expect(scene.state?.pattern.voices).toHaveLength(1);
  });

  it('opens a shared link drawn but silent, and starts on the Core', async () => {
    open('#v1~96~k3_0~S3_0.5');
    expect(voiceButtons().map((button) => button.textContent)).toEqual([
      'Kick, Ring 3, on the beat',
      'Snare, Ring 3, off the beat, muted',
    ]);
    expect(screen.getByRole('spinbutton', { name: 'Tempo' }).textContent).toBe('96');
    expect(hint()).toBeNull();
    wait(2);
    expect(audio.unlocked).toBe(false);
    expect(audio.played).toEqual([]);
    expect(scene.state?.playing).toBe(false);

    act(() => scene.emit({ type: 'coreTapped' }));
    expect(audio.unlocked).toBe(true);
    wait(2);
    expect(new Set(audio.played.map((hit) => hit.sound))).toEqual(new Set(['kick']));
    // One beat at 96 BPM.
    for (const gap of gaps(playedTimes())) expect(gap).toBeCloseTo(60 / 96);
  });

  it('opens an empty canvas for a corrupt link', () => {
    open('#%%%not-a-pattern');
    expect(voiceButtons()).toHaveLength(0);
    expect(hint()).not.toBeNull();
    expect(screen.getByRole('spinbutton', { name: 'Tempo' }).textContent).toBe('120');
  });
});
