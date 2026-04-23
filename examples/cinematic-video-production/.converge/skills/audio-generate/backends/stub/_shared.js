import { writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { dirname } from 'path';

const LOG_PATH = '.converge/logs/audio-generate.log';

/**
 * Write a silent WAV: 48kHz, mono, 16-bit PCM, `duration_s` seconds.
 */
export function writeSilentWav(path, duration_s) {
  const sampleRate = 48000;
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const numSamples = Math.max(1, Math.round(sampleRate * duration_s));
  const dataSize = numSamples * blockAlign;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);              // Subchunk1Size
  header.writeUInt16LE(1, 20);               // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const samples = Buffer.alloc(dataSize); // zeros = silence

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([header, samples]));
}

export function logCall(info) {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(
    LOG_PATH,
    JSON.stringify({
      ts: new Date().toISOString(),
      backend: 'stub',
      model: 'stub',
      cost_usd: 0,
      ok: true,
      ...info,
    }) + '\n',
  );
}
