/**
 * meshy-animate stub backend.
 *
 * Copies vendor/stub-cube.glb (or the rigged glb if available) to output_path.
 * Records the action_name so play.html knows which clip it represents.
 *
 * The play.html runtime detects stub-output (no animation channels in the GLB)
 * and falls back to procedural rotation/bobbing per asset_kind.
 */

import { copyFileSync, mkdirSync, appendFileSync, existsSync } from 'fs';
import { dirname } from 'path';

const LOG_PATH = '.converge/logs/meshy-animate.log';
const FALLBACK_GLB = 'vendor/stub-cube.glb';

export async function generate(input) {
  const { asset_slug, rig_task_id, action_name, action_id, output_path, rigged_glb } = input;
  if (!asset_slug) throw new Error('stub: asset_slug required');
  if (!action_name) throw new Error('stub: action_name required');
  if (!output_path) throw new Error('stub: output_path required');

  // Prefer the rigged glb if the caller passed it; otherwise the stub cube.
  const src = rigged_glb && existsSync(rigged_glb) ? rigged_glb : FALLBACK_GLB;
  if (!existsSync(src)) {
    throw new Error(`stub: source glb not found (${src})`);
  }

  mkdirSync(dirname(output_path), { recursive: true });
  copyFileSync(src, output_path);

  const task_id = `stub-anim-${asset_slug}-${action_name}-${Date.now()}`;

  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify({
    ts: new Date().toISOString(),
    backend: 'stub', asset_slug, action_name, action_id, rig_task_id,
    task_id, output_path, cost_credits: 0, ok: true,
    warning: 'stub backend — no animation channels embedded; play.html will fall back to procedural',
  }) + '\n');

  return { output_path, action_name, task_id, cost_credits: 0 };
}
