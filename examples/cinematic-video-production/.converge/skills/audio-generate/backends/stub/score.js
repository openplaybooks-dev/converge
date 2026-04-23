import { writeSilentWav, logCall } from './_shared.js';

export async function score(input) {
  const { mood, duration_s, output_path } = input;
  if (!mood) throw new Error('stub score: mood required');
  if (!duration_s) throw new Error('stub score: duration_s required');
  if (!output_path) throw new Error('stub score: output_path required');

  writeSilentWav(output_path, duration_s);
  logCall({ mode: 'score', mood, output_path, duration_s });

  return { audio_path: output_path, duration_s, model: 'stub', cost_usd: 0 };
}
