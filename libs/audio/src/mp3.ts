const BITRATE = 192_000;

/**
 * Encodes rendered channels as a 192 kbps CBR MP3 with LAME, through mediabunny.
 * Both are loaded on first use only, so they stay out of the main bundle; a failed
 * load rejects, and the next call tries again. Samples beyond full scale are clipped.
 */
export const encodeMp3 = async (channels: readonly Float32Array[], sampleRate: number): Promise<Blob> => {
  const [{ AudioSample, AudioSampleSource, BufferTarget, Mp3OutputFormat, Output, Quality }, { registerMp3Encoder }] =
    await Promise.all([import('mediabunny'), import('@mediabunny/mp3-encoder')]);
  registerMp3Encoder();

  const output = new Output({ format: new Mp3OutputFormat(), target: new BufferTarget() });
  const source = new AudioSampleSource({
    codec: 'mp3',
    quality: new Quality({ bitrate: BITRATE, bitrateMode: 'constant' }),
  });
  output.addAudioTrack(source);
  await output.start();

  const frames = channels[0]?.length ?? 0;
  const planar = new Float32Array(frames * channels.length);
  channels.forEach((channel, index) => planar.set(channel, index * frames));
  const sample = new AudioSample({
    data: planar,
    format: 'f32-planar',
    numberOfChannels: channels.length,
    sampleRate,
    timestamp: 0,
  });
  await source.add(sample);
  sample.close();
  await output.finalize();

  const { buffer } = output.target;
  if (!buffer) throw new Error('The MP3 encoder produced no file.');
  return new Blob([buffer], { type: 'audio/mpeg' });
};
