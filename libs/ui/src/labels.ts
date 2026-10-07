import { ANGULAR_DIVISIONS, type Position, type Sound, type Voice } from '@dotproducer/model';

export const SOUND_NAMES: Readonly<Record<Sound, string>> = {
  kick: 'Kick',
  snare: 'Snare',
  clap: 'Clap',
  closedHat: 'Closed Hat',
  openHat: 'Open Hat',
  tom: 'Tom',
};

const DIVISION_NAMES = [
  'on the beat',
  '1/8 past the beat',
  '1/4 past the beat',
  '3/8 past the beat',
  'off the beat',
  '5/8 past the beat',
  '3/4 past the beat',
  '7/8 past the beat',
];

/** For example "Ring 3, off the beat"; Free placement is described approximately. */
export const describePosition = ({ distance, angle }: Position): string => {
  const inner = Math.floor(distance);
  const ring =
    Number.isInteger(distance) ? `Ring ${distance}` : `between Ring ${inner} and Ring ${inner + 1}`;
  const division = angle * ANGULAR_DIVISIONS;
  const phase = Number.isInteger(division)
    ? DIVISION_NAMES[division]
    : `${Math.round(angle * 100)}% past the beat`;
  return `${ring}, ${phase}`;
};

/** For example "Kick, Ring 3, off the beat". */
export const describeVoice = (voice: Voice): string =>
  `${SOUND_NAMES[voice.sound]}, ${describePosition(voice)}${voice.muted ? ', muted' : ''}`;
