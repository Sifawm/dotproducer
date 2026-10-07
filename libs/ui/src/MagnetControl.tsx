import type { ReactElement } from 'react';

export interface MagnetControlProps {
  readonly on: boolean;
  onToggle(): void;
}

export const MagnetControl = ({ on, onToggle }: MagnetControlProps): ReactElement => (
  <button className="magnet" type="button" aria-pressed={on} onClick={onToggle}>
    Magnet
  </button>
);
