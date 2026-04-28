/**
 * WBS: Master Atlas Export
 *
 * Aggregates every per-sheet *.atlas.json produced by phases 03–06 into
 * three engine-ready master atlases.
 *
 * Spawns a single leaf task that the agent executes (`build_master_atlas.py`).
 * The stop_after mode is passed through to the leaf via vars so the leaf can
 * be a no-op when stop_after is not in {"export", "full"}. Returning 0 spawns
 * here would trigger WbsZeroSpawnError, so the gate is enforced at the leaf.
 */

const PHASE = '06-export';
const WBS_ROOT = '.converge/playbooks/default/tasks/06-export/wbs/templates';

export async function run(ctx) {
  const { vars } = ctx;
  const mode = vars?.stop_after ?? 'sprites';

  await ctx.spawn(
    {
      _type: 'template-ref',
      path: `${WBS_ROOT}/build-master-atlas/TASK.md`,
      vars: { stop_after: mode },
    },
    { id: 'build-master-atlas' }
  );
  console.log(`    ✓ build-master-atlas (${PHASE}, stop_after=${mode})`);
}
