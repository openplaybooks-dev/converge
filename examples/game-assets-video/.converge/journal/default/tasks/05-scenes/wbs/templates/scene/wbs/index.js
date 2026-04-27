/**
 * Per-scene WBS: sequences 5 sub-stages.
 *
 * concept → background → tiles → props → manifest
 *
 * Each later stage uses earlier outputs (concept.png as a secondary
 * reference; manifest walks everything that landed on disk). We chain
 * via `depends_on` so the runner enforces ordering even though the
 * spawn loop is sequential.
 */

const STAGES_ROOT = '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates';

export async function run(ctx) {
  const { vars } = ctx;
  const sceneId = vars.scene_id;
  if (!sceneId) {
    console.log('  ⚠️  scene_id missing from vars — skipping');
    return;
  }

  const baseVars = {
    scene_id: sceneId,
    scene_name: vars.scene_name || sceneId,
    scene_biome: vars.scene_biome || '',
    scene_description: vars.scene_description || '',
    bg_layers: vars.bg_layers || '[]',
    tile_variant_ids: vars.tile_variant_ids || '[]',
    scene_prop_ids: vars.scene_prop_ids || '[]',
  };

  const stages = [
    { dir: '01-concept',    suffix: 'concept' },
    { dir: '02-background', suffix: 'background' },
    { dir: '03-tiles',      suffix: 'tiles' },
    { dir: '04-props',      suffix: 'props' },
    { dir: '05-manifest',   suffix: 'manifest' },
  ];

  let prevId = null;
  for (const stage of stages) {
    const stageId = `scene-${sceneId}-${stage.suffix}`;
    const opts = { id: stageId };
    if (prevId) opts.depends_on = [prevId];
    await ctx.spawn(
      { _type: 'template-ref', path: `${STAGES_ROOT}/${stage.dir}/TASK.md`, vars: baseVars },
      opts
    );
    console.log(`    ✓ ${stageId}${prevId ? ` (after ${prevId})` : ''}`);
    prevId = stageId;
  }
}
