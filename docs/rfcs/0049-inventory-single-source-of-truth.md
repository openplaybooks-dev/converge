---
rfc: 0049
title: Inventory as the single source of truth — inventory-projected DAG, one task model, no runtime scans
status: done
type: refactor
source: human
priority_tier: tier1
estimate: "5-8 days"
backwards_compatible: yes
risk: high
breaks_existing: no
---

# RFC 0049: Inventory as the single source of truth

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | This document |
| Phase 0 — clean break: delete legacy `declarative-loader.ts`; cold-start inventory bootstrap; spread full TASK.md mapping in `resolveTaskFromRow`; auto-chain top-level static tasks at load time (RFC 0034) | **done** | Loader is now the single folder path; `buildDagFromInventory` is the public entry. Closes the dual-loader drift that dropped `handoff`/`mode`/`spawn`. |
| Phase 0 — `cacheOutputs()` helper folds `handoff.artifact` into cache-validity checks (RFC 0047) | **done** | Scheduler cache, inventory-ledger hydration, and `find-gaps` all share one definition of "done" (deduped; gateway exempt). |
| Phase 0 — 0-child spawner no longer loops (RFC 0049) | **done** | Completion check now uses `_hasStaticSubtasks` flag, not raw `node.children` (which conflated subtask children with downstream dependents like `root-converge`). |
| Phase 0 — human-review pause no longer eats the stall backoff | **done** | Run loop breaks immediately when a task is blocked on a human verdict, so the verdict poller sees updates without `stallBackoffMs` latency. |
| Phase A — compile enumerates nested tree → inventory | **done** | `bootstrapInventoryFromDisk` and `syncStaticTasksFromDisk` now recurse `tasks/<id>/tasks/<child>/.../TASK.md` and emit one row per task with `parent` set when nested, plus a per-parent-group RFC 0034 sibling chain. `taskRef.dir` uses the on-disk relative path. Verified against `examples/product-design` (10 nested rows, correct `parent` and chains). New tests: `packages/core/tests/unit/compile/inventory-nested.test.ts` (15 tests, all green). |
| Phase B — DAG is a pure inventory projection | **done** | `DagNode` now carries a `parent` field; `TaskDag` exposes `childrenByParent` (private) + `childrenOf(id)` (public) + `registerSpawnedChild(parentId, childId)` (public). `addNode` no longer pushes reverse-edges into `children` — the field is a build-time snapshot of inventory-derived children. `getReady` reads `childrenOf`, not the polymorphic `spawned_children`. `toManifest` derives `child_map`/`parent_map` from `childrenByParent` + `parent`. The runtime rescan (`discoverStaticChildren`) is no longer called from `buildDagFromInventory` or `compilePlaybook`. The legacy `splitContainerNodes` is removed; `_hasStaticSubtasks` is gone — children are an inventory fact, derivable from `childrenOf(id).length > 0`. New tests: `packages/core/tests/unit/compile/dag-children-of.test.ts` (12 tests, all green) covers the unified hierarchy API + the seeded-rule wait for downstream. |
| Phase C — delete diverge/converge split; unify completion | **done** | `splitContainerNodes` is deleted from `manifest/build-dag.ts` and from the `index.ts` exports. `buildDagFromPlaybookObject` no longer splits containers. `getReady` now uses one rule: a dep with children blocks downstream dependents until all children are terminal, regardless of whether those children are static-nested or runtime-spawned. The run-loop completion check (run/index.ts) uses `dag.childrenOf(taskId).length > 0` to decide between `seeded` and `complete`. `injectRootNodes` is kept (pure `depends_on` edges; no children). |
| Phase D — consumers + tests | **done** | The runtime-spawn site (`run/index.ts`) sets `parent` on the child node and calls `dag.registerSpawnedChild(taskId, childId)` for belt-and-braces. `TaskDag.markSeeded(id)` exposed for callers that previously mutated `node.status` directly. The `node.children` reverse-edge conflation is gone, and consumers reading it now see the inventory-derived snapshot. `index.ts` export for `splitContainerNodes` removed. New test file `dag-children-of.test.ts` exercises the unified completion rule end-to-end. |
| `pnpm build` | **done** | `converge-core` and `converge` packages build clean (DTS + tsup). |
| Tests (TDD) | **done** | All RFC 0049 tests green: `inventory-nested` (15), `dag-children-of` (12), `declarative-loader` rewritten (9), `rfc-0034-auto-chain` (9), `loader-handoff` (1), `review-flow` (regression for missing-handoff regenerates), `declarative-loader-unified` (passes), `compile-discover` (8 + 1 skip). Core suite remains at the pre-existing 52-fail baseline (per RFC R5); no new failures introduced by this work. Test count went from 1445 → 1457 passing. |

