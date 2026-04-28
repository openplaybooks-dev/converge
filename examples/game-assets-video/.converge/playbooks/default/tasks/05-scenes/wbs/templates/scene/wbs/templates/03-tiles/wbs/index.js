/**
 * Per-scene tile WBS (single-call edition).
 *
 * Spawns ONE task that runs scripts/generate_tilesheet_v2.py to draw the
 * whole tilesheet on a single canvas (matches the prop-spritesheet
 * pattern: 1 image-gen call → coherent grid). Replaces the earlier
 * per-tile fan-out + composite, which produced tiles in inconsistent
 * palettes whose edges didn't tile against each other.
 */

const TILESHEET_TEMPLATE = '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/03-tiles/wbs/templates/tilesheet/TASK.md';

export async function run(ctx) {
  const { vars } = ctx;
  const sceneId = vars.scene_id;
  if (!sceneId) {
    console.log('  ⚠️  scene_id missing from vars — skipping');
    return;
  }

  const taskId = `scene-${sceneId}-tilesheet`;
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: TILESHEET_TEMPLATE,
      vars: { scene_id: sceneId },
    },
    { id: taskId }
  );
  console.log(`    ✓ ${taskId} (single-call tilesheet)`);
}
