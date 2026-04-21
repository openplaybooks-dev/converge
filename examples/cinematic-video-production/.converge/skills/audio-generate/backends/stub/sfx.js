import { writeSilentWav, logCall } from './_shared.js';

export async function sfx(input) {
  const { description, duration_s, output_path } = input;
  if (!description) throw new Error('stub sfx: description required');
  if (!duration_s) throw new Error('stub sfx: duration_s required');
  if (!output_path) throw new Error('stub sfx: output_path required');

  writeSilentWav(output_path, duration_s);
  logCall({ mode: 'sfx', description, output_path, duration_s });

  return { audio_path: output_path, duration_s, model: 'stub', cost_usd: 0 };
}
