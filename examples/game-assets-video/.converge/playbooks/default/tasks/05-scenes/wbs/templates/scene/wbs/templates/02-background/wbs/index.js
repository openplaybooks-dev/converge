/**
 * Fan out one background-layer task per entry in `bg_layers`.
 *
 * `bg_layers` is a JSON array of layer names (e.g. ["far","mid","near"])
 * passed as a string so it survives the var-substitution pass.
 */

const LAYER_TASK = '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02-background/wbs/templates/layer/TASK.md';

export async function run(ctx) {
  const { vars } = ctx;
  const sceneId = vars.scene_id;
  let layers = [];
  try {
    layers = JSON.parse(vars.bg_layers || '[]');
  } catch (err) {
    console.log(`  ⚠️  could not parse bg_layers (${err.message}) — skipping`);
    return;
  }
  if (!layers.length) {
    console.log('  bg_layers empty — no background layers to generate');
    return;
  }
  console.log(`  Spawning ${layers.length} background layer task(s) for scene ${sceneId}`);
  for (const layer of layers) {
    const taskId = `scene-${sceneId}-bg-${layer}`;
    await ctx.spawn(
      {
        _type: 'template-ref',
        path: LAYER_TASK,
        vars: { scene_id: sceneId, layer },
      },
      { id: taskId }
    );
    console.log(`    ✓ ${taskId}`);
  }
}
