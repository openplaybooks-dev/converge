/**
 * RFC 0050 — result-driven multi-level fan-out from a code-first flow.
 *
 * The same 3-level tree as tests/test-seeding, but orchestrated in this visible
 * flow instead of `converge spawn` calls inside bash bodies:
 *
 *   parent                          (level 1)
 *     child-alpha → sub-alpha-1..N  (level 2 → 3)
 *     child-beta  → sub-beta-1..M
 *
 * The pattern: run a child task — its RESULT (a `{ subs: [...] }` manifest)
 * decides the grandchildren. The child IS the spawner (it emits the list); the
 * flow fans out from that result. So fan-out is RUNTIME-DRIVEN at every level,
 * not hardcoded (child-alpha emits one per `wave`; child-beta two).
 *
 * `task()` is the unified API — plain tasks and templates alike. When a task
 * declares a `vars:` block, params are filtered through that STRICT contract
 * (keep only declared keys, fill defaults, throw on a missing required var). So
 * `child-beta` (declares only `sprint_id`) silently drops the `owner` the flow
 * passed, and that omission propagates — `sub-beta` never sees `owner`. Call the
 * same task N times with a distinct `key` to fan out.
 *
 * Tasks are passthrough (bash), so this runs offline:
 *   converge run default            # runs the whole tree
 *   converge run default --resume   # every step replays from the journal
 *   converge inspect                # shows the tree (runstate projection)
 */

export const meta = {
  name: "default",
  description: "Result-driven 3-level task tree via ctx.task(), workers=3.",
  run: { workers: 3 },
  phases: [{ title: "Parent" }, { title: "Children" }],
};

export default async function flow({ phase, task, parallel }) {
  phase("Parent");
  await task("parent");

  phase("Children");
  await parallel([
    () => seedBranch(task, parallel, "child-alpha", { sprint_id: "sprint-042", owner: "alice", wave: 3 }, "sub-alpha"),
    () => seedBranch(task, parallel, "child-beta", { sprint_id: "sprint-042", owner: "alice" }, "sub-beta"),
  ]);

  return { done: true };
}

// Run the child task; its returned manifest (`{ subs: [...] }`) drives the
// grandchildren. The child decided them — the flow just spawns from the result.
async function seedBranch(task, parallel, childTpl, vars, subTpl) {
  const manifest = await task(childTpl, vars);
  const subs = (manifest && manifest.subs) || [];
  await parallel(
    subs.map((s) => () =>
      task(subTpl, { ...vars, index: s.index }, { key: `${subTpl}-${s.index}` }),
    ),
  );
}
