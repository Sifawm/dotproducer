import type { AudioEngine } from '@dotproducer/audio';
import {
  addVoice,
  beats,
  EXAMPLES,
  clearVoices,
  decodePattern,
  encodePattern,
  hitsInWindow,
  moveVoice,
  pauseTimeline,
  pointToPosition,
  positionAt,
  removeVoice,
  resumeTimeline,
  retimeTimeline,
  seconds,
  secondsAt,
  setMagnetMode,
  setTempo,
  soloVoice,
  startTimeline,
  toggleMuted,
  vacantPosition,
  type AudioFormat,
  type Example,
  type MagnetMode,
  type Pattern,
  type Position,
  type Sound,
  type Timeline,
  type VoiceId,
} from '@dotproducer/model';
import type { Scene, SceneIntent } from '@dotproducer/scene';
import {
  ClearControl,
  ExportControl,
  Hint,
  KeyboardMirror,
  MAGNET_NAMES,
  MagnetControl,
  SOUND_NAMES,
  TempoControl,
  describePosition,
} from '@dotproducer/ui';
import { useEffect, useEffectEvent, useRef, useState, type ReactElement } from 'react';

export interface AppProps {
  readonly audio: AudioEngine;
  readonly scene: Scene;
}

/** How often hits are handed to the audio engine, and how far ahead of the audio clock. */
const SCHEDULE_INTERVAL_MS = 25;
const LOOKAHEAD_SECONDS = 0.1;
/** Playback starts slightly in the future so that the very first hit can be scheduled ahead. */
const START_DELAY_SECONDS = 0.05;
/** Hits found later than this (a throttled background tab) are skipped rather than bunched up. */
const LATE_SECONDS = 0.05;

/** How long a downloaded file stays reachable by its object URL. */
const RELEASE_DOWNLOAD_MS = 60_000;

const patternInUrl = (): Pattern => decodePattern(window.location.hash.slice(1));

/** YYYY-MM-DD on the user's own calendar. */
const localDate = (date: Date): string =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');

