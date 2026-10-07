import {
  ANGULAR_DIVISIONS,
  SOUNDS,
  angle,
  place,
  ringDistance,
  type Pattern,
  type Position,
  type Sound,
  type Voice,
  type VoiceId,
} from '@dotproducer/model';
import type { KeyboardEvent, ReactElement } from 'react';
import { SOUND_NAMES, describeVoice } from './labels';

export interface KeyboardMirrorProps {
  readonly pattern: Pattern;
  readonly playing: boolean;
  /** The latest change, read out by screen readers. */
  readonly announcement: string;
  onAddVoice(sound: Sound): void;
  /** The position is always on the Magnet grid. */
  onMoveVoice(id: VoiceId, position: Position): void;
  onToggleMuted(id: VoiceId): void;
  onRemoveVoice(id: VoiceId): void;
  onToggleTransport(): void;
  onFocusVoice(id: VoiceId | null): void;
}

/** One step on the Magnet grid per arrow key: up and down change Ring, left and right change division. */
const STEPS: Readonly<Record<string, { readonly rings: number; readonly divisions: number }>> = {
  ArrowUp: { rings: 1, divisions: 0 },
  ArrowDown: { rings: -1, divisions: 0 },
  ArrowRight: { rings: 0, divisions: 1 },
  ArrowLeft: { rings: 0, divisions: -1 },
};

/**
 * The canvas, mirrored as visually hidden HTML controls so that everything in it
 * can be reached and understood without a pointer or without seeing it.
 */
export const KeyboardMirror = ({
  pattern,
  playing,
  announcement,
  onAddVoice,
  onMoveVoice,
  onToggleMuted,
  onRemoveVoice,
  onToggleTransport,
  onFocusVoice,
}: KeyboardMirrorProps): ReactElement => {
  const onVoiceKey = (event: KeyboardEvent, voice: Voice): void => {
    const step = STEPS[event.key];
    if (step) {
      event.preventDefault();
      const from = place(voice, true);
      onMoveVoice(voice.id, {
        distance: ringDistance(from.distance + step.rings),
        angle: angle(from.angle + step.divisions / ANGULAR_DIVISIONS),
      });
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      onRemoveVoice(voice.id);
    }
  };

  return (
    <div className="visually-hidden">
      <div role="group" aria-label="Dock">
        {SOUNDS.map((sound) => (
          <button key={sound} type="button" onClick={() => onAddVoice(sound)}>
            Add {SOUND_NAMES[sound]}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Voices">
        {pattern.voices.map((voice) => (
          <button
            key={voice.id}
            type="button"
            aria-description="Enter mutes, arrows move, Delete removes"
            onClick={() => onToggleMuted(voice.id)}
            onKeyDown={(event) => onVoiceKey(event, voice)}
            onFocus={() => onFocusVoice(voice.id)}
            onBlur={() => onFocusVoice(null)}
          >
            {describeVoice(voice)}
          </button>
        ))}
      </div>
      <button type="button" onClick={onToggleTransport}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <div role="status">{announcement}</div>
    </div>
  );
};
