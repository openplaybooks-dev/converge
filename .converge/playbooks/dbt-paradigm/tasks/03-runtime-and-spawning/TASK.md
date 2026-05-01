---
title: Runtime resolution for seeds; spawning seeds materialize dynamic children; selectors and manifest extended
description: |
  Wire the runtime to the seed registry and extract per-entity child
  synthesis out of wbs-executor.ts so phase 04 can delete the rest. The
  WBS path keeps working side-by-side; both paths must be green at the
  end of this phase. Tests need no runtime hook — they were resolved to
  inline checks in phase 02.

inputs:
  - docs/design/dbt-paradigm.md
  - .converge/playbooks/dbt-paradigm/REFS.md
  - packages/core/src/config/seed-md-definition.ts
  - packages/core/src/config/test-md-definition.ts
  - packages/core/src/config/test-expander.ts
  - packages/core/src/config/loader.ts
  - packages/core/src/executor/wbs-executor.ts
  - packages/core/src/executor/wbs-target-utils.ts
  - packages/core/src/runtime/runtime.ts
  - packages/core/src/manifest
  - packages/core/src/select
  - packages/cli/tests/fixtures/minimal-playbook

outputs:
  - packages/core/src/runtime/seed-resolver.ts
  - packages/core/src/runtime/seed-spawner.ts
  - packages/core/src/runtime/child-synthesizer.ts
  - packages/core/src/runtime/runtime.ts
  - packages/core/src/manifest
  - packages/core/src/select
  - packages/core/tests/runtime/seed-resolver.test.ts
  - packages/core/tests/runtime/seed-spawner.test.ts
  - packages/core/tests/manifest/libraries-section.test.ts
  - packages/core/tests/select/seed-and-test-methods.test.ts
  - packages/cli/tests/integration/seed-end-to-end.test.ts
  - packages/cli/tests/fixtures/minimal-playbook

checks:
  - id: typecheck-green
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck after runtime wiring.
  - id: tests-green
    cmd: pnpm --filter @converge/core --filter @converge/cli test
    description: All core and CLI tests pass.
  - id: wbs-still-works
    cmd: pnpm --filter @converge/core test -- wbs
    description: Existing WBS tests still pass — both paths green side-by-side.
  - id: seed-resolver-present
    cmd: test -s packages/core/src/runtime/seed-resolver.ts
    description: Context-seed resolver exists.
  - id: seed-spawner-present
    cmd: test -s packages/core/src/runtime/seed-spawner.ts
    description: Spawning-seed materializer exists.
  - id: child-synthesizer-extracted
    cmd: test -s packages/core/src/runtime/child-synthesizer.ts
    description: Per-entity child synthesis is extracted from wbs-executor.ts.
  - id: seed-end-to-end
    cmd: pnpm --filter @converge/cli test -- seed-end-to-end
    description: Integration test covers context + spawning seed paths.

skills: []
references:
  - "docs/design/dbt-paradigm.md"
  - "docs/design/cli-redesign.md"

vars: {}
dependencies:
  - 02-seeds-and-tests-libraries
---

# 03 — Runtime resolution and dynamic spawning

This phase has three concerns. Implement them as a per-concern WBS-style
fan-out internally (the per-layer planner can decide), each with strict
red-green-refactor.

## Concern A — Context seeds

`packages/core/src/runtime/seed-resolver.ts` exports:

```ts
resolveContextSeeds(
  task: ParsedTask,
  seeds: Map<string, SeedDef>,
  cache: SessionSeedCache,        // memoize by (name, args, input-hash)
): { extraInputs: ResolvedFile[] }
```

Behavior:
- For each entry in `task.seeds:` whose looked-up `SeedDef.kind === "context"`:
  - Compute a cache key `(name, canonicalize(args), inputHash)`. If hit,
    reuse the cached output. If miss, run the seed body via the existing
    executor pipeline (the same one that runs task bodies).
  - Merge the seed's produced files into the task's input bundle as
    `extraInputs`. The downstream task agent sees them alongside its
    declared `inputs:`.
- The cache lives for the duration of one session (one `converge run`
  invocation). It is **not** persisted across sessions in this phase.

