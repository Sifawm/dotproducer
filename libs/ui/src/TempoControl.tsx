import {
  MAX_TEMPO,
  MIN_TEMPO,
  seconds,
  tappedTempo,
  tempo as toTempo,
  type Seconds,
  type Tempo,
} from '@dotproducer/model';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
} from 'react';

export interface TempoControlProps {
  readonly tempo: Tempo;
  /** The Tempo is changing but the gesture is not over. */
  onChange(tempo: Tempo): void;
  /** The gesture is over; this is the Tempo to keep. */
  onCommit(tempo: Tempo): void;
}

const PIXELS_PER_BPM = 3;
/** A press that moves less than this before release is a tap, not a drag. */
const TAP_SLOP_PIXELS = 4;
/** A pause longer than this between taps ends the tapping session. */
const SESSION_MS = 2000;
/** How long each tap dims the number before it fades back. */
const FLASH_MS = 80;
const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowUp: 1,
  ArrowDown: -1,
  PageUp: 10,
  PageDown: -10,
};

interface Press {
  readonly x: number;
  readonly y: number;
  readonly from: Tempo;
  tempo: Tempo;
  dragging: boolean;
}

/** A single number: drag it up or down, use the arrow keys, or tap its beat (pointer or T). */
export const TempoControl = ({ tempo, onChange, onCommit }: TempoControlProps): ReactElement => {
  const press = useRef<Press | null>(null);
  const taps = useRef<Seconds[]>([]);
  const sessionEnd = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flashEnd = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [flashing, setFlashing] = useState(false);
  // The session ends on a timer: it must commit with the props of the latest render, not the tap's.
  const latest = useRef({ tempo, onCommit });
  useEffect(() => {
    latest.current = { tempo, onCommit };
  });

  /** Commits the tapping session, if one is going on, as one step. */
  const endSession = (): void => {
    clearTimeout(sessionEnd.current);
    if (taps.current.length === 0) return;
    taps.current = [];
    latest.current.onCommit(latest.current.tempo);
  };
  const tap = (): void => {
    clearTimeout(sessionEnd.current);
    sessionEnd.current = setTimeout(endSession, SESSION_MS);
    taps.current.push(seconds(performance.now() / 1000));
    const next = tappedTempo(taps.current);
    if (next !== null) onChange(next);
    clearTimeout(flashEnd.current);
    setFlashing(true);
    flashEnd.current = setTimeout(() => setFlashing(false), FLASH_MS);
  };
  useEffect(
    () => () => {
      clearTimeout(sessionEnd.current);
      clearTimeout(flashEnd.current);
    },
    [],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    press.current = { x: event.clientX, y: event.clientY, from: tempo, tempo, dragging: false };
  };
  const onPointerMove = (event: PointerEvent): void => {
    const current = press.current;
    if (!current) return;
    if (!current.dragging) {
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < TAP_SLOP_PIXELS) return;
      current.dragging = true;
      // A drag or a key ends the tapping session first, so that each gesture is its own step.
      endSession();
    }
    const next = toTempo(current.from + (current.y - event.clientY) / PIXELS_PER_BPM);
    if (next === current.tempo) return;
    current.tempo = next;
    onChange(next);
  };
  const onPointerUp = (event: PointerEvent): void => {
    onPointerMove(event);
    if (press.current && !press.current.dragging) tap();
    endPress();
  };
  const endPress = (): void => {
    if (press.current?.dragging) onCommit(press.current.tempo);
    press.current = null;
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() === 't' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (!event.repeat) tap();
      return;
    }
    const step = KEY_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    endSession();
    onChange(toTempo(tempo + step));
  };
  // Held keys repeat; the change is committed once, when the key is released.
  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key in KEY_STEPS) onCommit(tempo);
  };
  const onBlur = (): void => {
    endSession();
    onCommit(tempo);
  };

  return (
    <div
      className="tempo"
      role="spinbutton"
      tabIndex={0}
      aria-label="Tempo"
      aria-keyshortcuts="T"
      aria-valuemin={MIN_TEMPO}
      aria-valuemax={MAX_TEMPO}
      aria-valuenow={tempo}
      aria-valuetext={`${tempo} BPM`}
      data-flash={flashing || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={endPress}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={onBlur}
    >
      {tempo}
    </div>
  );
};
