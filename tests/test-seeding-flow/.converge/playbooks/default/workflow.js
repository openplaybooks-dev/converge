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
 * flow loops over that result. So fan-out is RUNTIME-DRIVEN at every level, not
 * hardcoded (child-alpha emits one per `wave`; child-beta two).
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
  description: "Result-driven 3-level task tree via ctx.task().",
  phases: [{ title: "Parent" }, { title: "Children" }],
};

export default async function flow({ phase, task }) {
  phase("Parent");
  await task("parent");

  phase("Children");

  // alpha branch — passes owner; child-alpha emits N=wave grandchildren.
  const alpha = await task("child-alpha", { sprint_id: "sprint-042", owner: "alice", wave: 3 });
  for (const s of alpha.subs) {
    await task("sub-alpha", { sprint_id: "sprint-042", owner: "alice", index: s.index }, { key: `sub-alpha-${s.index}` });
  }

  // beta branch — child-beta declares only sprint_id, so owner is dropped.
  const beta = await task("child-beta", { sprint_id: "sprint-042" });
  for (const s of beta.subs) {
    await task("sub-beta", { sprint_id: "sprint-042", index: s.index }, { key: `sub-beta-${s.index}` });
  }

  return { done: true };
}
