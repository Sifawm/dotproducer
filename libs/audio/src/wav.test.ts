import { describe, expect, it } from 'vitest';
import { encodeWav } from './wav';

const text = (view: DataView, offset: number, length: number): string =>
  String.fromCharCode(...new Uint8Array(view.buffer, offset, length));

const bytes = (view: DataView, offset: number, length: number): number[] => [
  ...new Uint8Array(view.buffer, offset, length),
];

const stereo = (left: readonly number[], right: readonly number[]): DataView =>
  new DataView(encodeWav([Float32Array.from(left), Float32Array.from(right)], 48000));

describe('WAV encoder', () => {
  it('writes a RIFF/WAVE header for 48 kHz stereo 24-bit PCM', () => {
    const wav = stereo([0, 0, 0], [0, 0, 0]);
    expect(text(wav, 0, 4)).toBe('RIFF');
    expect(wav.getUint32(4, true)).toBe(wav.byteLength - 8);
    expect(text(wav, 8, 4)).toBe('WAVE');
    expect(text(wav, 12, 4)).toBe('fmt ');
    expect(wav.getUint32(16, true)).toBe(16);
    expect(wav.getUint16(20, true)).toBe(1);
    expect(wav.getUint16(22, true)).toBe(2);
    expect(wav.getUint32(24, true)).toBe(48000);
    expect(wav.getUint32(28, true)).toBe(48000 * 6);
    expect(wav.getUint16(32, true)).toBe(6);
    expect(wav.getUint16(34, true)).toBe(24);
    expect(text(wav, 36, 4)).toBe('data');
  });

  it('holds 6 bytes per frame of data', () => {
    const wav = stereo([0, 0, 0, 0, 0], [0, 0, 0, 0, 0]);
    expect(wav.getUint32(40, true)).toBe(30);
    expect(wav.byteLength).toBe(44 + 30);
  });

  it('interleaves the channels as little-endian 24-bit samples', () => {
    const wav = stereo([1, -0.5], [-1, 0]);
    expect(bytes(wav, 44, 12)).toEqual([
      0xff, 0xff, 0x7f, 0x00, 0x00, 0x80, 0x00, 0x00, 0xc0, 0x00, 0x00, 0x00,
    ]);
  });

  it('clips samples beyond full scale without normalising the rest', () => {
    const wav = stereo([2.5, 0.25], [-3, 0]);
    expect(bytes(wav, 44, 9)).toEqual([0xff, 0xff, 0x7f, 0x00, 0x00, 0x80, 0x00, 0x00, 0x20]);
  });
});
