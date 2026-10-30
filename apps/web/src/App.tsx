import type { AudioEngine } from '@dotproducer/audio';
import {
  addVoice,
  beats,
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
  setTempo,
  soloVoice,
  startTimeline,
  toggleMuted,
  vacantPosition,
  type AudioFormat,
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
  const [magnet, setMagnet] = useState(true);
  /** Null until playback has started for the first time. */
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [focusedVoiceId, setFocusedVoiceId] = useState<VoiceId | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const playing = timeline?.running ?? false;

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

  const start = (): void => {
    audio.unlock();
    if (timeline) return;
    scheduledUntil.current = beats(0);
    setTimeline(startTimeline(pattern.tempo, seconds(audio.now() + START_DELAY_SECONDS)));
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

  const add = (sound: Sound, position: Position, magnetOn: boolean): void => {
    const next = addVoice(pattern, sound, position, magnetOn);
    const added = next.voices[next.voices.length - 1];
    if (next !== pattern && added) {
      setAnnouncement(`${SOUND_NAMES[sound]} added, ${describePosition(added)}`);
    }
    setHintDismissed(true);
    commit(next);
    start();
  };

  const move = (id: VoiceId, position: Position, magnetOn: boolean): void => {
    const next = moveVoice(pattern, id, position, magnetOn);
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

  /** Renders the current Pattern and hands it to the browser as a download. */
  const download = async (format: AudioFormat): Promise<void> => {
    const file = await audio.render(pattern, format);
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dotproducer-${pattern.tempo}bpm-${localDate(new Date())}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onIntent = useEffectEvent((intent: SceneIntent): void => {
    switch (intent.type) {
      case 'dockAuditioned':
        audio.unlock();
        audio.audition(intent.sound);
        break;
      case 'dragStarted':
        setHintDismissed(true);
        break;
      case 'dragCancelled':
        break;
      case 'soundDropped':
        add(
          intent.sound,
          pointToPosition(intent.point, intent.canvas),
          magnet !== intent.invertMagnet,
        );
        break;
      case 'voiceDropped':
        move(
          intent.voiceId,
          pointToPosition(intent.point, intent.canvas),
          magnet !== intent.invertMagnet,
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
        onAddVoice={(sound) => add(sound, vacantPosition(pattern, sound), true)}
        onMoveVoice={(id, position) => move(id, position, true)}
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
      <MagnetControl on={magnet} onToggle={() => setMagnet(!magnet)} />
      <ClearControl disabled={pattern.voices.length === 0} onClear={clear} />
      <ExportControl disabled={pattern.voices.length === 0} onExport={download} />
      <Hint visible={pattern.voices.length === 0 && !hintDismissed} />
    </main>
  );
};
