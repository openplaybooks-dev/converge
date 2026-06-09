/**
 * RFC 0050 — result-driven multi-level spawning from a code-first flow.
 *
 * The same 3-level tree as tests/test-seeding, but orchestrated in this visible
 * flow instead of `converge spawn` calls inside bash bodies:
 *
 *   parent                          (level 1)
 *     child-alpha → sub-alpha-1..N  (level 2 → 3)
 *     child-beta  → sub-beta-1..M
 *
 * The pattern: run a child task — its RESULT (a `{ subs: [...] }` manifest)
 * decides which grandchildren to spawn. The child IS the spawner (it emits the
 * list); the flow fans out from that result. So spawning is RUNTIME-DRIVEN at
 * every level, not hardcoded (child-alpha emits one per `wave`; child-beta two).
 *
 * `spawn(template, vars)` enforces the STRICT vars contract: it keeps only the
 * keys the template declares in `vars:`, fills defaults, and throws on a missing
 * required var. So `child-beta` (declares only `sprint_id`) silently drops
 * `owner`, and that omission propagates — `sub-beta` never sees `owner`.
 *
 * Templates are passthrough (bash), so this runs offline:
 *   converge run default            # spawns the whole tree
 *   converge run default --resume   # every step replays from the journal
 *   converge inspect                # shows the tree (runstate projection)
 */

export const meta = {
  name: "default",
  description: "Result-driven 3-level spawn tree via ctx.spawn(), workers=3.",
  run: { workers: 3 },
  phases: [{ title: "Parent" }, { title: "Children" }],
};

export default async function flow({ phase, spawn, parallel }) {
  phase("Parent");
  await spawn("parent");

  phase("Children");
  await parallel([
    () => seedBranch(spawn, parallel, "child-alpha", { sprint_id: "sprint-042", owner: "alice", wave: 3 }, "sub-alpha"),
    () => seedBranch(spawn, parallel, "child-beta", { sprint_id: "sprint-042", owner: "alice" }, "sub-beta"),
  ]);

  return { done: true };
}

// Run the child task; its returned manifest (`{ subs: [...] }`) drives the
// grandchildren. The child decided them — the flow just spawns from the result.
async function seedBranch(spawn, parallel, childTpl, vars, subTpl) {
  const manifest = await spawn(childTpl, vars);
  const subs = (manifest && manifest.subs) || [];
  await parallel(
    subs.map((s) => () =>
      spawn(subTpl, { ...vars, index: s.index }, { key: `${subTpl}-${s.index}` }),
    ),
  );
}
