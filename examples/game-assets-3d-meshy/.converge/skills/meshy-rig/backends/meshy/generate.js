/**
 * meshy-rig meshy backend.
 *
 * POST /openapi/v1/rigging — auto-rigs a humanoid GLB.
 * The response includes a rigged GLB url and a rig_task_id to pass to animations.
 *
 * Docs: https://docs.meshy.ai/en/api/rigging
 */

import { writeFileSync, mkdirSync, appendFileSync, readFileSync } from 'fs';
import { dirname } from 'path';

const API_BASE = 'https://api.meshy.ai/openapi';
const LOG_PATH = '.converge/logs/meshy-rig.log';
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

function authHeaders() {
  const key = process.env.MESHY_API_KEY;
  if (!key) throw new Error('meshy backend: MESHY_API_KEY env var is required');
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function uploadGlb(input_glb) {
  // Meshy expects either input_task_id (chained from a prior generation)
  // or model_url (a publicly reachable URL). For simplicity we assume the
  // caller already has either:
  //   (a) a Meshy preview/refine task id (passed as input_task_id), OR
  //   (b) a hosted URL for the glb (passed as input_url)
  // For local files, host them via a temporary public URL out-of-band.
  // This stub-meshy backend prefers (a): playbook task 06 passes the
  // refine task_id from task 05.
  throw new Error(
    'meshy-rig: must pass input_task_id (from prior meshy-generate refine) or input_url. ' +
    'Local file uploads not implemented — see Meshy docs for direct upload API.',
  );
}

export async function generate(input) {
  const { asset_slug, input_glb, output_path, input_task_id, input_url, height_meters } = input;
  if (!asset_slug) throw new Error('meshy: asset_slug required');
  if (!output_path) throw new Error('meshy: output_path required');

  const body = { height_meters: height_meters || 1.7 };
  if (input_task_id) body.input_task_id = input_task_id;
  else if (input_url) body.model_url = input_url;
  else if (input_glb) await uploadGlb(input_glb);
  else throw new Error('meshy: input_task_id or input_url required');

  const create = await fetch(`${API_BASE}/v1/rigging`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
  });
  if (!create.ok) throw new Error(`meshy rig create: ${create.status} ${await create.text()}`);
  const { result: rig_task_id } = await create.json();

  console.log(`  meshy rig task: ${rig_task_id}`);

  // Poll
  const start = Date.now();
  let task;
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const r = await fetch(`${API_BASE}/v1/rigging/${rig_task_id}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`meshy rig poll: ${r.status}`);
    task = await r.json();
    if (task.status === 'SUCCEEDED') break;
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(`meshy rig ${rig_task_id} ${task.status}: ${task.task_error?.message || 'unknown'}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  if (!task || task.status !== 'SUCCEEDED') throw new Error('meshy rig poll timeout');

  // Download rigged glb
  const glbUrl = task.model_urls?.glb;
  if (!glbUrl) throw new Error('meshy rig succeeded but no glb url');
  const dl = await fetch(glbUrl);
  if (!dl.ok) throw new Error(`download rigged glb: ${dl.status}`);
  const buf = Buffer.from(await dl.arrayBuffer());
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('rigged glb has bad magic');
  mkdirSync(dirname(output_path), { recursive: true });
  writeFileSync(output_path, buf);

  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify({
    ts: new Date().toISOString(),
    backend: 'meshy', asset_slug, rig_task_id, output_path,
    cost_credits: 0, // bundled with downstream animation calls
    ok: true,
  }) + '\n');

  return { output_path, rig_task_id, cost_credits: 0 };
}