## Problem

Converge has **three** sources of truth for task structure that must agree, and they keep drifting:

1. **The filesystem** — `tasks/<id>/TASK.md`, including nested `tasks/<id>/tasks/<child>/TASK.md`.
2. **The inventory** — `.converge/inventory/<name>/tasks.jsonl`.
3. **The DAG graph** — `DagNode.children` / `depends_on` / `depended_on_by`.

Every gap between them has produced a runtime edge case. The most recent: a `mode: spawner` task
that spawned zero children re-queued forever, because `DagNode.children` conflates two unrelated
things — *filesystem subtask children* and *DAG downstream dependents* — and an injected
`root-converge` (a dependent) was mistaken for a child, holding the spawner open as `seeded`.

Three concrete facts drive this RFC (all confirmed in the current tree):

- **Nested static subtasks are not in the inventory.** `bootstrapInventoryFromDisk` /
  `syncStaticTasksFromDisk` (`packages/core/src/run/playbook-compile.ts`) only enumerate **top-level**
  `tasks/<id>/`. Nested subtasks are discovered at **run time** by a filesystem rescan,
  `discoverStaticChildren` (`packages/core/src/task/discovery/static-children.ts:145-213`), and then
  executed via a diverge/converge node split, `splitContainerNodes`
  (`packages/core/src/manifest/build-dag.ts:170-230`), gated on an ad-hoc `_hasStaticSubtasks` flag.
- **`DagNode.children` is polymorphic.** `discoverStaticChildren` pushes filesystem subtasks
  (`static-children.ts:208`); `TaskDag.addNode` pushes DAG reverse-edges
  (`packages/core/src/dag/task-dag.ts:48-50, 83-85`). Consumers cannot tell them apart — see the
  explicit warning at `manifest/build-dag.ts:177-180` and the `isChild` workaround at
  `build-dag.ts:225`, and the spawner-completion comment at `run/index.ts:2071-2080`.
- **Runtime-spawned children already use a clean model.** A spawned task is an inventory row with
  `parent` set (`appendTaskUpsert` in `task/goal/runtime-ledger.ts`; `task/spawn/unified-spawn.ts`).
  `getReady` (`task-dag.ts:139-152`) already blocks downstream dependents until a parent's children
  finish. This is the model we want — it just isn't applied to static nested tasks.

The result is a system where "what are X's children?" has three possible answers depending on which
layer you ask, and where adding a feature to one loader silently rots another. Patching individual
edge cases (the loader clean break, the 0-child spawner fix, the stall-backoff fix) keeps the lights
on but does not remove the structural cause.

## Goal

**One linear flow, one task model, one source of truth.**

```
playbook ──compile──▶ inventory ──project──▶ DAG ──run──▶ runstate(mirror) ──spawn──▶ inventory
                       (complete:                (pure                          (append rows
                        all tasks incl.           projection                     with parent)
                        nested, each row          of rows)
                        has parent + deps)
```

- **Compile is the only thing that reads the filesystem.** After compile, nothing scans `tasks/`.
- **The DAG is a pure projection of inventory rows.** Hierarchy comes from each row's `parent` field;
  execution edges come from `depends_on` / `depended_on_by`.
