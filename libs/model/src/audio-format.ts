/** The file formats a Pattern can be exported to, the default first. */
export const AUDIO_FORMATS = ['wav', 'mp3'] as const;
export type AudioFormat = (typeof AUDIO_FORMATS)[number];
