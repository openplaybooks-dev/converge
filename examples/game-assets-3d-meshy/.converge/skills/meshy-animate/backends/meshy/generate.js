/**
 * meshy-animate meshy backend.
 *
 * POST /openapi/v1/animations with rig_task_id + action_id.
 * Returns a glb containing the skinned mesh with one named clip.
 */

import { writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { dirname } from 'path';

const API_BASE = 'https://api.meshy.ai/openapi';
const LOG_PATH = '.converge/logs/meshy-animate.log';
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

function authHeaders() {
  const key = process.env.MESHY_API_KEY;
  if (!key) throw new Error('meshy backend: MESHY_API_KEY env var is required');
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

export async function generate(input) {
  const { asset_slug, rig_task_id, action_name, action_id, output_path, fps } = input;
  if (!asset_slug) throw new Error('meshy: asset_slug required');
  if (!rig_task_id) throw new Error('meshy: rig_task_id required');
  if (!action_id) throw new Error('meshy: action_id required');
  if (!output_path) throw new Error('meshy: output_path required');

  const body = {
    rig_task_id,
    action_id,
    post_process: { change_fps: fps || 30 },
  };

  const create = await fetch(`${API_BASE}/v1/animations`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
  });
  if (!create.ok) throw new Error(`meshy animate create: ${create.status} ${await create.text()}`);
  const { result: task_id } = await create.json();

  console.log(`  meshy anim task: ${task_id} (${action_name})`);

  const start = Date.now();
  let task;
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const r = await fetch(`${API_BASE}/v1/animations/${task_id}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`meshy anim poll: ${r.status}`);
    task = await r.json();
    if (task.status === 'SUCCEEDED') break;
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(`meshy anim ${task_id} ${task.status}: ${task.task_error?.message || 'unknown'}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  if (!task || task.status !== 'SUCCEEDED') throw new Error('meshy anim poll timeout');

  const glbUrl = task.model_urls?.glb;
  if (!glbUrl) throw new Error('meshy anim succeeded but no glb url');
  const dl = await fetch(glbUrl);
  if (!dl.ok) throw new Error(`download anim glb: ${dl.status}`);
  const buf = Buffer.from(await dl.arrayBuffer());
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('anim glb has bad magic');
  mkdirSync(dirname(output_path), { recursive: true });
  writeFileSync(output_path, buf);

  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify({
    ts: new Date().toISOString(),
    backend: 'meshy', asset_slug, action_name, action_id, rig_task_id,
    task_id, output_path, cost_credits: 3, ok: true,
  }) + '\n');

  return { output_path, action_name, task_id, cost_credits: 3 };
}
