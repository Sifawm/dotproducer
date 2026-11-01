import type { MagnetMode } from '@dotproducer/model';
import type { ReactElement } from 'react';

export type MagnetState = MagnetMode | 'off';

export interface MagnetControlProps {
  readonly state: MagnetState;
  /** Straight → Triplet → off → Straight. */
  onStep(): void;
}

export const MAGNET_NAMES: Readonly<Record<MagnetState, string>> = {
  straight: 'Straight',
  triplet: 'Triplet',
  off: 'Off',
};

export const MagnetControl = ({ state, onStep }: MagnetControlProps): ReactElement => (
  <button
    className="magnet"
    type="button"
    data-state={state}
    aria-label={`Magnet, ${MAGNET_NAMES[state]}`}
    onClick={onStep}
  >
    Magnet
    <span className="magnet-state">{MAGNET_NAMES[state]}</span>
  </button>
);
