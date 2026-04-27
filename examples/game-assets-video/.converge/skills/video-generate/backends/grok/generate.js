/**
 * video-generate Grok (xAI) backend.
 *
 * Calls the xAI Imagine video API (model: grok-imagine-video) at api.x.ai.
 * Of the three live backends:
 *   - veo  needs an 8s minimum and only supports last_frame on v3.1-preview
 *   - kling has a 5s/10s discrete duration and rejects bookend on most variants
 *   - grok accepts 1–15 seconds, more aspect ratios, simpler bearer-token auth
 * Grok is the most flexible for our 1-second sprite cycles.
 *
 * Required env vars:
 *   - XAI_API_KEY        the official name (https://console.x.ai)
 *   - GROK_API_KEY       also accepted
 *
 * Optional env vars:
 *   - GROK_MODEL         default "grok-imagine-video"
 *   - GROK_RESOLUTION    "480p" (default) or "720p"
 *   - GROK_BASE_URL      default "https://api.x.ai"
 *   - GROK_MAX_WAIT_S    default 600 (10 min)
 *
 * Endpoints:
 *   POST {base}/v1/videos/generations    — submit task; returns {request_id}
 *   GET  {base}/v1/videos/{request_id}   — poll; status one of pending/done/expired/failed
 *
 * Image-to-video: pass `image` as a data URI (`data:image/png;base64,...`).
 * Output: video URL at data.video.url, downloaded locally to output_path.
 *
 * Notes:
 *   - last_frame_image is NOT supported by xAI's API today; the bookend
 *     parameter is silently ignored.
 *   - negative_prompt is not exposed in the public API; ignored.
 *   - Aspect ratio defaults to 1:1 to match the rest of our pipeline; matters
 *     less than Veo's because Grok crops more cleanly.
 */

import { writeFileSync, mkdirSync, appendFileSync, readFileSync } from 'fs';
import { dirname, extname } from 'path';

const LOG_PATH = '.converge/logs/video-generate.log';

function readImageAsDataUri(path) {
  const ext = extname(path).toLowerCase();
  const mime = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }[ext] || 'image/png';
  const b64 = readFileSync(path).toString('base64');
  return `data:${mime};base64,${b64}`;
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
    throw new Error(`grok: ${resp.status} ${resp.statusText}: ${text.slice(0, 500)}`);
  }
  if (!json) throw new Error(`grok: non-JSON response: ${text.slice(0, 500)}`);
  return json;
}

async function getJson(url, token) {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch (_) { json = null; }
  if (!resp.ok) {
    throw new Error(`grok: ${resp.status} ${resp.statusText}: ${text.slice(0, 500)}`);
  }
  if (!json) throw new Error(`grok: non-JSON response: ${text.slice(0, 500)}`);
  return json;
}

