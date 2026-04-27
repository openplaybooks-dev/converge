/**
 * WBS: Master Atlas Export
 *
 * Aggregates every per-sheet *.atlas.json produced by phases 03–06 into
 * three engine-ready master atlases. Skipped unless stop_after is in
 * {"export", "full"}.
 *
 * Spawns a single leaf task that the agent executes (`build_master_atlas.py`).
 * The gate lives here, not in the leaf — leaves can't see vars.stop_after.
 */

const PHASE = '07-export';
const WBS_ROOT = '.converge/playbooks/default/tasks/07-export/wbs/templates';
const ALLOWED_MODES = new Set(['export', 'full']);

export async function run(ctx) {
  const { vars } = ctx;
  const mode = vars?.stop_after ?? 'sprites';

  if (!ALLOWED_MODES.has(mode)) {
    console.log(`  Skipped (${PHASE}, stop_after=${mode})`);
    return;
  }

  await ctx.spawn(
    { _type: 'template-ref', path: `${WBS_ROOT}/build-master-atlas/TASK.md`, vars: {} },
    { id: 'build-master-atlas' }
  );
  console.log(`    ✓ build-master-atlas`);
}
