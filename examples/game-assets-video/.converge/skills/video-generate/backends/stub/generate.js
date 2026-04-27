/**
 * video-generate stub backend.
 *
 * Writes a 1KB placeholder .mp4 with a valid but empty ftyp box. Passes
 * file-existence and size checks; produces no real video. Use for end-to-end
 * pipeline testing without API costs.
 */

import { writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { dirname } from 'path';

// Smallest valid ftyp box (32 bytes) — enough for ffprobe to identify as mp4
// and for size checks to pass with padding below.
const FTYP = Buffer.from([
  0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // size 32, 'ftyp'
  0x69, 0x73, 0x6f, 0x6d, // major brand 'isom'
  0x00, 0x00, 0x02, 0x00, // minor version
  0x69, 0x73, 0x6f, 0x6d, // compat 'isom'
  0x69, 0x73, 0x6f, 0x32, // compat 'iso2'
  0x61, 0x76, 0x63, 0x31, // compat 'avc1'
  0x6d, 0x70, 0x34, 0x31, // compat 'mp41'
]);

const LOG_PATH = '.converge/logs/video-generate.log';

export async function generate(input) {
  const {
    first_frame_image,
    last_frame_image,
    prompt,
    duration_s,
    aspect_ratio = '4:3',
    seed = Math.floor(Math.random() * 1_000_000_000),
    fps = 24,
  } = input;

  if (!first_frame_image) throw new Error('stub: first_frame_image required');
  if (!prompt) throw new Error('stub: prompt required');
  if (!duration_s || duration_s <= 0) throw new Error('stub: duration_s must be > 0');

  const outputPath = input.output_path || input.video_path || 'output.mp4';

  mkdirSync(dirname(outputPath), { recursive: true });

  const padding = Buffer.alloc(1024 - FTYP.length);
  writeFileSync(outputPath, Buffer.concat([FTYP, padding]));

  const actualSeed = typeof seed === 'number' ? seed : Math.floor(Math.random() * 1_000_000_000);

  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(
    LOG_PATH,
    JSON.stringify({
      ts: new Date().toISOString(),
      backend: 'stub',
      model: 'stub',
      output_path: outputPath,
      duration_s,
      aspect_ratio,
      fps,
      seed: actualSeed,
      cost_usd: 0,
      ok: true,
      has_last_frame: !!last_frame_image,
      warning: 'stub backend — no real video generated',
    }) + '\n',
  );

  return {
    video_path: outputPath,
    actual_duration_s: duration_s,
    seed: actualSeed,
    model: 'stub',
    cost_usd: 0,
  };
}
