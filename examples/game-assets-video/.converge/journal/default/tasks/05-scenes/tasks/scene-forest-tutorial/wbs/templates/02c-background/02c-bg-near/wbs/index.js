/**
 * bg-near WBS — fans out one CHUNK CONTAINER per stage section.
 *
 * Each chunk is itself a WBS subtree (spec → svg → render → paint).
 * Chunks are serialized via the inputs: gate on the previous chunk's
 * paint output (segments/seg-(N-1).png), so the runner walks the chain
 * left-to-right naturally. Chunk 0's prev-input falls back to
 * bg-mid/final.png so the gate always resolves.
 *
 * Sections come from stage.beats[] (beat-driven). Falls back to
 * width-based slicing when beats don't bracket the map. The same
 * algorithm is duplicated inside the chunk's spec sub-task so chunk
 * indices line up.
 */

import { readFileSync } from 'node:fs';

const DEFAULT_SEGMENT_WIDTH = 1024;
const DEFAULT_OVERLAP_PX = 256;
const INPAINT_STRIP_PX = 192;
const MIN_BEATS_FOR_SECTION_DRIVEN = 3;

const TPL_ROOT =
  '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02c-background/02c-bg-near';
const TPL_CHUNK_CONTAINER = `${TPL_ROOT}/wbs/templates/chunk/TASK.md`;
const TPL_VALIDATE = `${TPL_ROOT}/97-validate/TASK.md`;
const TPL_STITCH   = `${TPL_ROOT}/99-stitch/TASK.md`;

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
      x_lo_tile: a.x_tile,
      x_hi_tile: b.x_tile,
      x_lo: a.x_tile / wTiles,
      x_hi: b.x_tile / wTiles,
      label: `${a.label} → ${b.label}`,
      kind:  `${a.kind} → ${b.kind}`,
    });
  }
  const valid = sections.filter((s) => s.x_hi > s.x_lo);
  return valid.length > 0 ? valid : null;
}

function sectionsFromWidth(stage, count) {
  const wTiles = stage?.world?.width_tiles || count;
  const out = [];
  for (let i = 0; i < count; i++) {
    const x_lo_tile = Math.round((i / count) * wTiles);
    const x_hi_tile = Math.round(((i + 1) / count) * wTiles);
    out.push({
      x_lo_tile,
      x_hi_tile,
      x_lo: i / count,
      x_hi: (i + 1) / count,
      label: `slice-${String(i + 1).padStart(2, '0')}`,
      kind:  'width-fallback',
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
    sections = sectionsFromWidth(stage, widthCount);
    mode = 'width';
  }
  const count = sections.length;

  const worldWTiles = (stage.world && stage.world.width_tiles) || '?';
  console.log(
    `  bg-near: world=${worldWTiles}t target_w=${targetW}px overlap=${overlap} mode=${mode} → ${count} chunk(s)`
  );

  // Spawn one chunk container per section. Each container has its own
  // wbs: declaration; the runner will descend into it and run the four
  // sub-tasks (spec → svg → render → paint).
  for (let i = 0; i < count; i++) {
    const sec = sections[i];
    const ordinal = String(i + 1).padStart(2, '0');
    const padded = String(i).padStart(3, '0');
    const prevPadded = i > 0 ? String(i - 1).padStart(3, '0') : '';
    const chunkId = `scene-${sceneId}-02c-background-02c-bg-near-chunk-${ordinal}`;
    const chunkVars = {
      scene_id: sceneId,
      chunk_index: String(i),
      chunk_ordinal: ordinal,
      chunk_count: String(count),
      chunk_index_padded: padded,
      chunk_prev_padded: prevPadded,
      chunk_x_lo_tile: String(sec.x_lo_tile),
      chunk_x_hi_tile: String(sec.x_hi_tile),
      chunk_x_lo_norm: sec.x_lo.toFixed(4),
      chunk_x_hi_norm: sec.x_hi.toFixed(4),
      section_label: sec.label,
      section_kind: sec.kind,
      overlap_px: String(overlap),
      inpaint_strip_px: String(INPAINT_STRIP_PX),
      // Chunk 0's prev gate falls back to bg-mid so the runner doesn't deadlock.
      prev_input_path: i > 0
        ? `assets/scenes/${sceneId}/bg-near/segments/seg-${prevPadded}.png`
        : `assets/scenes/${sceneId}/bg-mid/final.png`,
    };
    await ctx.spawn(
      { _type: 'template-ref', path: TPL_CHUNK_CONTAINER, vars: chunkVars },
      { id: chunkId },
    );
    console.log(
      `    ✓ ${chunkId} x=[${sec.x_lo.toFixed(3)},${sec.x_hi.toFixed(3)}] "${sec.label}"` +
        `${i > 0 ? ` (after chunk-${prevPadded})` : ''}`,
    );
  }

  // Spawn 97-validate and 99-stitch via ctx.spawn instead of writing to a
  // hand-computed journal path. The runner's materializer handles vars +
  // path placement; this also keeps the chain ordered correctly because
  // the validator/stitcher tasks come after the chunks via inputs gates,
  // not via container-execution order.
  const validateId = `scene-${sceneId}-02c-background-02c-bg-near-97-validate`;
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: TPL_VALIDATE,
      vars: {
        scene_id: sceneId,
        chunk_count: String(count),
        seg_count: String(count),
      },
    },
    { id: validateId },
  );
  console.log(`    ✓ ${validateId} (validate)`);

  const stitchId = `scene-${sceneId}-02c-background-02c-bg-near-99-stitch`;
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: TPL_STITCH,
      vars: {
        scene_id: sceneId,
        chunk_count: String(count),
        seg_count: String(count),
      },
    },
    { id: stitchId },
  );
  console.log(`    ✓ ${stitchId} (stitch)`);
}
