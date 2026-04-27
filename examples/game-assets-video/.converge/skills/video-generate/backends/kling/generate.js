/**
 * video-generate Kling backend.
 *
 * Kling (Kuaishou) is a leading img2vid model with strong character-reference
 * preservation — better than Veo or Runway for stylized characters in our
 * tests. Auth is JWT (HS256) signed with an access key + secret key pair.
 *
 * Required env vars (read from .env, exported, etc.):
 *   - KLINGAI_API_KEY        access key (the "ak")
 *   - KLINGAI_SECRET_KEY     secret key (the "sk")
 *
 * Optional env vars:
 *   - KLING_MODEL            default "kling-v1-6"
 *   - KLING_MODE             default "std" (faster/cheaper) — "pro" for higher quality
 *   - KLING_BASE_URL         default "https://api-singapore.klingai.com"
 *   - KLING_MAX_WAIT_S       default 600 (10 min)
 *
 * Endpoints (verified against
 *   https://app.klingai.com/global/dev/document-api/...):
 *
 *   POST {base}/v1/videos/image2video       — submit task
 *   GET  {base}/v1/videos/image2video/{id}  — poll task; status one of
 *                                             submitted/processing/succeed/failed
 *
 * Implementation notes:
 *   - JWT payload: { iss: ak, exp: now+1800, nbf: now-5 }, alg HS256.
 *   - Image is sent as base64-encoded PNG bytes (jpg/jpeg also accepted).
 *   - Kling video durations are "5" or "10" string seconds — we round
 *     duration_s to the nearer of those.
 *   - Aspect ratios supported: 16:9, 9:16, 1:1. We map our broader set down.
 *   - Final video is fetched from task_result.videos[0].url and written to
 *     output_path locally.
 */

import { writeFileSync, mkdirSync, appendFileSync, readFileSync } from 'fs';
import { dirname } from 'path';
import { createHmac } from 'crypto';

const LOG_PATH = '.converge/logs/video-generate.log';

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function makeJwt(accessKey, secretKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { iss: accessKey, exp: now + 1800, nbf: now - 5 };
  const headerEnc = base64url(JSON.stringify(header));
  const payloadEnc = base64url(JSON.stringify(payload));
  const signingInput = `${headerEnc}.${payloadEnc}`;
  const sig = createHmac('sha256', secretKey).update(signingInput).digest();
  return `${signingInput}.${base64url(sig)}`;
}

async function postJson(url, token, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch (_) { json = null; }
  if (!resp.ok) {
    throw new Error(`kling: ${resp.status} ${resp.statusText}: ${text.slice(0, 500)}`);
  }
  if (!json) throw new Error(`kling: non-JSON response: ${text.slice(0, 500)}`);
  if (json.code !== 0) {
    throw new Error(`kling: code=${json.code} message=${json.message || '?'}`);
  }
  return json;
}

async function getJson(url, token) {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch (_) { json = null; }
  if (!resp.ok) {
    throw new Error(`kling: ${resp.status} ${resp.statusText}: ${text.slice(0, 500)}`);
  }
  if (!json) throw new Error(`kling: non-JSON response: ${text.slice(0, 500)}`);
  if (json.code !== 0) {
    throw new Error(`kling: code=${json.code} message=${json.message || '?'}`);
  }
  return json;
}

