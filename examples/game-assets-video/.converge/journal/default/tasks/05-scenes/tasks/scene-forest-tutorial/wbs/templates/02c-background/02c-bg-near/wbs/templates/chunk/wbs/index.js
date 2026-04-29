/**
 * Per-chunk WBS — spawns 01-spec → 02-svg → 03-render → 04-paint.
 *
 * Order is enforced by inputs: declarations on each child:
 *   01-spec   → chunk-spec.json
 *   02-svg    inputs chunk-spec.json   → chunk.svg
 *   03-render inputs chunk.svg         → chunk.skeleton.png
 *   04-paint  inputs chunk.skeleton.png + prev seg-(N-1).png → seg-NNN.png
 */

const TPL_ROOT =
  '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02c-background/02c-bg-near/wbs/templates/chunk/wbs/templates';

const CHILDREN = ['01-spec', '02-svg', '03-render', '04-paint'];

export async function run(ctx) {
  const { vars } = ctx;
  const sceneId = vars.scene_id;
  if (!sceneId) {
    console.log('      ⚠️  scene_id missing from vars — skipping');
    return;
  }

  for (const child of CHILDREN) {
    const childId =
      `scene-${sceneId}-02c-background-02c-bg-near-chunk-${vars.chunk_ordinal}-${child}`;
    await ctx.spawn(
      {
        _type: 'template-ref',
        path: `${TPL_ROOT}/${child}/TASK.md`,
        // Pass through the full vars set so each sub-task sees chunk_index,
        // x ranges, section labels, prev paths, overlap config, etc.
        vars: { ...vars },
      },
      { id: childId },
    );
    console.log(`      ✓ ${childId}`);
  }
}
