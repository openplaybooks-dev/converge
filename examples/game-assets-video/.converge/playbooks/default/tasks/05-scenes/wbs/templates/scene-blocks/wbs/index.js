/**
 * Per-scene WBS for the tokens-driven flow.
 *
 * Spawns 6 stages:
 *   00-mapping        (AI authors visual_mapping.md, compiler derives scene.assembly.json)
 *   01-stamp          (deterministic; stamps assembly into per-layer maps)
 *   02-paint          (image-edits each layer's map into finished art)
 *   03-composite      (deterministic; composites layers into scene.png + landscape.png)
 *   04-preview-prompt (AI authors landscape.prompt.md from ART_BIBLE.md + scene context)
 *   05-preview-paint  (image-edits the first 12x12 landscape window using that prompt)
 *
 * Ordering enforced by `inputs:` gates on each child's TASK.md:
 *   - 01-stamp declares assets/scenes/{id}/scene.assembly.json
 *   - 02-paint declares maps/*.png + assets/concept/style-sheet.png
 *   - 03-composite declares layers/*.png
 *
 * Numeric prefixes on spawn IDs align journal directory names with
 * execution order (the runner picks tasks alphabetically).
 *
 * Implements MODERN_SIDE_SCROLL_SPEC.md §5 (the pipeline).
 */

const STAGES_ROOT =
  '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene-blocks/wbs/templates';

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
    scene_biome: vars.scene_biome || 'grassland',
    scene_description: vars.scene_description || '',
  };

  const stages = [
    { dir: '00-mapping',         suffix: '00-mapping' },
    { dir: '01-stamp',           suffix: '01-stamp' },
    { dir: '02-paint',           suffix: '02-paint' },
    { dir: '03-composite',       suffix: '03-composite' },
    { dir: '04-preview-prompt',  suffix: '04-preview-prompt' },
    { dir: '05-preview-paint',   suffix: '05-preview-paint' },
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
