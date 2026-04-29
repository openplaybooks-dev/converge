/**
 * bg-near WBS — text-spec → visual-spec hierarchy.
 *
 * The bg-near layer is now produced through a TWO-STAGE design pipeline:
 *
 *   00-scene-md  — agent reads scene-level DESIGN.md + stage.json + scene
 *                  narrative + extracted/bg-near.png + biome catalog and writes
 *                  bg-near/SPEC.md (the design brief specific to this layer).
 *                  No API call.
 *
 *   01-scene-svg — agent reads bg-near/SPEC.md and writes
 *                  bg-near/scene-skeleton.svg (the visual concept covering the
 *                  whole scene at full canvas dims). No API call.
 *
 * The painted PNG step (chunked image-edit) has been removed for now — the
 * SVG concept is the deliverable until the painting pipeline is redesigned.
 *
 * Self-test compatibility: the framework runs run() with empty vars to verify
 * the script doesn't throw; we derive scene_id from taskMeta.id when vars is
 * missing, and bail gracefully if neither is available.
 */

const TPL_ROOT =
  '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02c-background/02c-bg-near';
const TPL_SCENE_MD   = `${TPL_ROOT}/00-scene-md/TASK.md`;
const TPL_SCENE_JSON = `${TPL_ROOT}/01-scene-json/TASK.md`;

export async function run(ctx) {
  const { vars, taskMeta } = ctx;
  // Resolve scene_id from vars first; fall back to deriving it from taskMeta.id
  // (the framework's self-test invokes run() with empty vars).
  let sceneId = vars && vars.scene_id;
  if (!sceneId && taskMeta && typeof taskMeta.id === 'string') {
    const m = taskMeta.id.match(/[\\/]scene-([^\\/]+?)(?:[\\/]|-02c-)/);
    if (m) sceneId = m[1];
  }
  if (!sceneId) {
    console.log('  ⚠️  scene_id not provided (self-test or stub run) — skipping');
    return;
  }

  // ── 1. bg-near design brief (Markdown) ─────────────────────────────
  const sceneMdId = `scene-${sceneId}-02c-background-02c-bg-near-00-scene-md`;
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: TPL_SCENE_MD,
      vars: { scene_id: sceneId },
    },
    { id: sceneMdId },
  );
  console.log(`    ✓ ${sceneMdId} (bg-near SPEC.md)`);

  // ── 2. Whole-scene visual spec (JSON) ──────────────────────────────
  // Authoritative structured visual spec: palette, ground polyline,
  // per-chunk prop instances, leave-room zones. Replaces the earlier SVG.
  const sceneJsonId = `scene-${sceneId}-02c-background-02c-bg-near-01-scene-json`;
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: TPL_SCENE_JSON,
      vars: { scene_id: sceneId },
    },
    { id: sceneJsonId },
  );
  console.log(`    ✓ ${sceneJsonId} (scene-spec.json)`);
}