export async function generate(input) {
  const {
    first_frame_image,
    last_frame_image,
    prompt,
    negative_prompt,
    duration_s,
    aspect_ratio = '1:1',
    seed = Math.floor(Math.random() * 1_000_000_000),
    fps = 24,
  } = input;

  if (!first_frame_image) throw new Error('kling: first_frame_image required');
  if (!prompt) throw new Error('kling: prompt required');
  if (!duration_s || duration_s <= 0) throw new Error('kling: duration_s must be > 0');

  const ak = process.env.KLINGAI_ACCESS_KEY
    || process.env.KLINGAI_API_KEY
    || process.env.KLING_ACCESS_KEY
    || process.env.KLING_API_KEY;
  const sk = process.env.KLINGAI_SECRET_KEY || process.env.KLING_SECRET_KEY;
  if (!ak || !sk) {
    throw new Error(
      'kling: KLINGAI_ACCESS_KEY + KLINGAI_SECRET_KEY env vars required ' +
        '(KLINGAI_API_KEY also accepted as the access key for back-compat). ' +
        'Get them from https://app.klingai.com/global/dev → API Key page. ' +
        'To run with no API spend, switch to the stub backend: ' +
        '`echo stub > .converge/skills/video-generate/backends/ACTIVE`.',
    );
  }

  const outputPath = input.output_path || input.video_path || 'output.mp4';
  mkdirSync(dirname(outputPath), { recursive: true });

  const baseUrl = process.env.KLING_BASE_URL || 'https://api-singapore.klingai.com';
  const model = process.env.KLING_MODEL || 'kling-v1-6';
  const mode = process.env.KLING_MODE || 'std';
  const maxWaitS = parseInt(process.env.KLING_MAX_WAIT_S || '600', 10);

  // Kling supports only "5" or "10" second clips.
  const klingDuration = duration_s <= 7.5 ? '5' : '10';

  // Kling supports 16:9, 9:16, 1:1.
  const klingAspect = ['16:9', '9:16', '1:1'].includes(aspect_ratio)
    ? aspect_ratio
    : aspect_ratio === '4:3' || aspect_ratio === '3:4'
      ? '1:1'
      : '16:9';

  const imageB64 = readFileSync(first_frame_image).toString('base64');

  const requestBody = {
    model_name: model,
    image: imageB64,
    prompt,
    duration: klingDuration,
    aspect_ratio: klingAspect,
    mode,
    cfg_scale: 0.5,
    external_task_id: String(seed),
  };
  // image_tail (bookend) is only accepted on certain Kling model+mode+duration
  // combinations. Empirically: kling-v1-6/std/5 rejects it. Set
  // KLING_BOOKEND=1 to send it anyway (e.g. if you've switched to a variant
  // that supports it, like kling-v2.1-master).
  if (last_frame_image && process.env.KLING_BOOKEND === '1') {
    requestBody.image_tail = readFileSync(last_frame_image).toString('base64');
  }
  if (negative_prompt) {
    requestBody.negative_prompt = negative_prompt;
  }

  const submitUrl = `${baseUrl}/v1/videos/image2video`;
  process.stderr.write(
    `kling: submitting img2vid model=${model} mode=${mode} duration=${klingDuration}s aspect=${klingAspect}\n`,
  );

  let token = makeJwt(ak, sk);
  const submit = await postJson(submitUrl, token, requestBody);
  const taskId = submit.data && submit.data.task_id;
  if (!taskId) throw new Error(`kling: submit response missing task_id: ${JSON.stringify(submit).slice(0, 500)}`);
  process.stderr.write(`kling: task ${taskId} submitted, polling…\n`);

  // Poll. Kling jobs typically complete in 60–180s.
  const pollUrl = `${baseUrl}/v1/videos/image2video/${taskId}`;
  const pollIntervalMs = 5000;
  const start = Date.now();
  let videoUrl = null;
  let actualDuration = parseFloat(klingDuration);
  while (true) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const elapsed = Math.floor((Date.now() - start) / 1000);
    if (elapsed > maxWaitS) {
      throw new Error(`kling: timed out after ${elapsed}s`);
    }
    // Refresh JWT periodically (cheap; tokens last 30min).
    if (elapsed > 1500 && elapsed % 1500 === 0) token = makeJwt(ak, sk);

    let poll;
    try {
      poll = await getJson(pollUrl, token);
    } catch (e) {
      process.stderr.write(`kling: poll error (${elapsed}s elapsed): ${e.message}\n`);
      continue;
    }
    const status = poll.data && poll.data.task_status;
    process.stderr.write(`kling: task=${status} (${elapsed}s elapsed)\n`);
    if (status === 'succeed') {
      const videos = poll.data.task_result && poll.data.task_result.videos;
      if (!videos || !videos.length) {
        throw new Error(`kling: succeed but no videos in result: ${JSON.stringify(poll).slice(0, 500)}`);
      }
      videoUrl = videos[0].url;
      if (videos[0].duration) actualDuration = parseFloat(videos[0].duration);
      break;
    }
    if (status === 'failed') {
      const msg = (poll.data && poll.data.task_status_msg) || 'unknown';
      throw new Error(`kling: task failed: ${msg}`);
    }
    // submitted | processing — keep polling.
  }

  process.stderr.write(`kling: downloading ${videoUrl}\n`);
  const dl = await fetch(videoUrl);
  if (!dl.ok) throw new Error(`kling: video download failed: ${dl.status} ${dl.statusText}`);
  const mp4 = Buffer.from(await dl.arrayBuffer());
  writeFileSync(outputPath, mp4);
  process.stderr.write(`kling: wrote ${outputPath} (${mp4.length} bytes)\n`);

  const actualSeed = typeof seed === 'number' ? seed : Math.floor(Math.random() * 1_000_000_000);
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(
    LOG_PATH,
    JSON.stringify({
      ts: new Date().toISOString(),
      backend: 'kling',
      model,
      mode,
      output_path: outputPath,
      duration_s: actualDuration,
      aspect_ratio: klingAspect,
      fps,
      seed: actualSeed,
      cost_usd: null,
      ok: true,
      task_id: taskId,
    }) + '\n',
  );

  return {
    video_path: outputPath,
    actual_duration_s: actualDuration,
    seed: actualSeed,
    model,
    cost_usd: null,
  };
}
