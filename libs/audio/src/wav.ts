const HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 3;

/** Clips a sample to full scale, [-1, 1]; a missing one is silence. */
export const clipSample = (sample = 0): number => Math.min(1, Math.max(-1, sample));

/**
 * Encodes rendered channels as a RIFF/WAVE file of 24-bit signed little-endian PCM,
 * channels interleaved. Samples beyond full scale are clipped, never normalised.
 */
export const encodeWav = (channels: readonly Float32Array[], sampleRate: number): ArrayBuffer => {
  const frames = channels[0]?.length ?? 0;
  const blockAlign = channels.length * BYTES_PER_SAMPLE;
  const dataBytes = frames * blockAlign;
  const view = new DataView(new ArrayBuffer(HEADER_BYTES + dataBytes));
  const text = (offset: number, value: string): void =>
    [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));

  text(0, 'RIFF');
  view.setUint32(4, HEADER_BYTES - 8 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BYTES_PER_SAMPLE * 8, true);
  text(36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = HEADER_BYTES;
  for (let frame = 0; frame < frames; frame++) {
    for (const channel of channels) {
      const sample = clipSample(channel[frame]);
      const value = Math.round(sample < 0 ? sample * 0x800000 : sample * 0x7fffff);
      view.setUint8(offset, value & 0xff);
      view.setUint8(offset + 1, (value >> 8) & 0xff);
      view.setUint8(offset + 2, (value >> 16) & 0xff);
      offset += BYTES_PER_SAMPLE;
    }
  }
  return view.buffer;
};
