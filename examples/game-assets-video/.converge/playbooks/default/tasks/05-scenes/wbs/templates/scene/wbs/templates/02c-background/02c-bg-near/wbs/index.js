/**
 * bg-near segmentation WBS. Mirrors bg-mid/wbs/index.js but with the near
 * layer's heavier overlap (256px default).
 *
 * Section-driven by default — beats from stage.json define section
 * boundaries. Falls back to width-based when beats don't bracket the map.
 */

import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

const DEFAULT_SEGMENT_WIDTH = 1024;
const DEFAULT_OVERLAP_PX = 256;
const MIN_BEATS_FOR_SECTION_DRIVEN = 3;
const SEGMENT_TEMPLATE = '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02c-background/02c-bg-near/wbs/templates/segment/TASK.md';

function computeSegmentCount(targetW, segmentW, overlap) {
  const stride = segmentW - overlap;
  if (stride <= 0) return 1;
  return Math.max(1, Math.ceil((targetW - overlap) / stride));
}

function sectionsFromBeats(stage) {
  const wTiles = stage?.world?.width_tiles;
  if (!Number.isInteger(wTiles) || wTiles <= 0) return null;
  const beats = (stage?.beats || []).filter(
    (b) => Number.isInteger(b?.x_tile) && b.x_tile >= 0 && b.x_tile <= wTiles,
  );
  if (beats.length < MIN_BEATS_FOR_SECTION_DRIVEN) return null;
  beats.sort((a, b) => a.x_tile - b.x_tile);
  if (beats[0].x_tile > Math.floor(wTiles * 0.10)) return null;
  if (beats[beats.length - 1].x_tile < Math.ceil(wTiles * 0.90)) return null;
  const sections = [];
  for (let i = 0; i < beats.length - 1; i++) {
    const a = beats[i];
    const b = beats[i + 1];
    sections.push({
      x_lo: a.x_tile / wTiles,
      x_hi: b.x_tile / wTiles,
      label: `${a.label} → ${b.label}`,
      kind: `${a.kind} → ${b.kind}`,
    });
  }
  const valid = sections.filter((s) => s.x_hi > s.x_lo);
  return valid.length > 0 ? valid : null;
}

function sectionsFromWidth(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x_lo: i / count,
      x_hi: (i + 1) / count,
      label: `slice-${String(i + 1).padStart(2, '0')}`,
      kind: 'width-fallback',
    });
  }
  return out;
}

export async function run(ctx) {
  const { vars, projectDir } = ctx;
  const sceneId = vars.scene_id;
  if (!sceneId) {
    console.log('  ⚠️  scene_id missing from vars — skipping');
    return;
  }

  const stagePath = resolve(projectDir, 'assets', 'scenes', sceneId, 'stage.json');
  let stage;
  try {
    stage = JSON.parse(readFileSync(stagePath, 'utf-8'));
  } catch (err) {
    throw new Error(`bg-near WBS: cannot read ${stagePath}: ${err.message}. Run scene/02b-stage first.`);
  }
  const bg = stage.background || {};
  const targetW = bg.target_width_px;
  if (!Number.isInteger(targetW) || targetW <= 0) {
    throw new Error(`bg-near WBS: stage.json background.target_width_px invalid: ${targetW}`);
  }
  const segmentW = bg.segment_width_px || DEFAULT_SEGMENT_WIDTH;
  const overlap = (bg.overlap_px && bg.overlap_px.near) || DEFAULT_OVERLAP_PX;

  let sections = sectionsFromBeats(stage);
  let mode = 'beats';
  if (!sections) {
    const widthCount = computeSegmentCount(targetW, segmentW, overlap);
    sections = sectionsFromWidth(widthCount);
    mode = 'width';
  }
  const count = sections.length;

  const worldWTiles = (stage.world && stage.world.width_tiles) || '?';
  console.log(
    `  bg-near: world=${worldWTiles}t target_w=${targetW}px overlap=${overlap} mode=${mode} → ${count} section(s)`
  );

  for (let i = 0; i < count; i++) {
    const sec = sections[i];
    const ordinal = String(i + 1).padStart(2, '0');
    const segId = `scene-${sceneId}-02c-background-02c-bg-near-seg-${ordinal}`;
    const segVars = {
      scene_id: sceneId,
      layer: 'near',
      seg_index: String(i),
      seg_ordinal: ordinal,
      seg_count: String(count),
      seg_index_padded: String(i).padStart(3, '0'),
      seg_prev_padded: i > 0 ? String(i - 1).padStart(3, '0') : '',
      seg_x_lo_norm: sec.x_lo.toFixed(4),
      seg_x_hi_norm: sec.x_hi.toFixed(4),
      section_label: sec.label,
      section_kind: sec.kind,
      prev_input_path: i > 0
        ? `assets/scenes/${sceneId}/bg-near/segments/seg-${String(i - 1).padStart(3, '0')}.png`
        : `assets/scenes/${sceneId}/bg-mid/final.png`,
    };
    await ctx.spawn(
      { _type: 'template-ref', path: SEGMENT_TEMPLATE, vars: segVars },
      { id: segId }
    );
    console.log(
      `    ✓ ${segId} x=[${sec.x_lo.toFixed(3)},${sec.x_hi.toFixed(3)}] "${sec.label}"` +
        `${i > 0 ? ` (after seg-${String(i - 1).padStart(3, '0')})` : ''}`,
    );
  }

  // Install the static validate + stitch children.
  const parentJournalDir = resolve(
    projectDir,
    '.converge/journal/default/tasks/05-scenes/tasks',
    `scene-${sceneId}`,
    'tasks',
    `scene-${sceneId}-02c-background`,
    'tasks',
    `scene-${sceneId}-02c-background-02c-bg-near`,
  );
  const STATIC_CHILDREN = ['97-validate', '99-stitch'];
  for (const child of STATIC_CHILDREN) {
    const src = resolve(
      projectDir,
      `.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02c-background/02c-bg-near/${child}/TASK.md`,
    );
    const dest = join(parentJournalDir, child, 'TASK.md');
    let raw = readFileSync(src, 'utf-8');
    raw = raw.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
      if (key === 'scene_id') return sceneId;
      if (key === 'seg_count') return String(count);
      return _m;
    });
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, raw, 'utf-8');
    console.log(`    ↳ static child ${child} installed`);
  }
}