export async function generate(input) {
  const {
    first_frame_image,
    last_frame_image,
    prompt,
    duration_s,
    aspect_ratio = '1:1',
    seed = Math.floor(Math.random() * 1_000_000_000),
    fps = 24,
  } = input;

  if (!first_frame_image) throw new Error('grok: first_frame_image required');
  if (!prompt) throw new Error('grok: prompt required');
  if (!duration_s || duration_s <= 0) throw new Error('grok: duration_s must be > 0');

  const token = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!token) {
    throw new Error(
      'grok: XAI_API_KEY (or GROK_API_KEY) env var required. ' +
        'Get a key from https://console.x.ai. ' +
        'To run with no API spend, switch to the stub backend: ' +
        '`echo stub > .converge/skills/video-generate/backends/ACTIVE`.',
    );
  }

  const outputPath = input.output_path || input.video_path || 'output.mp4';
  mkdirSync(dirname(outputPath), { recursive: true });

  const baseUrl = process.env.GROK_BASE_URL || 'https://api.x.ai';
  const model = process.env.GROK_MODEL || 'grok-imagine-video';
  const resolution = process.env.GROK_RESOLUTION || '480p';
  const maxWaitS = parseInt(process.env.GROK_MAX_WAIT_S || '600', 10);

  // Grok accepts 1-15s integers; clamp.
  const grokDuration = Math.min(15, Math.max(1, Math.round(duration_s)));

  // Grok supports a wider aspect set than Veo/Kling; map ours through.
  const supported = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'];
  const grokAspect = supported.includes(aspect_ratio) ? aspect_ratio : '1:1';

  // xAI's image-to-video REST endpoint expects `image` as an object with
  // either {url: "https://..."} or {url: "data:image/png;base64,..."} —
  // a bare string is rejected with 422.
  const body = {
    model,
    prompt,
    image: { url: readImageAsDataUri(first_frame_image) },
    duration: grokDuration,
    aspect_ratio: grokAspect,
    resolution,
  };

  if (last_frame_image) {
    process.stderr.write(
      'grok: last_frame_image provided but xAI API does not support bookend frames; ignoring.\n',
    );
  }

  const submitUrl = `${baseUrl}/v1/videos/generations`;
  process.stderr.write(
    `grok: submitting img2vid model=${model} duration=${grokDuration}s aspect=${grokAspect} res=${resolution}\n`,
  );

  const submit = await postJson(submitUrl, token, body);
  const requestId = submit.request_id || (submit.data && submit.data.request_id);
  if (!requestId) {
    throw new Error(`grok: submit response missing request_id: ${JSON.stringify(submit).slice(0, 500)}`);
  }
  process.stderr.write(`grok: request ${requestId} submitted, polling…\n`);

  const pollUrl = `${baseUrl}/v1/videos/${requestId}`;
  const pollIntervalMs = 5000;
  const start = Date.now();
  let videoUrl = null;
  let actualDuration = grokDuration;
  while (true) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const elapsed = Math.floor((Date.now() - start) / 1000);
    if (elapsed > maxWaitS) {
      throw new Error(`grok: timed out after ${elapsed}s`);
    }

    let poll;
    try {
      poll = await getJson(pollUrl, token);
    } catch (e) {
      process.stderr.write(`grok: poll error (${elapsed}s elapsed): ${e.message}\n`);
      continue;
    }
    const status = poll.status;
    process.stderr.write(`grok: status=${status} (${elapsed}s elapsed)\n`);
    if (status === 'done') {
      const v = poll.video;
      if (!v || !v.url) {
        throw new Error(`grok: done but no video.url: ${JSON.stringify(poll).slice(0, 500)}`);
      }
      videoUrl = v.url;
      if (v.duration) actualDuration = parseFloat(v.duration);
      break;
    }
    if (status === 'expired') throw new Error('grok: request expired');
    if (status === 'failed') {
      const errMsg = poll.error && (poll.error.message || poll.error.code) || 'unknown';
      throw new Error(`grok: generation failed: ${errMsg}`);
    }
    // pending — keep polling
  }

  process.stderr.write(`grok: downloading ${videoUrl}\n`);
  const dl = await fetch(videoUrl);
  if (!dl.ok) throw new Error(`grok: video download failed: ${dl.status} ${dl.statusText}`);
  const mp4 = Buffer.from(await dl.arrayBuffer());
  writeFileSync(outputPath, mp4);
  process.stderr.write(`grok: wrote ${outputPath} (${mp4.length} bytes)\n`);

  const actualSeed = typeof seed === 'number' ? seed : Math.floor(Math.random() * 1_000_000_000);
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(
    LOG_PATH,
    JSON.stringify({
      ts: new Date().toISOString(),
      backend: 'grok',
      model,
      output_path: outputPath,
      duration_s: actualDuration,
      aspect_ratio: grokAspect,
      resolution,
      fps,
      seed: actualSeed,
      cost_usd: null,
      ok: true,
      request_id: requestId,
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
