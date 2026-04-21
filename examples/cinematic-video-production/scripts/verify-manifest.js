#!/usr/bin/env node
/**
 * verify-manifest.js — final sanity check for clips.json.
 *
 * Exits 0 if:
 *   - clips.json parses and matches schema shape (version=1, clips[] non-empty)
 *   - every clip.path resolves to an existing, non-zero file
 *   - every audio path (if not null) resolves to an existing file
 *   - every shot_id in clips.json exists in shots.json
 *   - every shot in shots.json is represented by exactly one clip
 *   - in_tc / out_tc chain is strictly increasing across clips
 *
 * Exits 1 with a human-readable error on first violation.
 */

import { readFileSync, existsSync, statSync } from 'fs';

function fail(msg) {
  console.error(`[verify-manifest] FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[verify-manifest] OK: ${msg}`);
}

if (!existsSync('clips.json')) fail('clips.json missing');
if (!existsSync('shots.json')) fail('shots.json missing');

const manifest = JSON.parse(readFileSync('clips.json', 'utf-8'));
const shots = JSON.parse(readFileSync('shots.json', 'utf-8'));

if (manifest.version !== 1) fail(`clips.json version must be 1, got ${manifest.version}`);
if (!Array.isArray(manifest.clips)) fail('clips.json.clips must be an array');
if (!manifest.clips.length) fail('clips.json.clips is empty');

const shotIds = new Set(shots.map((s) => s.id));
const seenShotIds = new Set();

let prevOutFrames = -1;

function tcToFrames(tc, fps) {
  const [hh, mm, ss, ff] = tc.split(':').map(Number);
  return ((hh * 3600 + mm * 60 + ss) * fps) + ff;
}

for (const c of manifest.clips) {
  if (!c.clip_id) fail('clip missing clip_id');
  if (!c.shot_id) fail(`clip ${c.clip_id} missing shot_id`);
  if (!shotIds.has(c.shot_id)) fail(`clip ${c.clip_id} references unknown shot ${c.shot_id}`);
  if (seenShotIds.has(c.shot_id)) fail(`shot ${c.shot_id} referenced by multiple clips`);
  seenShotIds.add(c.shot_id);

  if (!c.path) fail(`clip ${c.clip_id} missing path`);
  if (!existsSync(c.path)) fail(`clip ${c.clip_id}: video file missing: ${c.path}`);
  if (statSync(c.path).size < 1000) fail(`clip ${c.clip_id}: video file < 1KB: ${c.path}`);

  if (c.audio) {
    for (const stem of ['dialogue', 'sfx', 'music']) {
      const p = c.audio[stem];
      if (p && !existsSync(p)) fail(`clip ${c.clip_id}: audio.${stem} missing: ${p}`);
    }
  }

  if (c.in_tc && c.out_tc) {
    const fps = manifest.fps || 24;
    const inF = tcToFrames(c.in_tc, fps);
    const outF = tcToFrames(c.out_tc, fps);
    if (outF <= inF) fail(`clip ${c.clip_id}: out_tc ${c.out_tc} not after in_tc ${c.in_tc}`);
    if (prevOutFrames >= 0 && inF < prevOutFrames) {
      fail(`clip ${c.clip_id}: in_tc ${c.in_tc} overlaps previous out_tc`);
    }
    prevOutFrames = outF;
  }
}

// every shot represented?
const missing = shots.filter((s) => !seenShotIds.has(s.id)).map((s) => s.id);
if (missing.length) {
  fail(`${missing.length} shots have no clip: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
}

ok(`${manifest.clips.length} clips, all files present, timeline consistent`);
process.exit(0);
