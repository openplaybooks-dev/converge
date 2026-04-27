/**
 * meshy-generate meshy backend.
 *
 * Real Meshy AI integration. Two-stage: preview (cheap) then refine (PBR).
 * For refine, the caller passes preview_task_id so we don't re-bill geometry.
 *
 * Requires: MESHY_API_KEY env var, Meshy Pro tier.
 * Docs: https://docs.meshy.ai/en/api/text-to-3d
 *
 * On 429 NoMoreConcurrentTasks: backoff 30s, retry up to 3 times.
 * On 429 RateLimitExceeded: backoff 5s, retry.
 * On task FAILED: surface the error so Converge retry loop kicks in.
 */

import { writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { dirname } from 'path';

const API_BASE = 'https://api.meshy.ai/openapi';
const LOG_PATH = '.converge/logs/meshy-generate.log';
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_RATE_LIMIT_RETRIES = 3;

function authHeaders() {
  const key = process.env.MESHY_API_KEY;
  if (!key) throw new Error('meshy backend: MESHY_API_KEY env var is required');
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRateBackoff(url, init, attempt = 0) {
  const res = await fetch(url, init);
  if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
    const body = await res.text();
    const isConcurrent = body.includes('NoMoreConcurrentTasks');
    const wait = isConcurrent ? 30_000 : 5_000;
    console.error(`meshy: 429 (${isConcurrent ? 'concurrent' : 'rate'}) — sleeping ${wait}ms`);
    await sleep(wait);
    return fetchWithRateBackoff(url, init, attempt + 1);
  }
  return res;
}

async function createPreviewTask({ prompt, image_url, ai_model, model_type, topology, target_polycount, pose_mode }) {
  if (image_url) {
    // image-to-3D
    const body = {
      image_url,
      ai_model: ai_model || 'meshy-6',
      topology: topology || 'quad',
      target_polycount: target_polycount || 8000,
      should_texture: false, // refine handles texturing
    };
    const res = await fetchWithRateBackoff(`${API_BASE}/v1/image-to-3d`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`meshy image-to-3d create: ${res.status} ${await res.text()}`);
    const json = await res.json();
    return { task_id: json.result, endpoint: 'v1/image-to-3d' };
  }

  // text-to-3D
  if (!prompt) throw new Error('meshy: prompt or image_url required for preview');
  const body = {
    mode: 'preview',
    prompt,
    ai_model: ai_model || 'meshy-6',
    model_type: model_type || 'lowpoly',
    topology: topology || 'quad',
    target_polycount: target_polycount || 8000,
  };
  if (pose_mode) body.pose_mode = pose_mode;

  const res = await fetchWithRateBackoff(`${API_BASE}/v2/text-to-3d`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`meshy text-to-3d create: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return { task_id: json.result, endpoint: 'v2/text-to-3d' };
}

async function createRefineTask({ preview_task_id, enable_pbr, hd_texture }) {
  if (!preview_task_id) throw new Error('meshy refine: preview_task_id required');
  const body = {
    mode: 'refine',
    preview_task_id,
    enable_pbr: enable_pbr !== false,
  };
  if (hd_texture) body.hd_texture = true;

  const res = await fetchWithRateBackoff(`${API_BASE}/v2/text-to-3d`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`meshy refine create: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return { task_id: json.result, endpoint: 'v2/text-to-3d' };
}

async function pollTask(endpoint, task_id) {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const res = await fetchWithRateBackoff(`${API_BASE}/${endpoint}/${task_id}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`meshy poll: ${res.status} ${await res.text()}`);
    const t = await res.json();
    if (t.status === 'SUCCEEDED') return t;
    if (t.status === 'FAILED' || t.status === 'CANCELED') {
      throw new Error(`meshy task ${task_id} ${t.status}: ${t.task_error?.message || 'unknown'}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`meshy poll timeout after ${POLL_TIMEOUT_MS / 1000}s`);
}

async function downloadGlb(url, output_path) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download glb: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error(`downloaded glb is suspiciously small: ${buf.length} bytes`);
  // Validate glTF magic
  if (buf.readUInt32LE(0) !== 0x46546c67) {
    throw new Error(`downloaded file is not a GLB (bad magic)`);
  }
  mkdirSync(dirname(output_path), { recursive: true });
  writeFileSync(output_path, buf);
}

export async function generate(input) {
  const { mode, asset_slug, output_path } = input;
  if (!asset_slug) throw new Error('meshy: asset_slug required');
  if (!output_path) throw new Error('meshy: output_path required');
  if (mode !== 'preview' && mode !== 'refine') {
    throw new Error(`meshy: mode must be "preview" or "refine", got "${mode}"`);
  }

  const created = mode === 'preview'
    ? await createPreviewTask(input)
    : await createRefineTask(input);

  console.log(`  meshy ${mode} task: ${created.task_id}  (polling ${created.endpoint})`);

  const task = await pollTask(created.endpoint, created.task_id);

  // Pick GLB url. Refine tasks have model_urls.glb; preview tasks have it too.
  const glbUrl = task.model_urls?.glb;
  if (!glbUrl) throw new Error(`meshy task ${created.task_id} succeeded but has no glb url`);

  await downloadGlb(glbUrl, output_path);

  // Cost estimate (Meshy doesn't return actual billed credits in the response).
  const cost = mode === 'preview'
    ? (input.model_type === 'standard' ? 20 : 5)
    : 10;

  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify({
    ts: new Date().toISOString(),
    backend: 'meshy',
    mode,
    asset_slug,
    task_id: created.task_id,
    output_path,
    cost_credits: cost,
    ok: true,
  }) + '\n');

  return {
    output_path,
    task_id: created.task_id,
    model: input.ai_model || 'meshy-6',
    cost_credits: cost,
  };
}
