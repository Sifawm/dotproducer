import type { Sound } from '@dotproducer/model';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
const clearButton = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Clear' });
const hint = () => screen.queryByText('Drag a dot onto the canvas', { ignore: '[aria-hidden="true"]' });
const exampleLink = (name: string) => screen.queryByRole<HTMLAnchorElement>('link', { name });
/** What the browser does on Back or Forward: the address changes, then popstate fires. */
const back = (hash: string): void =>
  act(() => {
    window.history.replaceState(null, '', hash === '' ? '/' : hash);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

beforeEach(() => {
  // Only the timers and the date the application runs on; Testing Library needs a real setTimeout.
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date'],
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

describe('Examples', () => {
  const techno = 'v1~128~k3_0~c4_0.5~c5_0.875~o3_0.5~h3_0~h3_0.25~h3_0.75~t4_0.375';

  it('offers the Examples on an empty canvas, each a link to its Pattern', () => {
    open();
    expect(exampleLink('techno')?.closest('p')?.textContent).toBe('Try techno · breakbeat · shuffle');
    expect(exampleLink('techno')?.getAttribute('href')).toBe(`#${techno}`);
    expect(exampleLink('breakbeat')?.getAttribute('href')).toBe(
      '#v1~132~k5_0~k5_0.125~k5_0.625~s4_0.5~s4_0.875~h2_0~o5_0.375~c5_0.75~t5_0.875',
    );
    expect(exampleLink('shuffle')?.getAttribute('href')).toMatch(/^#v2~96d12~/);
  });

  it('steps aside while a dot is dragged from the Dock, and comes back if the drag is cancelled', () => {
    open();
    act(() => scene.emit({ type: 'dragStarted', voiceId: null }));
    expect(exampleLink('techno')).toBeNull();
    act(() => scene.emit({ type: 'dragCancelled' }));
    expect(exampleLink('techno')).not.toBeNull();
  });

  it('comes back without the gesture line after Clear and after the last Voice is removed', async () => {
    open();
    drop('kick');
    expect(exampleLink('techno')).toBeNull();
    await user.click(clearButton());
    expect(exampleLink('techno')).not.toBeNull();
    expect(hint()).toBeNull();
    drop('kick');
    act(() => scene.emit({ type: 'dragStarted', voiceId: firstVoiceId() }));
    act(() => scene.emit({ type: 'voiceDroppedOnDock', voiceId: firstVoiceId() }));
    expect(exampleLink('techno')).not.toBeNull();
  });

  it('is not offered on a link that has Voices', () => {
    open('#v1~96~k3_0');
    expect(exampleLink('techno')).toBeNull();
  });

  const choose = async (name: string): Promise<void> => {
    const link = exampleLink(name);
    if (!link) throw new Error(`no ${name} Example offered`);
    await user.click(link);
  };

  it('fills the canvas with the chosen Example, at its Tempo, and plays it at once', async () => {
    open();
    await choose('techno');
    expect(scene.state?.pattern.voices.map((voice) => voice.sound)).toEqual([
      'kick',
      'clap',
      'clap',
      'openHat',
      'closedHat',
      'closedHat',
      'closedHat',
      'tom',
    ]);
    expect(screen.getByRole('spinbutton', { name: 'Tempo' }).textContent).toBe('128');
    expect(status()).toBe('Techno example loaded, playing');
    expect(exampleLink('techno')).toBeNull();
    expect(audio.unlocked).toBe(true);
    wait(2);
    expect(new Set(audio.played.map((hit) => hit.sound))).toEqual(
      new Set(['kick', 'clap', 'openHat', 'closedHat', 'tom']),
    );
    // Four on the floor at 128 BPM.
    for (const gap of gaps(playedTimes('kick'))) expect(gap).toBeCloseTo(60 / 128);
  });

  it('brings Triplet with shuffle, and leaves the Magnet on or off as it was', async () => {
    open();
    const magnetButton = () => screen.getByRole('button', { name: /^Magnet, / });
    await choose('shuffle');
    expect(magnetButton().getAttribute('aria-label')).toBe('Magnet, Triplet');
    await user.click(clearButton());
    await user.click(magnetButton());
    expect(magnetButton().getAttribute('aria-label')).toBe('Magnet, Off');
    await choose('techno');
    expect(magnetButton().getAttribute('aria-label')).toBe('Magnet, Off');
    expect(scene.state?.pattern.magnetMode).toBe('straight');
  });

  it('is one step of history: Back returns to the empty canvas and Forward brings it back', async () => {
    open('#v1~140');
    const before = window.history.length;
    await choose('techno');
    expect(window.location.hash).toBe(`#${techno}`);
    expect(window.history.length).toBe(before + 1);
    back('#v1~140');
    expect(voiceButtons()).toHaveLength(0);
    expect(exampleLink('techno')).not.toBeNull();
    back(`#${techno}`);
    expect(voiceButtons()).toHaveLength(8);
  });

  it('starts paused playback again', async () => {
    open();
    drop('kick');
    wait(1);
    act(() => scene.emit({ type: 'coreTapped' }));
    await user.click(clearButton());
    const before = audio.played.length;
    await choose('breakbeat');
    expect(scene.state?.playing).toBe(true);
    wait(2);
    expect(audio.played.length).toBeGreaterThan(before);
    // Closed Hats on every eighth at 132 BPM.
    for (const gap of gaps(playedTimes('closedHat'))) expect(gap).toBeCloseTo(30 / 132);
  });

  it('joins running playback in the same bar, at its own Tempo', async () => {
    open();
    drop('kick');
    wait(1.2);
    await user.click(clearButton());
    const chosenAt = audio.time;
    await choose('techno');
    wait(1);
    // Playback started 0.05 s after 10 at 120 BPM; from here on it counts 128 to the minute.
    const position = (chosenAt - 10.05) * 2;
    const nextBeat = Math.ceil(position);
    const [firstKick] = playedTimes('kick').filter((time) => time > chosenAt);
    expect(firstKick).toBeCloseTo(chosenAt + ((nextBeat - position) * 60) / 128);
  });

  it('leaves the gesture line until a real drag, even after an Example is chosen and cleared', async () => {
    open();
    await choose('techno');
    await user.click(clearButton());
    expect(hint()).not.toBeNull();
    expect(exampleLink('techno')).not.toBeNull();
    drop('kick');
    act(() => scene.emit({ type: 'voiceDroppedOnDock', voiceId: firstVoiceId() }));
    expect(hint()).toBeNull();
  });

  it('can be chosen from the keyboard', async () => {
    open();
    exampleLink('breakbeat')?.focus();
    await user.keyboard('{Enter}');
    expect(status()).toBe('Breakbeat example loaded, playing');
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
  // Near 8 o'clock on Ring 3, a little off the last third of the beat.
  const nearEightOClock = { x: 445, y: 845 };
  const magnetButton = () => screen.getByRole('button', { name: /^Magnet, / });
  const tapMagnet = () => user.click(magnetButton());
  it('snaps drops to the Rings by default', () => {
    open();
    drop('kick', nearRing3);
    expect(scene.state?.pattern.voices[0]?.distance).toBe(3);
  });

  it('steps through Straight, Triplet and Off, showing and announcing each state', async () => {
    open();
    expect(magnetButton().getAttribute('aria-label')).toBe('Magnet, Straight');
    expect(within(magnetButton()).getByText('Straight')).toBeTruthy();
    await tapMagnet();
    expect(magnetButton().getAttribute('aria-label')).toBe('Magnet, Triplet');
    expect(within(magnetButton()).getByText('Triplet')).toBeTruthy();
    expect(status()).toBe('Magnet Triplet');
    expect(scene.state).toMatchObject({ magnet: true, pattern: { magnetMode: 'triplet' } });
    await tapMagnet();
    expect(magnetButton().getAttribute('aria-label')).toBe('Magnet, Off');
    expect(status()).toBe('Magnet Off');
    expect(scene.state).toMatchObject({ magnet: false, pattern: { magnetMode: 'triplet' } });
    await tapMagnet();
    expect(magnetButton().getAttribute('aria-label')).toBe('Magnet, Straight');
    expect(status()).toBe('Magnet Straight');
    expect(scene.state).toMatchObject({ magnet: true, pattern: { magnetMode: 'straight' } });
  });

  it('records Straight and Triplet in the URL as steps of history, but not Off', async () => {
    open('#v1~120~k3_0');
    const before = window.history.length;
    await tapMagnet();
    expect(window.location.hash).toBe('#v2~120d12~k3_0');
    expect(window.history.length).toBe(before + 1);
    await tapMagnet();
    expect(window.location.hash).toBe('#v2~120d12~k3_0');
    expect(window.history.length).toBe(before + 1);
    await tapMagnet();
    expect(window.location.hash).toBe('#v1~120~k3_0');
    expect(window.history.length).toBe(before + 2);
  });

  it('restores Straight or Triplet on Back, never turning the Magnet on or off', async () => {
    open('#v1~120~k3_0');
    await tapMagnet();
    back('#v1~120~k3_0');
    expect(magnetButton().getAttribute('aria-label')).toBe('Magnet, Straight');

    await tapMagnet();
    await tapMagnet();
    back('#v1~120~k3_0');
    expect(magnetButton().getAttribute('aria-label')).toBe('Magnet, Off');
    expect(scene.state?.pattern.magnetMode).toBe('straight');
    // Turning on from Off on a Straight Pattern changes nothing in it.
    const before = window.history.length;
    await tapMagnet();
    expect(magnetButton().getAttribute('aria-label')).toBe('Magnet, Straight');
    expect(window.history.length).toBe(before);
  });

  it('opens a shared Triplet link in Triplet, and keeps it on Clear', async () => {
    open('#v2~96d12~k3_0');
    expect(magnetButton().getAttribute('aria-label')).toBe('Magnet, Triplet');
    await user.click(clearButton());
    expect(window.location.hash).toBe('#v2~96d12');
  });

  it('snaps a drop to the last third of the beat in Triplet, for a shuffle', () => {
    open('#v2~120d12');
    drop('kick');
    drop('snare', nearEightOClock);
    expect(scene.state?.pattern.voices[1]).toMatchObject({ distance: 3, angle: 8 / 12 });
    wait(2);
    const [kick = 0, nextKick = 0] = playedTimes('kick').slice(-2);
    const snare = playedTimes('snare').find((time) => time > kick && time < nextKick);
    // Ring 3 is one beat: half a second at 120 BPM.
    expect((snare ?? 0) - kick).toBeCloseTo(1 / 3);
  });

  it('never moves a placed Voice when its state changes', async () => {
    open();
    await tapMagnet();
    await tapMagnet();
    drop('kick', nearRing3);
    expect(scene.state?.pattern.voices[0]?.distance).toBeCloseTo(2.6);
    await tapMagnet();
    await tapMagnet();
    expect(scene.state?.pattern.voices[0]?.distance).toBeCloseTo(2.6);
  });

  it('places freely while Alt is held with the Magnet on', async () => {
    open();
    drop('kick', nearRing3, true);
    expect(scene.state?.pattern.voices[0]?.distance).toBeCloseTo(2.6);
    await tapMagnet();
    drop('snare', nearEightOClock, true);
    expect(scene.state?.pattern.voices[1]?.angle).not.toBe(8 / 12);
  });

  it('snaps to the Divisions the Pattern keeps while Alt is held with the Magnet off', async () => {
    open('#v2~120d12');
    await tapMagnet();
    drop('snare', nearEightOClock);
    expect(scene.state?.pattern.voices[0]?.angle).not.toBe(8 / 12);
    drop('snare', nearEightOClock, true);
    expect(scene.state?.pattern.voices[1]).toMatchObject({ distance: 3, angle: 8 / 12 });
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
  it('shows Clear disabled on an empty Pattern and enables it once a Voice is dropped', () => {
    open();
    expect(clearButton().disabled).toBe(true);
    drop('kick');
    expect(clearButton().disabled).toBe(false);
  });

  it('removes every Voice in one step that Back can undo, keeping the Tempo', async () => {
    open('#v1~96~k3_0~s3_0.5');
    const before = window.history.length;
    await user.click(clearButton());
    expect(voiceButtons()).toHaveLength(0);
    expect(scene.state?.pattern.voices).toEqual([]);
    expect(status()).toBe('Pattern cleared');
    expect(window.location.hash).toBe('#v1~96');
    expect(window.history.length).toBe(before + 1);
    expect(clearButton().disabled).toBe(true);
  });

  it('stops the hits', async () => {
    open();
    drop('kick');
    wait(1);
    await user.click(clearButton());
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
      'Magnet, Straight',
    ]);
  });

  it('steps the focused Voice by twelfths in Triplet, also while the Magnet is off', async () => {
    open('#v2~120d12~k3_0.125');
    act(() => screen.getByRole('button', { name: 'Kick, Ring 3, 1/8 past the beat' }).focus());
    // Off the grid of the Pattern: onto the nearest twelfth first, then one step.
    await user.keyboard('{ArrowRight}');
    expect(status()).toBe('Kick moved to Ring 3, 1/4 past the beat');
    await user.click(screen.getByRole('button', { name: 'Magnet, Triplet' }));
    act(() => screen.getByRole('button', { name: 'Kick, Ring 3, 1/4 past the beat' }).focus());
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(status()).toBe('Kick moved to Ring 3, 1/12 past the beat');
  });

  it('adds new Voices on the twelfths in Triplet', async () => {
    open('#v2~120d12');
    await user.click(screen.getByRole('button', { name: 'Add Snare' }));
    await user.click(screen.getByRole('button', { name: 'Add Snare' }));
    expect(voiceButtons().map((button) => button.textContent)).toEqual([
      'Snare, Ring 3, on the beat',
      'Snare, Ring 3, 1/12 past the beat',
    ]);
  });

  it('names thirds and twelfths as fractions in either state, and the rest as a percentage', () => {
    const names = [
      'Kick, Ring 3, 1/3 past the beat',
      'Snare, Ring 3, 5/12 past the beat',
      'Clap, Ring 3, 1/6 past the beat',
      'Closed Hat, Ring 3, 30% past the beat',
    ];
    const voices = '~k3_0.3333333333333333~s3_0.4166666666666667~c3_0.16666666666666666~h3_0.3';
    open(`#v2~120d12${voices}`);
    expect(voiceButtons().map((button) => button.textContent)).toEqual(names);
    cleanup();
    open(`#v1~120${voices}`);
    expect(voiceButtons().map((button) => button.textContent)).toEqual(names);
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
    expect(exampleLink('techno')).not.toBeNull();
    expect(screen.getByRole('spinbutton', { name: 'Tempo' }).textContent).toBe('120');
  });
});

describe('tap tempo', () => {
  const tempoControl = () => screen.getByRole('spinbutton', { name: 'Tempo' });
  /** A press on the Tempo that moves the pointer by the given amount before release. */
  const press = (dx = 0, dy = 0): void => {
    const at = { pointerId: 1, clientX: 100, clientY: 100 };
    fireEvent.pointerDown(tempoControl(), at);
    if (dx || dy) fireEvent.pointerMove(tempoControl(), { ...at, clientX: 100 + dx, clientY: 100 + dy });
    fireEvent.pointerUp(tempoControl(), { ...at, clientX: 100 + dx, clientY: 100 + dy });
  };
  const keyTap = (): void => void fireEvent.keyDown(tempoControl(), { key: 't' });
  const tapEvery = (apart: number, count: number, tap = press): void => {
    for (let taps = 0; taps < count; taps++) {
      if (taps > 0) wait(apart);
      tap();
    }
  };

  beforeAll(() => {
    // jsdom has no pointer capture.
    Element.prototype.setPointerCapture = () => undefined;
  });

  beforeEach(() => {
    // The session ends on a timer, and taps are timed by the page's clock: both move with wait().
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'Date',
        'performance',
      ],
    });
  });

  it('sets the Tempo from the fourth tap, never before', () => {
    open();
    tapEvery(0.75, 3);
    expect(tempoControl().textContent).toBe('120');
    wait(0.75);
    press();
    expect(tempoControl().textContent).toBe('80');
  });

  it('refines the Tempo with each further tap, from the latest three intervals', () => {
    open();
    tapEvery(1, 4);
    expect(tempoControl().textContent).toBe('60');
    wait(0.5);
    tapEvery(0.5, 3);
    expect(tempoControl().textContent).toBe('120');
  });

  it('counts T on the focused Tempo as a tap, and declares the shortcut', () => {
    open();
    expect(tempoControl().getAttribute('aria-keyshortcuts')).toBe('T');
    act(() => tempoControl().focus());
    tapEvery(0.75, 3, keyTap);
    expect(tempoControl().textContent).toBe('120');
    wait(0.75);
    keyTap();
    expect(tempoControl().textContent).toBe('80');
    expect(tempoControl().getAttribute('aria-valuetext')).toBe('80 BPM');
  });

  it('ignores T with Ctrl, Alt or Meta held', () => {
    open();
    act(() => tempoControl().focus());
    tapEvery(0.75, 4, () => void fireEvent.keyDown(tempoControl(), { key: 't', ctrlKey: true }));
    expect(tempoControl().textContent).toBe('120');
  });

  it('keeps a drag or an arrow key after taps as a step of its own', () => {
    open('#v1~120~k3_0');
    const before = window.history.length;
    tapEvery(0.75, 4);
    press(0, -12);
    expect(tempoControl().textContent).toBe('84');
    expect(window.history.length).toBe(before + 2);
    wait(2.1);
    expect(window.history.length).toBe(before + 2);

    act(() => tempoControl().focus());
    tapEvery(0.75, 4, keyTap);
    fireEvent.keyDown(tempoControl(), { key: 'ArrowUp' });
    fireEvent.keyUp(tempoControl(), { key: 'ArrowUp' });
    expect(tempoControl().textContent).toBe('81');
    expect(window.location.hash).toBe('#v1~81~k3_0');
    expect(window.history.length).toBe(before + 4);
  });

  it('drags on a release 4 px or more away, even without a move in between', () => {
    open();
    const at = { pointerId: 1, clientX: 100, clientY: 100 };
    fireEvent.pointerDown(tempoControl(), at);
    fireEvent.pointerUp(tempoControl(), { ...at, clientY: 88 });
    expect(tempoControl().textContent).toBe('124');
  });

  it('reads a wobble under 4 px as a tap, and drags on a press that moves 4 px or more', () => {
    open();
    tapEvery(0.75, 4, () => press(3, -2));
    expect(tempoControl().textContent).toBe('80');
    wait(2.1);
    // Four presses that move: each drags the Tempo up by 4 BPM and none of them is a tap.
    tapEvery(0.75, 4, () => press(0, -12));
    expect(tempoControl().textContent).toBe('96');
    expect(window.location.hash).toBe('#v1~96');
  });

  it('starts a fresh session after 2 s without a tap', () => {
    open();
    tapEvery(0.75, 3);
    wait(2.1);
    press();
    expect(tempoControl().textContent).toBe('120');
    tapEvery(0.75, 3);
    expect(tempoControl().textContent).toBe('120');
    wait(0.75);
    press();
    expect(tempoControl().textContent).toBe('80');
  });

  it('starts a fresh session after leaving the Tempo', () => {
    open();
    act(() => tempoControl().focus());
    tapEvery(0.75, 3, keyTap);
    act(() => tempoControl().blur());
    act(() => tempoControl().focus());
    wait(0.75);
    keyTap();
    expect(tempoControl().textContent).toBe('120');
  });

  it('keeps a whole session as one step of history, which Back undoes', () => {
    open('#v1~120~k3_0');
    const before = window.history.length;
    tapEvery(0.75, 6);
    expect(tempoControl().textContent).toBe('80');
    expect(window.location.hash).toBe('#v1~120~k3_0');
    wait(2.1);
    expect(window.location.hash).toBe('#v1~80~k3_0');
    expect(window.history.length).toBe(before + 1);

    act(() => {
      window.history.replaceState(null, '', '#v1~120~k3_0');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(tempoControl().textContent).toBe('120');
  });

  it('commits a session on blur, and adds nothing when the Tempo is unchanged', () => {
    open('#v1~120~k3_0');
    const before = window.history.length;
    act(() => tempoControl().focus());
    tapEvery(0.5, 5, keyTap);
    wait(2.1);
    tapEvery(0.75, 2, keyTap);
    act(() => tempoControl().blur());
    expect(window.history.length).toBe(before);

    act(() => tempoControl().focus());
    tapEvery(0.75, 4, keyTap);
    act(() => tempoControl().blur());
    expect(window.location.hash).toBe('#v1~80~k3_0');
    expect(window.history.length).toBe(before + 1);
  });

  it('retimes every Pulse while playing', () => {
    open();
    drop('kick');
    tapEvery(1, 4);
    wait(0.3);
    const from = audio.played.length;
    wait(4);
    for (const gap of gaps(playedTimes().slice(from))) expect(gap).toBeCloseTo(1);
  });

  it('works while paused, and the Pattern resumes at the new Tempo', () => {
    open();
    drop('kick');
    wait(1);
    act(() => scene.emit({ type: 'coreTapped' }));
    tapEvery(1, 4);
    expect(tempoControl().textContent).toBe('60');
    act(() => scene.emit({ type: 'coreTapped' }));
    wait(0.3);
    const from = audio.played.length;
    wait(4);
    for (const gap of gaps(playedTimes().slice(from))) expect(gap).toBeCloseTo(1);
  });
});

describe('exporting', () => {
  const exportButton = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Export' });
  const dialog = () => screen.queryByRole('dialog', { name: 'Export' });
  const downloadButton = () =>
    screen.getByRole<HTMLButtonElement>('button', { name: /^(Download|Rendering…)$/ });
  const formats = () =>
    screen
      .getAllByRole<HTMLInputElement>('radio')
      .map((radio) => [radio.labels?.[0]?.textContent, radio.checked]);

  let downloads: { name: string; href: string }[];
  let revoked: string[];

  beforeAll(() => {
    // jsdom knows <dialog> but not showModal() or close(): stand in for the browser's.
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      if (!this.open) return;
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
    document.addEventListener('keydown', (event) => {
      const modal = document.querySelector<HTMLDialogElement>('dialog[open]');
      if (event.key === 'Escape' && modal?.dispatchEvent(new Event('cancel', { cancelable: true }))) {
        modal.close();
      }
    });
  });

  beforeEach(() => {
    downloads = [];
    revoked = [];
    // jsdom has neither object URLs nor downloads: record what the browser would be given.
    URL.createObjectURL = () => 'blob:rendered-pattern';
    URL.revokeObjectURL = (url) => void revoked.push(url);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ name: this.download, href: this.href });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows Export disabled on an empty Pattern and enables it once a Voice is dropped', () => {
    open();
    expect(exportButton().disabled).toBe(true);
    drop('kick');
    expect(exportButton().disabled).toBe(false);
  });

  it('opens a dialog with WAV selected, which Cancel and Escape close without rendering', async () => {
    open('#v1~120~k3_0');
    await user.click(exportButton());
    expect(dialog()).not.toBeNull();
    expect(screen.getByRole('group', { name: 'Format' })).not.toBeNull();
    expect(formats()).toEqual([
      ['WAV', true],
      ['MP3', false],
    ]);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(exportButton());

    await user.click(exportButton());
    await user.keyboard('{Escape}');
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(exportButton());
    expect(audio.renders).toEqual([]);
  });

  it('downloads the current Pattern as WAV, named after its Tempo and the local date', async () => {
    vi.setSystemTime(new Date(2026, 9, 30, 0, 30));
    open('#v1~96~k3_0~S3_0.5');
    await user.click(exportButton());
    await user.click(downloadButton());

    const [pending] = audio.renders;
    expect(audio.renders).toHaveLength(1);
    expect(pending?.format).toBe('wav');
    expect(pending?.pattern).toEqual(scene.state?.pattern);
    expect(downloadButton().textContent).toBe('Rendering…');
    expect(downloadButton().disabled).toBe(true);
    expect(downloads).toEqual([]);

    await act(async () => pending?.resolve(new Blob([], { type: 'audio/wav' })));
    expect(downloads).toEqual([{ name: 'dotproducer-96bpm-2026-10-30.wav', href: 'blob:rendered-pattern' }]);
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(exportButton());
  });

  it('keeps the file alive for the browser to download, then releases it', async () => {
    // A fake setTimeout too, still moving with real time so that Testing Library keeps working.
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearInterval'], shouldAdvanceTime: true });
    open('#v1~120~k3_0');
    await user.click(exportButton());
    await user.click(downloadButton());
    await act(async () => audio.renders[0]?.resolve(new Blob([], { type: 'audio/wav' })));
    expect(downloads).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(revoked).toEqual([]);
    act(() => vi.advanceTimersByTime(60_000));
    expect(revoked).toEqual(['blob:rendered-pattern']);
  });

  it('cannot be cancelled while it renders, by Cancel or by Escape', async () => {
    open('#v1~120~k3_0');
    await user.click(exportButton());
    await user.click(downloadButton());
    const cancel = screen.getByRole<HTMLButtonElement>('button', { name: 'Cancel' });
    expect(cancel.disabled).toBe(true);

    await user.keyboard('{Escape}');
    expect(dialog()).not.toBeNull();

    await act(async () => audio.renders[0]?.reject(new Error('offline')));
    expect(cancel.disabled).toBe(false);
    await user.keyboard('{Escape}');
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(exportButton());
  });

  it('downloads the current Pattern as MP3 when MP3 is chosen, without remembering the choice', async () => {
    vi.setSystemTime(new Date(2026, 9, 30, 0, 30));
    open('#v1~128~k3_0');
    await user.click(exportButton());
    await user.click(screen.getByRole('radio', { name: 'MP3' }));
    await user.click(downloadButton());

    const [pending] = audio.renders;
    expect(pending?.format).toBe('mp3');
    await act(async () => pending?.resolve(new Blob([], { type: 'audio/mpeg' })));
    expect(downloads).toEqual([{ name: 'dotproducer-128bpm-2026-10-30.mp3', href: 'blob:rendered-pattern' }]);

    await user.click(exportButton());
    expect(formats()).toEqual([
      ['WAV', true],
      ['MP3', false],
    ]);
  });

  it('keeps the Pattern playing while it renders', async () => {
    open();
    drop('kick');
    await user.click(exportButton());
    await user.click(downloadButton());
    const before = audio.played.length;
    wait(1);
    expect(audio.played.length).toBeGreaterThan(before);
  });

  it('shows an error when the export fails, keeping the dialog open for a retry', async () => {
    open('#v1~120~k3_0');
    await user.click(exportButton());
    await user.click(downloadButton());
    await act(async () => audio.renders[0]?.reject(new Error('offline')));
    expect(dialog()).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toBe('Export failed. Try again.');
    expect(downloadButton().textContent).toBe('Download');
    expect(downloadButton().disabled).toBe(false);

    await user.click(downloadButton());
    expect(audio.renders).toHaveLength(2);
    expect(screen.queryByRole('alert')).toBeNull();
    await act(async () => audio.renders[1]?.resolve(new Blob([], { type: 'audio/wav' })));
    expect(downloads).toHaveLength(1);
    expect(dialog()).toBeNull();
  });
});