Wire `resolveContextSeeds` into `runtime.ts` at task setup, before the
task body runs.

## Concern B — Spawning seeds

`packages/core/src/runtime/seed-spawner.ts` exports:

```ts
spawnDynamicChildren(
  parent: ParsedTask,
  seeds: Map<string, SeedDef>,
  ctx: SpawnContext,
): { children: SynthesizedChild[] }
```

Behavior:
- For each entry in `parent.seeds:` whose `SeedDef.kind === "spawning"`:
  - Run the seed body, expecting structured output of shape
    `{ tasks: [{ id, vars, ... }] }`. Validate.
  - Each entry's `id` must be stable across runs. If a previous session
    spawned a child with `id=X` and this run does not include `X`, abort
    with a clear error unless `--full-refresh` is set.
  - Call `child-synthesizer.synthesize(parent, entry)` (see Concern C)
    to produce a real `SynthesizedChild` per entry.
- Return the children. The runtime slots them into the DAG under `parent`,
  exactly where WBS spawns children today.

The `frontier` / `expected` / `concrete` machinery from cli-redesign:
- Parent with `seeds:[<spawning>]` and no prior session output ⇒ `frontier`.
- If the seed declares `preview_manifest:` and the upstream catalog file
  exists ⇒ `expected` (children predicted from catalog entries).
- After the seed runs ⇒ `concrete`.

Update `compile --seed` so that running a seed via this command runs only
the seed body and the synthesis step, not the spawned tasks themselves.
This is the contract from cli-redesign §2.

## Concern C — Extract per-entity child synthesis

The logic that materializes a child TASK.md from a parent + a vars
binding currently lives inside `wbs-executor.ts`. Move it to:

```
packages/core/src/runtime/child-synthesizer.ts
```

Both `wbs-executor.ts` (legacy path) and `seed-spawner.ts` (new path)
import from this module. **Do not duplicate the logic.** The point of
this extraction is so phase 04 can delete `wbs-executor.ts` without
losing per-entity synthesis.

Verification: existing WBS integration tests must still pass after the
extraction. If they do, the extraction is behavior-preserving.

## Manifest updates

Extend the manifest writer (under `packages/core/src/manifest/`) to add
a top-level `libraries: { seeds: [...], tests: [...] }` section listing
every discovered library entry. Tooling reads this; it is not part of the
schedulable DAG.

For spawning-seed parents, set the parent's `state` field per the rules
above (`frontier` / `expected` / `concrete`). The `wbs:`-keyed parents
keep their existing manifest treatment — both code paths coexist in this
phase.

## Selector additions

Extend the select grammar (`packages/core/src/select/`) to add two methods:

- `seed:<name>` — selects every task whose `seeds:` list references
  `<name>`.
- `test:<name>` — selects every task whose `_testRefs` (recorded in
  phase 02) contains `<name>`. The check is now expanded to inline, but
  the original reference is still queryable.

The existing `frontier:` / `expected:` / `concrete:` methods are
unchanged — they read the manifest's `state` field, which now reflects
seed-driven dynamism in addition to WBS-driven dynamism.

## Integration test

`packages/cli/tests/integration/seed-end-to-end.test.ts` runs the
extended `minimal-playbook` fixture against the built CLI:

1. `converge compile` — assert the parent referencing a spawning seed
   shows `state: frontier` in the manifest.
2. `converge compile --seed --select '<parent>'` — assert seed runs,
   children materialize on disk, parent flips to `state: concrete` with N
   children.
3. `converge run --select '<task-with-context-seed>' --dry` — assert dry
   plan shows context-seed resolution.
4. `converge list --select 'test:<name>'` — assert the task whose checks
   originally referenced the test is returned.
5. `converge list --select 'seed:<name>'` — same for seed reference.

## Out of scope (do not touch)

- Deletion of `wbs:` field, `wbs-executor.ts`, or any user playbook's
  `wbs/` directory (phase 04).
- Migration of any user playbook (phase 05).
- Documentation pages (phase 06).

## Done when

All eight checks pass; both the WBS and seed paths run green in
parallel; the manifest carries a `libraries:` section; the two new
selectors return correct results.
