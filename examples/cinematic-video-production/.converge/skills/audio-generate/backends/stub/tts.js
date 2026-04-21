import { writeSilentWav, logCall } from './_shared.js';

export async function tts(input) {
  const { text, voice_spec, output_path } = input;
  if (!text) throw new Error('stub tts: text required');
  if (!voice_spec?.id) throw new Error('stub tts: voice_spec.id required');
  if (!output_path) throw new Error('stub tts: output_path required');

  // Duration heuristic: ~3 words/second at natural pace
  const words = text.trim().split(/\s+/).length;
  const duration_s = Math.max(0.8, words / 3);

  writeSilentWav(output_path, duration_s);
  logCall({ mode: 'tts', voice_id: voice_spec.id, output_path, duration_s });

  return { audio_path: output_path, duration_s, model: 'stub', cost_usd: 0 };
}
