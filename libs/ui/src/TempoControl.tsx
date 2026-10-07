import { MAX_TEMPO, MIN_TEMPO, type Tempo } from '@dotproducer/model';
import { useRef, type KeyboardEvent, type PointerEvent, type ReactElement } from 'react';

export interface TempoControlProps {
  readonly tempo: Tempo;
  /** The Tempo is changing but the gesture is not over. */
  onChange(bpm: number): void;
  /** The gesture is over; this is the Tempo to keep. */
  onCommit(bpm: number): void;
}

const PIXELS_PER_BPM = 3;
const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowUp: 1,
  ArrowDown: -1,
  PageUp: 10,
  PageDown: -10,
};

const within = (bpm: number): number => Math.round(Math.min(Math.max(bpm, MIN_TEMPO), MAX_TEMPO));

/** A single number: drag it up or down, or use the arrow keys. */
export const TempoControl = ({ tempo, onChange, onCommit }: TempoControlProps): ReactElement => {
  const drag = useRef<{ readonly y: number; readonly from: number; bpm: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, from: tempo, bpm: tempo };
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!drag.current) return;
    const bpm = within(drag.current.from + (drag.current.y - event.clientY) / PIXELS_PER_BPM);
    if (bpm === drag.current.bpm) return;
    drag.current.bpm = bpm;
    onChange(bpm);
  };
  const onPointerEnd = (): void => {
    if (!drag.current) return;
    onCommit(drag.current.bpm);
    drag.current = null;
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    const step = KEY_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    onCommit(within(tempo + step));
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
    >
      {tempo}
    </div>
  );
};
