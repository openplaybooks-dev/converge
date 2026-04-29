/**
 * 01b-extract WBS — spawn the four per-layer extraction children.
 *
 * The container has no script of its own; this WBS runs once when the
 * container task is picked, spawns four child tasks (01b1-far, 01b2-mid,
 * 01b3-near, 01b4-manifest), and exits. The framework then schedules
 * each child according to its `inputs:` gate so the chain serializes
 * naturally: far → mid → near → manifest.
 *
 * Why a WBS instead of static children? The framework treats containers
 * with no script + no `wbs:` as leaf nodes (executes them via the agent
 * pipeline and marks them complete). With `wbs:` declared in the parent
 * TASK.md, the parent is recognized as a WBS-driven container that
 * spawns children dynamically — same shape that 02c-background's bg-mid
 * and bg-near use.
 */

import { resolve } from 'node:path';

const TEMPLATES_ROOT =
  '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/01b-extract';

const CHILDREN = ['01b1-far', '01b2-mid', '01b3-near', '01b4-manifest'];

export async function run(ctx) {
  const { vars } = ctx;
  const sceneId = vars.scene_id;
  if (!sceneId) {
    console.log('  ⚠️  scene_id missing from vars — skipping');
    return;
  }

  for (const child of CHILDREN) {
    const childId = `scene-${sceneId}-01b-extract-${child}`;
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
