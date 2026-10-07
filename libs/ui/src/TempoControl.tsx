import { MAX_TEMPO, MIN_TEMPO, tempo as toTempo, type Tempo } from '@dotproducer/model';
import { useRef, type KeyboardEvent, type PointerEvent, type ReactElement } from 'react';

export interface TempoControlProps {
  readonly tempo: Tempo;
  /** The Tempo is changing but the gesture is not over. */
  onChange(tempo: Tempo): void;
  /** The gesture is over; this is the Tempo to keep. */
  onCommit(tempo: Tempo): void;
}

const PIXELS_PER_BPM = 3;
const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowUp: 1,
  ArrowDown: -1,
  PageUp: 10,
  PageDown: -10,
};

/** A single number: drag it up or down, or use the arrow keys. */
export const TempoControl = ({ tempo, onChange, onCommit }: TempoControlProps): ReactElement => {
  const drag = useRef<{ readonly y: number; readonly from: Tempo; tempo: Tempo } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, from: tempo, tempo };
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!drag.current) return;
    const next = toTempo(drag.current.from + (drag.current.y - event.clientY) / PIXELS_PER_BPM);
    if (next === drag.current.tempo) return;
    drag.current.tempo = next;
    onChange(next);
  };
  const onPointerEnd = (): void => {
    if (!drag.current) return;
    onCommit(drag.current.tempo);
    drag.current = null;
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    const step = KEY_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    onChange(toTempo(tempo + step));
  };
  // Held keys repeat; the change is committed once, when the key is released.
  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key in KEY_STEPS) onCommit(tempo);
  };

  return (
    <div
      className="tempo"
      role="spinbutton"
      tabIndex={0}
      aria-label="Tempo"
      aria-valuemin={MIN_TEMPO}
      aria-valuemax={MAX_TEMPO}
      aria-valuenow={tempo}
      aria-valuetext={`${tempo} BPM`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={() => onCommit(tempo)}
    >
      {tempo}
    </div>
  );
};