- **`children(X) = inventory rows where `parent === X`.** A single derivation, never mutated by
  filesystem scans or DAG reverse-edges. (The user's phrasing: *"node.children = inventory.get subtask
  by taskid"*.)
- **Static-nested tasks and runtime-spawned tasks are the same thing** — a row with `parent` set —
  and obey one completion rule.

Non-goals / explicitly retained:

- The synthetic `root-diverge` / `root-converge` nodes (`injectRootNodes`,
  `manifest/build-dag.ts:245-313`) **stay**. They are pure `depends_on` edges (→ `depended_on_by`) and
  no longer pollute `children` once `children` is inventory-derived.
- Already-landed branch fixes stay: `cacheOutputs()` handoff folding, the `buildDagFromInventory`
  unified entry, the human-review stall-backoff break.

## Proposed design

### One hierarchy rule
`children(X)` is computed from inventory rows where `parent === X`. `TaskDag` maintains a
`childrenByParent: Map<string, string[]>` populated in `addNode` from each node's `parent`, exposed as
`dag.childrenOf(id)`. This is the only way to get children; `DagNode.children` is either removed or
demoted to a build-time snapshot of `childrenOf`. DAG execution edges live exclusively in
`depends_on` / `depended_on_by`.

### One completion rule
A node with children (`childrenOf(id).length > 0`) goes `seeded` after its body runs; its children
depend on it (a `seeded` parent satisfies a child's dependency); downstream dependents wait until
every child is terminal. A node with no children completes immediately. This single rule covers
static-nested parents and runtime spawners identically, and it subsumes both the `_hasStaticSubtasks`
special-case and the 0-child-spawner fix (0 children → completes, no loop).

### Compile enumerates the whole tree
Compile recursively walks `tasks/` (top-level and nested), emitting one inventory row per task:

```jsonc
{ "kind":"task", "id":"01-product-brief",
  "taskRef": { "kind":"static", "dir":"tasks/01-brief/tasks/01-product-brief" },
  "source":"static",
  "parent":"01-brief",
  "depends_on":["<prev sibling within the same parent>"],   // RFC 0034, per parent-group
  "status":"todo" }
