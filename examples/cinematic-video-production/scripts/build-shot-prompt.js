#!/usr/bin/env node
/**
 * build-shot-prompt.js — the consistency helper.
 *
 * Assembles a deterministic prompt + reference-image list for a single shot,
 * by concatenating:
 *   1. style block        (style-guide.md + palette.json — frozen)
 *   2. character refs     (visual_description + ref image paths per character in frame)
 *   3. location ref       (description + variant image path)
 *   4. scene state        (time-of-day, weather, lighting, continuity)
 *   5. shot-specific      (camera, action, dialogue, mood, duration)
 *
 * Output format (stdout):
 *   ---REFERENCES---
 *   <one image path per line>
 *   ---PROMPT---
 *   <full prompt text>
 *
 * Usage:
 *   node scripts/build-shot-prompt.js --shot sh-0042 --target keyframe
 *   node scripts/build-shot-prompt.js --shot sh-0042 --target video
 *
 * --target keyframe  → omit camera-movement block, emit stills prompt
 * --target video     → include camera-movement + duration hint
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function readMd(path) {
  return existsSync(path) ? readFileSync(path, 'utf-8').trim() : '';
}

function bail(msg) {
  console.error(`[build-shot-prompt] ${msg}`);
  process.exit(1);
}

// --- inputs --------------------------------------------------------------

const shotId = arg('shot');
const target = arg('target', 'keyframe');

if (!shotId) bail('--shot <id> required');
if (!['keyframe', 'video'].includes(target)) bail('--target must be keyframe|video');

const shots = readJson('shots.json');
const shot = shots.find((s) => s.id === shotId);
if (!shot) bail(`shot ${shotId} not found in shots.json`);

const scenes = readJson('scenes.json');
const scene = scenes.find((s) => s.id === shot.scene_id);
if (!scene) bail(`scene ${shot.scene_id} not found in scenes.json`);

const statePath = join('scenes', scene.id, 'state.json');
const state = existsSync(statePath) ? readJson(statePath) : null;

const styleGuide = readMd('style-guide.md');
const audioStyle = target === 'video' ? readMd('audio-style.md') : '';
const palette = existsSync('palette.json') ? readJson('palette.json') : null;

// --- character refs ------------------------------------------------------

const characters = readJson('characters.json');
const charsInFrame = (shot.character_ids_in_frame || []).map((cid) => {
  const c = characters.find((x) => x.id === cid);
  if (!c) bail(`character ${cid} not in characters.json`);
  const refPath = join('characters', cid, 'ref.json');
  const ref = existsSync(refPath) ? readJson(refPath) : null;
  const wardrobeVariant = (shot.wardrobe_refs || {})[cid] || 'default';
  const wardrobeImg = ref?.images?.wardrobe?.[wardrobeVariant] || ref?.images?.turnaround;
  return {
    id: cid,
    name: c.name,
    visual_description: c.visual_description,
    turnaround: ref?.images?.turnaround,
    wardrobe: wardrobeImg,
    wardrobeVariant,
  };
});

// --- location ref --------------------------------------------------------

const locations = readJson('locations.json');
const loc = locations.find((l) => l.id === shot.location_ref.location_id);
if (!loc) bail(`location ${shot.location_ref.location_id} not in locations.json`);
const locRefPath = join('locations', loc.id, 'ref.json');
const locRef = existsSync(locRefPath) ? readJson(locRefPath) : null;

const locVariant = shot.location_ref.variant;
const locImg =
  locRef?.images?.variants?.[locVariant] ||
  locRef?.images?.details?.[locVariant] ||
  locRef?.images?.wide;

// --- assemble ------------------------------------------------------------

const refPaths = [];
if (target === 'video') {
  // Video targets use the locked keyframes as the only references — the
  // identity work already happened at 07-keyframes (compositing bridge).
  const startKf = join('keyframes', shotId, 'start.png');
  if (existsSync(startKf)) refPaths.push(startKf);
  const endKf = join('keyframes', shotId, 'end.png');
  if (existsSync(endKf)) refPaths.push(endKf);
} else {
  // Keyframe target (legacy path, still used for any free-form image calls):
  // pass element refs directly.
  for (const c of charsInFrame) {
    if (c.wardrobe) refPaths.push(c.wardrobe);
    else if (c.turnaround) refPaths.push(c.turnaround);
  }
  if (locImg) refPaths.push(locImg);
}

const blocks = [];

blocks.push(`# STYLE\n${styleGuide || '(style-guide.md missing)'}`);

if (palette) {
  blocks.push(
    `# PALETTE\nShadows: ${(palette.shadows || []).join(', ')}. ` +
      `Midtones: ${(palette.midtones || []).join(', ')}. ` +
      `Highlights: ${(palette.highlights || []).join(', ')}. ` +
      `Accent: ${(palette.accent || []).join(', ')}. ` +
      `${palette.notes || ''}`,
  );
}

if (charsInFrame.length) {
  const lines = charsInFrame.map(
    (c) =>
      `- ${c.name} (${c.id}): ${c.visual_description} ` +
      `Wearing: ${c.wardrobeVariant}.`,
  );
  blocks.push(`# CHARACTERS IN FRAME\n${lines.join('\n')}`);
}

blocks.push(
  `# LOCATION\n${loc.name} — ${loc.description}\n` +
    `Variant: ${locVariant}. Reference image provided.`,
);

if (state) {
  const lighting = state.lighting_notes || '(default)';
  const weather = state.weather || scene.weather || '(default)';
  blocks.push(
    `# SCENE STATE\nTime-of-day: ${state.time_of_day || scene.time_of_day}. ` +
      `Weather: ${weather}. Lighting: ${lighting}.`,
  );
}

const cameraBlock =
  target === 'video'
    ? `Camera: ${shot.shot_type.toUpperCase()}, ${shot.camera_move || 'static'} move, ${shot.lens_mm || 40}mm lens. ` +
      `Duration: ${shot.duration_s}s.`
    : `Framing: ${shot.shot_type.toUpperCase()}, ${shot.lens_mm || 40}mm lens. (First frame only — no motion.)`;

blocks.push(
  `# SHOT\n${cameraBlock}\nAction: ${shot.action}\n` +
    (shot.mood ? `Mood: ${shot.mood}.\n` : '') +
    (shot.dialogue?.length && target === 'video'
      ? `Dialogue (for lip-sync timing only — audio added separately): ${shot.dialogue
          .map((d) => `${d.character_id}: "${d.text}"`)
          .join(' | ')}`
      : ''),
);

if (target === 'video' && audioStyle) {
  blocks.push(`# AUDIO NOTE\nAudio track will be added in post per audio-style.md. Do not generate audio in this video.`);
}

blocks.push(
  `# NEGATIVE\nNo on-screen text, subtitles, or labels. No watermarks. ` +
    `No modern anachronisms inconsistent with the style. No camera operator or crew visible.`,
);

const prompt = blocks.join('\n\n');

// --- emit ----------------------------------------------------------------

process.stdout.write('---REFERENCES---\n');
for (const p of refPaths) process.stdout.write(`${p}\n`);
process.stdout.write('---PROMPT---\n');
process.stdout.write(prompt);
process.stdout.write('\n');
