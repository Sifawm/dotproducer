import { addVoice, emptyPattern, setTempo, toggleMuted, type Pattern } from './pattern';
import type { Sound } from './sound';
import { DEFAULT_TEMPO, angle, ringDistance } from './units';

const VERSION = 'v1';
const SEPARATOR = '~';
const COORDINATE_SEPARATOR = '_';

// A lower-case letter is a Voice; the same letter in upper case is that Voice Muted.
const LETTERS: Readonly<Record<Sound, string>> = {
  kick: 'k',
  snare: 's',
  clap: 'c',
  closedHat: 'h',
  openHat: 'o',
  tom: 't',
};

const soundOf = (letter: string): Sound | undefined =>
  (Object.keys(LETTERS) as Sound[]).find((sound) => LETTERS[sound] === letter);

/** `v1~<tempo>~<voice>~…`, each Voice being `<letter><distance>_<angle>`. */
export const encodePattern = (pattern: Pattern): string =>
  [
    VERSION,
    String(pattern.tempo),
    ...pattern.voices.map((voice) => {
      const letter = LETTERS[voice.sound];
      return `${voice.muted ? letter.toUpperCase() : letter}${voice.distance}${COORDINATE_SEPARATOR}${voice.angle}`;
    }),
  ].join(SEPARATOR);

const number = (text: string | undefined): number =>
  text === undefined || text.trim() === '' ? Number.NaN : Number(text);

/** Total: never throws, drops what it cannot read, clamps what is out of range. */
export const decodePattern = (text: string): Pattern => {
  const [version, tempoText, ...voiceTexts] = text.split(SEPARATOR);
  if (version !== VERSION) return emptyPattern;
  const bpm = number(tempoText);
  const start = setTempo(emptyPattern, Number.isFinite(bpm) ? bpm : DEFAULT_TEMPO);
  return voiceTexts.reduce((pattern, voiceText) => {
    const letter = voiceText.charAt(0);
    const sound = soundOf(letter.toLowerCase());
    const [distanceText, angleText] = voiceText.slice(1).split(COORDINATE_SEPARATOR);
    const distance = number(distanceText);
    const turns = number(angleText);
    if (!sound || !Number.isFinite(distance) || !Number.isFinite(turns)) return pattern;
    const added = addVoice(
      pattern,
      sound,
      { distance: ringDistance(distance), angle: angle(turns) },
      false,
    );
    const voice = added.voices[added.voices.length - 1];
    const muted = letter !== letter.toLowerCase();
    return muted && voice && added !== pattern ? toggleMuted(added, voice.id) : added;
  }, start);
};