```

Children carry **no** explicit `depends_on` edge to their parent — the parent link is the `parent`
field plus the seeded rule (exactly as spawned children work). This is what lets the diverge/converge
split be deleted.

### What gets deleted
- `discoverStaticChildren` and the runtime filesystem rescan (`task/discovery/static-children.ts`);
  its scan patterns move into the compile-time enumerator.
- `splitContainerNodes` (diverge/converge) and the `_hasStaticSubtasks` flag.
- The reverse-edge push into `DagNode.children` in `TaskDag.addNode` (reverse edges stay in
  `depended_on_by` only).
- The separate `spawned_children` notion folds into `childrenOf` (spawned children are just rows whose
  `source === "spawned"`).

### Runstate stays a faithful mirror
`runtime-ledger.ts` `readTaskRows`/`writeTaskRows` must preserve the `kind:"playbook"` header row and
the `parent` field. Today `readTaskRows` drops the header and `writeTaskRows` re-emits rows-only — a
lossy side-effect that already discards global `checks`/`goals` and would now discard hierarchy.

## Migration path

Phased, with a green build and a verification gate at each boundary.

- **Phase A — compile enumerates the nested tree.** `bootstrapInventoryFromDisk` /
  `syncStaticTasksFromDisk` recurse `tasks/` and write rows for every task with `parent` + per-parent
  sibling chain. No behavior change yet (rescan still runs). Verify `examples/product-design` inventory
  contains all nested rows with correct `parent`.
- **Phase B — DAG becomes a pure projection.** Loader sets `parent`/derives children from rows; add
  `childrenByParent` + `dag.childrenOf`; stop `addNode` writing reverse-edges into `children`; delete
  `discoverStaticChildren` + `_hasStaticSubtasks`.
- **Phase C — delete diverge/converge; unify completion.** Remove `splitContainerNodes`; generalize
  `getReady` and the run-loop seeded/completion logic to `childrenOf`; fold in `spawned_children`.
  Keep `injectRootNodes`.
- **Phase D — runstate integrity + consumers + tests.** Fix the lossy ledger write; repoint the ~40
  `node.children`/`spawned_children` consumers and the TUI (`dag/dag-tree.ts`, `dag/dag-node-wrapper.ts`)
  and manifest `child_map`/`parent_map` to the inventory-derived children; port/rewrite tests; add a
  nested-subtask fixture test.

Backwards compatibility: existing top-level-only inventories keep working (compile simply adds the
nested rows on next compile). Spawn rows already carry `parent`. The on-disk schema is unchanged
(`UnifiedRuntimeTask.parent` already exists).

## Verification criteria

1. `pnpm --filter @openplaybooks/converge-core build` and `--filter @openplaybooks/converge build` clean.
2. `grep -rn "discoverStaticChildren\|_hasStaticSubtasks\|splitContainerNodes" packages/core/src` →
   none in live paths.
3. `examples/product-design` (nested, no live AI): wipe inventory, `converge compile`, assert
   `tasks.jsonl` has a row for every nested task with the right `parent` and per-level `depends_on`;
   `dag.childrenOf("01-brief")` matches the on-disk children.
4. Ordered execution: a nested fixture runs parent → children → downstream; spawner examples
   (`deep-research`, `social-sim`) still fan out; `spawn-dir-alignment` 0-child spawner completes
   (`body_runs=1`).
5. Re-baseline both suites against stash-HEAD (the core suite is already ~52-red from unrelated WIP);
   assert **no new failures** vs baseline. `review-flow` (7) green; loader/dag/compile tests green.
6. `hello-world-review` handoff still enforced (regression guard for RFC 0047 work).

## Risks

- **R1 (highest):** `getReady` + run-loop completion is the execution core. Invariants to preserve:
  downstream waits for children; children run after the parent (`seeded`); a 0-child parent completes;
  the resume/manifest path reconstructs children from inventory, not a stale `child_map`.
- **R2:** RFC-0034 sibling chaining must be **per parent group**, or nested siblings serialize wrongly.
- **R3:** The manifest cache (`buildDagFromManifest`) and `TaskDag.fromManifest` must derive children
  from inventory `parent`, not the persisted `child_map`, or resumed runs regress to the conflation.
- **R4:** ~40 `node.children`/`spawned_children` consumers plus the TUI — broad surface; Phases B and C
  change children semantics and must land in sequence with a passing build at each boundary.
- **R5:** The core suite is already ~52-red on this branch; baseline-diff is the only reliable
  regression signal.
- **R6:** Large change — land per phase with verification gates, not one commit.

## Appendix: key references

- Rescan + split (to delete): `task/discovery/static-children.ts:145-213`,
  `manifest/build-dag.ts:170-230`; called from `run/playbook-compile.ts` (~80/120).
- Conflation: `dag/task-dag.ts:addNode` (48-50, 66-68, 83-85, 100-102),
  `manifest/build-dag.ts:177-180,225`, `run/index.ts:2071-2080`.
- Clean model to generalize: `dag/task-dag.ts:getReady` (139-152); spawn rows
  `task/goal/runtime-ledger.ts:appendTaskUpsert`, `task/spawn/unified-spawn.ts`,
  `run/ledger-sync.ts`.
- Inventory schema (already has `parent`): `task/goal/unified-tasks.ts:27-88`.
- Keep: `injectRootNodes` `manifest/build-dag.ts:245-313`.
- Lossy ledger write to fix: `task/goal/runtime-ledger.ts` `readTaskRows`/`writeTaskRows` (203-260).
