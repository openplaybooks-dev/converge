/**
 * meshy-rig stub backend.
 *
 * Copies input_glb to output_path and returns a fake rig_task_id.
 * Sufficient for offline pipeline validation.
 */

import { copyFileSync, mkdirSync, appendFileSync, existsSync } from 'fs';
import { dirname } from 'path';

const LOG_PATH = '.converge/logs/meshy-rig.log';

export async function generate(input) {
  const { asset_slug, input_glb, output_path } = input;
  if (!asset_slug) throw new Error('stub: asset_slug required');
  if (!input_glb || !existsSync(input_glb)) {
    throw new Error(`stub: input_glb not found at ${input_glb}`);
  }
  if (!output_path) throw new Error('stub: output_path required');

  mkdirSync(dirname(output_path), { recursive: true });
  copyFileSync(input_glb, output_path);

  const rig_task_id = `stub-rig-${asset_slug}-${Date.now()}`;

  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify({
    ts: new Date().toISOString(),
    backend: 'stub', asset_slug, rig_task_id, output_path, cost_credits: 0, ok: true,
    warning: 'stub backend — no actual rigging performed',
  }) + '\n');

  return { output_path, rig_task_id, cost_credits: 0 };
}
