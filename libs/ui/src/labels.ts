import type { Position, Sound, Voice } from '@dotproducer/model';

export const SOUND_NAMES: Readonly<Record<Sound, string>> = {
  kick: 'Kick',
  snare: 'Snare',
  clap: 'Clap',
  closedHat: 'Closed Hat',
  openHat: 'Open Hat',
  tom: 'Tom',
};

/** Every Division of Straight (eighths) and Triplet (twelfths) is a whole number of 24ths. */
const TWENTY_FOURTHS = 24;
const EPSILON = 1e-9;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** "on the beat", "1/3 past the beat"…; null when the angle is on neither grid. */
const divisionName = (turns: number): string | null => {
  const exact = turns * TWENTY_FOURTHS;
  const n = Math.round(exact);
  if (Math.abs(exact - n) > EPSILON || (n % 2 !== 0 && n % 3 !== 0)) return null;
  if (n === 0 || n === TWENTY_FOURTHS) return 'on the beat';
  if (n === TWENTY_FOURTHS / 2) return 'off the beat';
  const divisor = gcd(n, TWENTY_FOURTHS);
  return `${n / divisor}/${TWENTY_FOURTHS / divisor} past the beat`;
};

/** For example "Ring 3, off the beat"; Free placement is described approximately. */
export const describePosition = ({ distance, angle }: Position): string => {
  const inner = Math.floor(distance);
  const ring =
    Number.isInteger(distance) ? `Ring ${distance}` : `between Ring ${inner} and Ring ${inner + 1}`;
  return `${ring}, ${divisionName(angle) ?? `${Math.round(angle * 100)}% past the beat`}`;
};

/** For example "Kick, Ring 3, off the beat". */
export const describeVoice = (voice: Voice): string =>
  `${SOUND_NAMES[voice.sound]}, ${describePosition(voice)}${voice.muted ? ', muted' : ''}`;
