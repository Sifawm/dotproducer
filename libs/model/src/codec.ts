import { addVoice, emptyPattern, setMagnetMode, setTempo, toggleMuted, type Pattern } from './pattern';
import type { Sound } from './sound';
import { DEFAULT_TEMPO, angle, ringDistance } from './units';

const V1 = 'v1';
const V2 = 'v2';
const SEPARATOR = '~';
/** The v2 header field for Triplet; Straight is the default and is never written. */
const TRIPLET = 'd12';
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

/**
 * `v1~<tempo>~<voice>~…`, each Voice being `<letter><distance>_<angle>`; a Triplet
 * Pattern is `v2~<tempo>d12~<voice>~…`, so every Straight link stays v1.
 */
export const encodePattern = (pattern: Pattern): string =>
  [
    ...(pattern.magnetMode === 'triplet' ? [V2, `${pattern.tempo}${TRIPLET}`] : [V1, String(pattern.tempo)]),
    ...pattern.voices.map((voice) => {
      const letter = LETTERS[voice.sound];
      return `${voice.muted ? letter.toUpperCase() : letter}${voice.distance}${COORDINATE_SEPARATOR}${voice.angle}`;
    }),
  ].join(SEPARATOR);

const number = (text: string | undefined): number =>
  text === undefined || text.trim() === '' ? Number.NaN : Number(text);

/** Total: never throws, drops what it cannot read, clamps what is out of range. */
export const decodePattern = (text: string): Pattern => {
  const [version, header = '', ...voiceTexts] = text.split(SEPARATOR);
  if (version !== V1 && version !== V2) return emptyPattern;
  // A v2 header is the Tempo followed by fields, each a lower-case letter and its value.
  const tempoText = version === V1 ? header : header.replace(/[a-z].*/s, '');
  const fields: readonly string[] = version === V1 ? [] : (header.match(/[a-z][^a-z]*/g) ?? []);
  const bpm = number(tempoText);
  const tempoSet = setTempo(emptyPattern, Number.isFinite(bpm) ? bpm : DEFAULT_TEMPO);
  const start = fields.includes(TRIPLET) ? setMagnetMode(tempoSet, 'triplet') : tempoSet;
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
      null,
    );
    const voice = added.voices[added.voices.length - 1];
    const muted = letter !== letter.toLowerCase();
    return muted && voice && added !== pattern ? toggleMuted(added, voice.id) : added;
  }, start);
};
