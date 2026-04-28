/**
 * Per-scene WBS: spawns 6 sub-stages.
 *
 * concept → extract (NEW) → background → tiles → props → manifest
 *
 * Ordering is enforced by `inputs:` gates on each downstream stage's
 * TASK.md — every stage past `01-concept` declares
 * `inputs: ["assets/scenes/{{scene_id}}/concept.png"]` (and `05-manifest`
 * additionally requires the tilesheet atlas). The runner blocks each
 * stage until its inputs exist on disk, which gives a natural happens-
 * before chain without needing framework `depends_on` support (which
 * `WbsSpawnOptions` doesn't accept anyway).
 *
 * The numeric prefixes on the spawn IDs (`scene-{id}-01-concept`, etc.)
 * align journal directory names with execution order — the runner's
 * tree traversal picks tasks alphabetically, so without ordinal
 * prefixes `background` would sort before `concept` and burn attempts
 * on a missing-input dance before auto-repair eventually scheduled
 * the producer.
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

  // Numeric prefixes on the spawn ids so the journal directory names sort
  // in execution order. Without this they'd sort alphabetically as
  // background < concept < manifest < props < tiles, and the runner's
  // tree traversal would pick `background` (which depends on concept) first
  // and burn attempts on dependency-not-met repairs.
  const stages = [
    { dir: '01-concept',    suffix: '01-concept' },
    { dir: '01b-extract',   suffix: '01b-extract' },
    { dir: '02-decompose',  suffix: '02-decompose' },
    { dir: '02-background', suffix: '02-background' },
    { dir: '03-tiles',      suffix: '03-tiles' },
    { dir: '04-props',      suffix: '04-props' },
    { dir: '05-manifest',   suffix: '05-manifest' },
    { dir: '07-preview',    suffix: '07-preview' },
  ];

  for (const stage of stages) {
    const stageId = `scene-${sceneId}-${stage.suffix}`;
    await ctx.spawn(
      { _type: 'template-ref', path: `${STAGES_ROOT}/${stage.dir}/TASK.md`, vars: baseVars },
      { id: stageId }
    );
    console.log(`    ✓ ${stageId}`);
  }
}
