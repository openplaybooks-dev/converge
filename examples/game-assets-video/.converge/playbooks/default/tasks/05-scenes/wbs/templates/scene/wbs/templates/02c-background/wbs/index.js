/**
 * 02c-background WBS — spawn the four parallax-stack children.
 *
 * The container has no script of its own; this WBS runs once, spawns
 * 02a-bg-far / 02b-bg-mid / 02c-bg-near / 97-validate-composition, and
 * exits. The framework then schedules each child according to its
 * `inputs:` gate so the chain serializes naturally:
 *   far → mid → near → validate-composition.
 *
 * Why a WBS instead of statically-installed children? The framework
 * treats containers with no script + no `wbs:` as leaf nodes (executes
 * them via the agent pipeline and marks them complete in <1s). With
 * `wbs:` declared, the parent is recognized as a WBS-driven container
 * that spawns children dynamically — same shape that the segment-WBS
 * containers under bg-mid and bg-near use.
 */

const TEMPLATES_ROOT =
  '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02c-background';

const CHILDREN = [
  '02a-bg-far',
  '02b-bg-mid',
  '02c-bg-near',
  '97-validate-composition',
];

export async function run(ctx) {
  const { vars } = ctx;
  const sceneId = vars.scene_id;
  if (!sceneId) {
    console.log('  ⚠️  scene_id missing from vars — skipping');
    return;
  }

  for (const child of CHILDREN) {
    const childId = `scene-${sceneId}-02c-background-${child}`;
    await ctx.spawn(
      {
        _type: 'template-ref',
        path: `${TEMPLATES_ROOT}/${child}/TASK.md`,
        vars: { scene_id: sceneId },
      },
      { id: childId },
    );
    console.log(`    ✓ ${childId}`);
  }
}
