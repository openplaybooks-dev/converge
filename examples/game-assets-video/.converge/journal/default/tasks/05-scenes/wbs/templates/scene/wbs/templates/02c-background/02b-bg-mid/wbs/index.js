/**
 * bg-mid segmentation WBS.
 *
 * Section-driven by default: reads stage.json[beats[]] and slices the map
 * at beat boundaries so each segment owns a real piece of gameplay rhythm.
 * Falls back to width-based slicing when beats don't span the map cleanly
 * (need >= 3 beats; first must be near x=0, last must be near x=width).
 *
 * Each spawn carries (seg_x_lo_norm, seg_x_hi_norm, section_label, section_kind)
 * so the segment script can prompt with that section's specific narrative
 * instead of a generic x-range slice.
 */

import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

const DEFAULT_SEGMENT_WIDTH = 1024;
const DEFAULT_OVERLAP_PX = 128;
const MIN_BEATS_FOR_SECTION_DRIVEN = 3;
const SEGMENT_TEMPLATE = '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02c-background/02b-bg-mid/wbs/templates/segment/TASK.md';

function computeSegmentCount(targetW, segmentW, overlap) {
  const stride = segmentW - overlap;
  if (stride <= 0) return 1;
  return Math.max(1, Math.ceil((targetW - overlap) / stride));
}

/**
 * Build sections from stage.beats[]. Each section is the span between
 * consecutive beats; the section's label is the *next* beat's label
 * (i.e. "section running up to beat X"). Returns null if beats aren't
 * suitable (too few, or don't bracket the map).
 *
 * Output: [{ x_lo: 0..1, x_hi: 0..1, label: string, kind: string }]
 */
function sectionsFromBeats(stage) {
  const world = stage?.world;
  const wTiles = world?.width_tiles;
  if (!Number.isInteger(wTiles) || wTiles <= 0) return null;
  const beats = (stage?.beats || []).filter(
    (b) => Number.isInteger(b?.x_tile) && b.x_tile >= 0 && b.x_tile <= wTiles,
  );
  if (beats.length < MIN_BEATS_FOR_SECTION_DRIVEN) return null;
  // Sort and ensure first/last span the map.
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
  // Drop any zero-width sections (back-to-back beats at the same x_tile).
  const valid = sections.filter((s) => s.x_hi > s.x_lo);
  return valid.length > 0 ? valid : null;
}

/**
 * Width-based fallback: divide [0, 1] into N equal sections.
 */
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

  // The stage blueprint (02b-stage) is the source of truth for background
  // sizing. It commits world.width_tiles × tile_size_px = target_width_px,
  // plus per-layer segment_width_px / overlap_px under background.
  const stagePath = resolve(projectDir, 'assets', 'scenes', sceneId, 'stage.json');
  let stage;
  try {
    stage = JSON.parse(readFileSync(stagePath, 'utf-8'));
  } catch (err) {
    throw new Error(`bg-mid WBS: cannot read ${stagePath}: ${err.message}. Run scene/02b-stage first.`);
  }
  const bg = stage.background || {};
  const targetW = bg.target_width_px;
  if (!Number.isInteger(targetW) || targetW <= 0) {
    throw new Error(`bg-mid WBS: stage.json background.target_width_px invalid: ${targetW}`);
  }
  const segmentW = bg.segment_width_px || DEFAULT_SEGMENT_WIDTH;
  const overlap = (bg.overlap_px && bg.overlap_px.mid) || DEFAULT_OVERLAP_PX;

  // Section-driven first; fall back to width-based when stage.beats[]
  // doesn't bracket the map cleanly.
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
    `  bg-mid: world=${worldWTiles}t target_w=${targetW}px overlap=${overlap} mode=${mode} → ${count} section(s)`
  );

  for (let i = 0; i < count; i++) {
    const sec = sections[i];
    const ordinal = String(i + 1).padStart(2, '0');
    const segId = `scene-${sceneId}-02c-background-02b-bg-mid-seg-${ordinal}`;
    const segVars = {
      scene_id: sceneId,
      layer: 'mid',
      seg_index: String(i),
      seg_ordinal: ordinal,
      seg_count: String(count),
      seg_index_padded: String(i).padStart(3, '0'),
      seg_prev_padded: i > 0 ? String(i - 1).padStart(3, '0') : '',
      seg_x_lo_norm: sec.x_lo.toFixed(4),
      seg_x_hi_norm: sec.x_hi.toFixed(4),
      section_label: sec.label,
      section_kind: sec.kind,
      // For segment 0 point prev at bg-far.png so the gate always resolves.
      prev_input_path: i > 0
        ? `assets/scenes/${sceneId}/bg-mid/segments/seg-${String(i - 1).padStart(3, '0')}.png`
        : `assets/scenes/${sceneId}/bg-far/final.png`,
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

  // Materialize the static `97-validate` and `99-stitch` children into the
  // parent's journal directory so discoverEpicChildren picks them up.
  const parentJournalDir = resolve(
    projectDir,
    '.converge/journal/default/tasks/05-scenes/tasks',
    `scene-${sceneId}`,
    'tasks',
    `scene-${sceneId}-02c-background`,
    'tasks',
    `scene-${sceneId}-02c-background-02b-bg-mid`,
  );
  const STATIC_CHILDREN = ['97-validate', '99-stitch'];
  for (const child of STATIC_CHILDREN) {
    const src = resolve(
      projectDir,
      `.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02c-background/02b-bg-mid/${child}/TASK.md`,
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
