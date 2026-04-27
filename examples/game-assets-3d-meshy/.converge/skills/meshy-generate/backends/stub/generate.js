/**
 * meshy-generate stub backend.
 *
 * Copies vendor/stub-cube.glb to the requested output_path. Always succeeds.
 * Lets the entire playbook run offline with no credentials.
 */

import { copyFileSync, mkdirSync, appendFileSync, existsSync } from 'fs';
import { dirname } from 'path';

const LOG_PATH = '.converge/logs/meshy-generate.log';
const STUB_GLB = 'vendor/stub-cube.glb';

export async function generate(input) {
  const { mode, asset_slug, output_path } = input;
  if (!asset_slug) throw new Error('stub: asset_slug required');
  if (!output_path) throw new Error('stub: output_path required');
  if (!existsSync(STUB_GLB)) {
    throw new Error(
      `stub: ${STUB_GLB} not found — run scripts/_make_stub_glb.js to generate it`,
    );
  }

  mkdirSync(dirname(output_path), { recursive: true });
  copyFileSync(STUB_GLB, output_path);

  const task_id = `stub-${mode}-${asset_slug}-${Date.now()}`;

  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(
    LOG_PATH,
    JSON.stringify({
      ts: new Date().toISOString(),
      backend: 'stub',
      mode,
      asset_slug,
      task_id,
      output_path,
      cost_credits: 0,
      ok: true,
      warning: 'stub backend — placeholder cube, not a real generation',
    }) + '\n',
  );

  return {
    output_path,
    task_id,
    model: 'stub',
    cost_credits: 0,
  };
}
