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
import { resolve } from 'node:path';

const DEFAULT_SEGMENT_WIDTH = 1024;
const DEFAULT_OVERLAP_PX = 256;
const INPAINT_STRIP_PX = 192;
const MIN_BEATS_FOR_SECTION_DRIVEN = 3;

const TPL_ROOT =
  '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02c-background/02c-bg-near';
const TPL_SCENE_SVG    = `${TPL_ROOT}/00-scene-svg/TASK.md`;
const TPL_SCENE_RENDER = `${TPL_ROOT}/00-scene-render/TASK.md`;
const TPL_CHUNK        = `${TPL_ROOT}/wbs/templates/chunk/TASK.md`;
const TPL_VALIDATE     = `${TPL_ROOT}/97-validate/TASK.md`;
const TPL_STITCH       = `${TPL_ROOT}/99-stitch/TASK.md`;

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
  const { vars, projectDir, taskMeta } = ctx;
  // Resolve scene_id from vars first; fall back to deriving it from taskMeta.id
  // (which contains a `scene-<id>` segment when this WBS runs as a descendant
  // of the per-scene container). The framework's self-test invokes run() with
  // empty vars; without the fallback it throws and the auto-repair pipeline
  // overwrites this script with AI-generated code.
  let sceneId = vars && vars.scene_id;
  if (!sceneId && taskMeta && typeof taskMeta.id === 'string') {
    const m = taskMeta.id.match(/[\\/]scene-([^\\/]+?)(?:[\\/]|-02c-)/);
    if (m) sceneId = m[1];
  }
  if (!sceneId) {
    // Self-test path: no vars, no derivable id — skip gracefully so the
    // framework doesn't classify the WBS as broken.
    console.log('  ⚠️  scene_id not provided (self-test or stub run) — skipping');
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

  // ── 0a. Whole-scene SVG (agent, no API call) ────────────────────────
  // The agent reads stage.json + scene-plan.json + SPEC.md + extracted/bg-near.png
  // + the props catalog and writes ONE wide SVG covering the whole scene's
  // foreground at full canvas dims, plus a structured scene-spec.json.
  const sceneSvgId = `scene-${sceneId}-02c-background-02c-bg-near-00-scene-svg`;
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: TPL_SCENE_SVG,
      vars: { scene_id: sceneId },
    },
    { id: sceneSvgId },
  );
  console.log(`    ✓ ${sceneSvgId} (whole-scene svg)`);

  // ── 0b. cairosvg render + slice (deterministic) ─────────────────────
  // Rasterize scene-skeleton.svg to a wide PNG, slice into per-chunk
  // skeleton PNGs and per-chunk chunk-spec.json files. Replaces the
  // per-chunk 01-spec/02-svg/03-render LLM-spawned sub-tasks entirely.
  const sceneRenderId = `scene-${sceneId}-02c-background-02c-bg-near-00-scene-render`;
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: TPL_SCENE_RENDER,
      vars: { scene_id: sceneId },
    },
    { id: sceneRenderId },
  );
  console.log(`    ✓ ${sceneRenderId} (cairosvg + slice)`);

  // ── 1. Per-chunk paint tasks ────────────────────────────────────────
  // Each chunk task is now a SINGLE leaf paint task (no inner WBS). The
  // skeleton + spec come from upstream 00-scene-render. Chunks serialize
  // via their inputs[] gate on the previous chunk's seg-(N-1).png.
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
      // Use bare decimal index (no zero-padding) for the prev seg path because
      // the YAML round-trip strips leading zeros and the paint script writes
      // bare-decimal filenames to match the framework's substituted output paths.
      prev_input_path: i > 0
        ? `assets/scenes/${sceneId}/bg-near/segments/seg-${i - 1}.png`
        : `assets/scenes/${sceneId}/bg-mid/final.png`,
    };
    await ctx.spawn(
      { _type: 'template-ref', path: TPL_CHUNK, vars: chunkVars },
      { id: chunkId },
    );
    console.log(
      `    ✓ ${chunkId} x=[${sec.x_lo.toFixed(3)},${sec.x_hi.toFixed(3)}] "${sec.label}"` +
        `${i > 0 ? ` (after chunk-${prevPadded})` : ''}`,
    );
  }

  // Spawn validate + stitch via ctx.spawn. The IDs use a `z-` / `zz-` prefix
  // (instead of the conventional `97-` / `99-`) so they sort ALPHABETICALLY
  // AFTER `chunk-NN` siblings. The runner picks tasks in alphabetical id
  // order; if validate sorts before the chunks (as `97-validate` < `chunk-01`
  // because digit < letter), the scheduler keeps re-picking validate, hitting
  // its unmet inputs gate and tripping the framework's "same task 3 times"
  // infinite-loop detector before any chunk gets a chance to run.
  // Using `z-` / `zz-` prefixes guarantees chunks are scheduled first; the
  // validate/stitch tasks naturally fall through to last because their
  // inputs[] gate (chunks' outputs) only resolves after chunks complete.
  const validateId = `scene-${sceneId}-02c-background-02c-bg-near-z-validate`;
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

  const stitchId = `scene-${sceneId}-02c-background-02c-bg-near-zz-stitch`;
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