export const App = ({ audio, scene }: AppProps): ReactElement => {
  const host = useRef<HTMLDivElement>(null);
  const scheduledUntil = useRef(beats(0));
  const [pattern, setPattern] = useState(patternInUrl);
  /** Whether the Magnet is on; Straight or Triplet lives in the Pattern. */
  const [magnet, setMagnet] = useState(true);
  /** Null until playback has started for the first time. */
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [focusedVoiceId, setFocusedVoiceId] = useState<VoiceId | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [draggingFromDock, setDraggingFromDock] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const playing = timeline?.running ?? false;
  const empty = pattern.voices.length === 0;

  const show = (next: Pattern): void => {
    setPattern(next);
    if (timeline && timeline.tempo !== next.tempo) {
      setTimeline(retimeTimeline(timeline, next.tempo, audio.now()));
    }
  };

  /** Shows a Pattern and records it in the URL as one step of history. */
  const commit = (next: Pattern, amendLast = false): void => {
    show(next);
    const encoded = encodePattern(next);
    if (amendLast) window.history.replaceState(null, '', `#${encoded}`);
    else if (encoded !== encodePattern(patternInUrl())) {
      window.history.pushState(null, '', `#${encoded}`);
    }
  };

  /** Starts playback the first time; after that, leaves it running or paused. */
  const start = (tempo = pattern.tempo): void => {
    audio.unlock();
    if (timeline) return;
    scheduledUntil.current = beats(0);
    setTimeline(startTimeline(tempo, seconds(audio.now() + START_DELAY_SECONDS)));
  };

  const toggleTransport = (): void => {
    if (!timeline) {
      start();
    } else if (timeline.running) {
      const paused = pauseTimeline(timeline, audio.now());
      audio.silence();
      scheduledUntil.current = paused.anchorBeats;
      setTimeline(paused);
    } else {
      audio.unlock();
      setTimeline(resumeTimeline(timeline, audio.now()));
    }
    setAnnouncement(playing ? 'Paused' : 'Playing');
  };

  /** What a drop snaps to: the Pattern's mode when the Magnet is on, inverted by Alt. */
  const magnetFor = (invertMagnet: boolean): MagnetMode | null =>
    magnet !== invertMagnet ? pattern.magnetMode : null;

  /** Straight → Triplet → off → Straight; only Straight and Triplet touch the Pattern. */
  const stepMagnet = (): void => {
    if (magnet && pattern.magnetMode === 'straight') {
      commit(setMagnetMode(pattern, 'triplet'));
      setAnnouncement(`Magnet ${MAGNET_NAMES.triplet}`);
    } else if (magnet) {
      setMagnet(false);
      setAnnouncement(`Magnet ${MAGNET_NAMES.off}`);
    } else {
      setMagnet(true);
      commit(setMagnetMode(pattern, 'straight'));
      setAnnouncement(`Magnet ${MAGNET_NAMES.straight}`);
    }
  };

  const add = (sound: Sound, position: Position, magnetMode: MagnetMode | null): void => {
    const next = addVoice(pattern, sound, position, magnetMode);
    const added = next.voices[next.voices.length - 1];
    if (next !== pattern && added) {
      setAnnouncement(`${SOUND_NAMES[sound]} added, ${describePosition(added)}`);
    }
    setHintDismissed(true);
    commit(next);
    start();
  };

  const move = (id: VoiceId, position: Position, magnetMode: MagnetMode | null): void => {
    const next = moveVoice(pattern, id, position, magnetMode);
    const before = pattern.voices.find((voice) => voice.id === id);
    const after = next.voices.find((voice) => voice.id === id);
    if (before) {
      setAnnouncement(
        after
          ? `${SOUND_NAMES[before.sound]} moved to ${describePosition(after)}`
          : `${SOUND_NAMES[before.sound]} merged`,
      );
    }
    commit(next);
    start();
  };

  const mute = (id: VoiceId): void => {
    const voice = pattern.voices.find((candidate) => candidate.id === id);
    if (!voice) return;
    setAnnouncement(`${SOUND_NAMES[voice.sound]} ${voice.muted ? 'unmuted' : 'muted'}`);
    commit(toggleMuted(pattern, id));
  };

  const solo = (id: VoiceId, from: Pattern, amendLast = false): void => {
    const voice = from.voices.find((candidate) => candidate.id === id);
    if (!voice) return;
    const next = soloVoice(from, id);
    setAnnouncement(
      next.voices.some((other) => other.muted)
        ? `${SOUND_NAMES[voice.sound]} solo`
        : 'All Voices unmuted',
    );
    commit(next, amendLast);
  };

  const remove = (id: VoiceId): void => {
    const voice = pattern.voices.find((candidate) => candidate.id === id);
    if (!voice) return;
    setAnnouncement(`${SOUND_NAMES[voice.sound]} removed`);
    commit(removeVoice(pattern, id));
  };

  const clear = (): void => {
    setAnnouncement('Pattern cleared');
    commit(clearVoices(pattern));
  };

  /** Loads an Example as one step of history and makes sure it is heard. */
  const chooseExample = ({ name, encoded }: Example): void => {
    const next = decodePattern(encoded);
    // A running timeline is retimed by commit; a paused one is resumed at the new Tempo.
    commit(next);
    if (timeline && !timeline.running) {
      audio.unlock();
      const now = audio.now();
      setTimeline(resumeTimeline(retimeTimeline(timeline, next.tempo, now), now));
    } else {
      start(next.tempo);
    }
    setAnnouncement(`${name.charAt(0).toUpperCase()}${name.slice(1)} example loaded, playing`);
  };

  /** Renders the current Pattern and hands it to the browser as a download. */
  const download = async (format: AudioFormat): Promise<void> => {
    const file = await audio.render(pattern, format);
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dotproducer-${pattern.tempo}bpm-${localDate(new Date())}.${format}`;
    link.click();
    // Firefox and Safari read the file after click() returns: release it well after.
    setTimeout(() => URL.revokeObjectURL(url), RELEASE_DOWNLOAD_MS);
  };

  const onIntent = useEffectEvent((intent: SceneIntent): void => {
    switch (intent.type) {
      case 'dockAuditioned':
        audio.unlock();
        audio.audition(intent.sound);
        break;
      case 'dragStarted':
        setHintDismissed(true);
        setDraggingFromDock(intent.voiceId === null);
        break;
      case 'dragCancelled':
        setDraggingFromDock(false);
        break;
      case 'soundDropped':
        setDraggingFromDock(false);
        add(
          intent.sound,
          pointToPosition(intent.point, intent.canvas),
          magnetFor(intent.invertMagnet),
        );
        break;
      case 'voiceDropped':
        move(
          intent.voiceId,
          pointToPosition(intent.point, intent.canvas),
          magnetFor(intent.invertMagnet),
        );
        break;
      case 'voiceDroppedOnDock':
        remove(intent.voiceId);
        break;
      case 'voiceTapped':
        mute(intent.voiceId);
        break;
      case 'voiceDoubleTapped':
        // The first tap already toggled Muted: take that back, so that the whole
        // gesture is one change in the Pattern and one step of history.
        solo(intent.voiceId, toggleMuted(pattern, intent.voiceId), true);
        break;
      case 'coreTapped':
        toggleTransport();
        break;
    }
  });

  /** Hands the audio engine every hit up to a little ahead of the audio clock. */
  const schedule = useEffectEvent((): void => {
    if (!timeline?.running) return;
    const now = audio.now();
    const horizon = positionAt(timeline, seconds(now + LOOKAHEAD_SECONDS));
    if (horizon <= scheduledUntil.current) return;
    // A Voice being dragged keeps sounding from where it was until it is dropped.
    for (const hit of hitsInWindow(pattern, scheduledUntil.current, horizon)) {
      const at = secondsAt(timeline, hit.at);
      if (at >= now - LATE_SECONDS) audio.play(hit.sound, at);
    }
    scheduledUntil.current = horizon;
  });

  const drawFrame = useEffectEvent((): void => {
    scene.advance(timeline ? positionAt(timeline, audio.now()) : beats(0));
  });

  const restoreFromUrl = useEffectEvent((): void => show(patternInUrl()));

  useEffect(() => {
    if (!host.current) return;
    scene.mount(host.current);
    return () => scene.unmount();
  }, [scene]);

  useEffect(() => scene.onIntent(onIntent), [scene]);

  useEffect(() => {
    // A Voice that was removed or merged while focused is no longer there to point at.
    const focused = pattern.voices.some((voice) => voice.id === focusedVoiceId);
    scene.update({ pattern, magnet, playing, focusedVoiceId: focused ? focusedVoiceId : null });
  }, [scene, pattern, magnet, playing, focusedVoiceId]);

  useEffect(() => {
    const interval = setInterval(schedule, SCHEDULE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let frame = requestAnimationFrame(function loop() {
      drawFrame();
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    window.addEventListener('popstate', restoreFromUrl);
    return () => window.removeEventListener('popstate', restoreFromUrl);
  }, []);

  return (
    <main className="app">
      <div className="scene" ref={host} />
      <KeyboardMirror
        pattern={pattern}
        playing={playing}
        announcement={announcement}
        onAddVoice={(sound) => add(sound, vacantPosition(pattern, sound), pattern.magnetMode)}
        onMoveVoice={(id, position) => move(id, position, pattern.magnetMode)}
        onToggleMuted={mute}
        onSoloVoice={(id) => solo(id, pattern)}
        onRemoveVoice={remove}
        onToggleTransport={toggleTransport}
        onFocusVoice={setFocusedVoiceId}
      />
      <TempoControl
        tempo={pattern.tempo}
        onChange={(tempo) => show(setTempo(pattern, tempo))}
        onCommit={(tempo) => commit(setTempo(pattern, tempo))}
      />
      <MagnetControl state={magnet ? pattern.magnetMode : 'off'} onStep={stepMagnet} />
      <ClearControl disabled={empty} onClear={clear} />
      <ExportControl disabled={empty} onExport={download} />
      <Hint
        gestureVisible={empty && !hintDismissed}
        examplesVisible={empty && !draggingFromDock}
        examples={EXAMPLES}
        onChoose={chooseExample}
      />
    </main>
  );
};
