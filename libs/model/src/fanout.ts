import { samePosition, type Pattern, type Voice, type VoiceId } from './pattern';
import { SOUNDS } from './sound';
import { angle, type Angle } from './units';

/** Gap between fanned-out Voices, measured along their Ring in Ring units. */
const FAN_GAP = 0.7;

/**
 * The angle at which to draw each Voice so that Voices sharing a position are
 * separated. Purely visual: the Phase of every Voice still comes from its own angle.
 */
export const displayAngles = (pattern: Pattern): ReadonlyMap<VoiceId, Angle> => {
  const groups: Voice[][] = [];
  for (const voice of pattern.voices) {
    const group = groups.find(([member]) => member && samePosition(member, voice));
    if (group) group.push(voice);
    else groups.push([voice]);
  }
  const angles = new Map<VoiceId, Angle>();
  for (const group of groups) {
    const ordered = [...group].sort((a, b) => SOUNDS.indexOf(a.sound) - SOUNDS.indexOf(b.sound));
    ordered.forEach((voice, index) => {
      const step = FAN_GAP / (2 * Math.PI * voice.distance);
      const offset = (index - (ordered.length - 1) / 2) * step;
      angles.set(voice.id, offset === 0 ? voice.angle : angle(voice.angle + offset));
    });
  }
  return angles;
};
