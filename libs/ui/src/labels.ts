import { DIVISIONS, type Angle, type Position, type Sound, type Voice } from '@dotproducer/model';

export const SOUND_NAMES: Readonly<Record<Sound, string>> = {
  kick: 'Kick',
  snare: 'Snare',
  clap: 'Clap',
  closedHat: 'Closed Hat',
  openHat: 'Open Hat',
  tom: 'Tom',
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** Every Division of every Magnet mode is a whole number of these parts of the Period. */
const PARTS = Object.values(DIVISIONS).reduce((a, b) => (a * b) / gcd(a, b));
const EPSILON = 1e-9;

/** "on the beat", "1/3 past the beat"…; null when the angle is on neither grid. */
const divisionName = (turns: Angle): string | null => {
  const exact = turns * PARTS;
  const n = Math.round(exact) % PARTS;
  const onADivision = Object.values(DIVISIONS).some((divisions) => n % (PARTS / divisions) === 0);
  if (Math.abs(exact - Math.round(exact)) > EPSILON || !onADivision) return null;
  if (n === 0) return 'on the beat';
  if (n === PARTS / 2) return 'off the beat';
  const divisor = gcd(n, PARTS);
  return `${n / divisor}/${PARTS / divisor} past the beat`;
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
