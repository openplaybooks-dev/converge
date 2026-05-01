---
title: New declarative loader walks declarations only; behind a flag; cross-loader parity test
description: |
  Land packages/core/src/config/declarative-loader.ts. It reads
  playbook.yml's tasks: as roots, then walks the tree by following
  children: declarations on each TASK.md. Never scans tasks/. Behind the
  flag CONVERGE_DECLARATIVE_DISCOVERY=1, loader.ts routes through the
  new path; otherwise the existing folder-scan path runs unchanged.
  A cross-loader parity test asserts both produce identical DAGs for
  the fixture playbook.

inputs:
  - docs/design/declarative-discovery.md
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/path-registry.ts
  - packages/core/src/config/loader.ts
  - packages/core/src/config/validator.ts
  - packages/cli/tests/fixtures/minimal-playbook

outputs:
  - packages/core/src/config/declarative-loader.ts
  - packages/core/src/config/loader.ts
  - packages/core/tests/config/declarative-loader.test.ts
  - packages/core/tests/config/loader-parity.test.ts
  - packages/cli/tests/integration/declarative-flag.test.ts

checks:
  - id: typecheck-green
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck.
  - id: tests-green
    cmd: pnpm --filter @converge/core --filter @converge/cli test
    description: All tests pass with flag off (default folder-scan).
  - id: tests-green-with-flag
    cmd: CONVERGE_DECLARATIVE_DISCOVERY=1 pnpm --filter @converge/core --filter @converge/cli test
    description: All tests pass with flag on (declarative loader).
  - id: declarative-loader-present
    cmd: test -s packages/core/src/config/declarative-loader.ts
    description: Declarative loader module exists.
  - id: parity-test-present
    cmd: test -s packages/core/tests/config/loader-parity.test.ts
    description: Cross-loader parity test exists.
  - id: parity-test-passes
    cmd: pnpm --filter @converge/core test -- loader-parity
    description: Cross-loader parity test asserts identical DAGs.
  - id: cycle-detection
    cmd: pnpm --filter @converge/core test -- declarative-loader -- cycle
    description: Cycle in children: declarations errors with a clear message.

skills: []
references:
  - "docs/design/declarative-discovery.md"

vars: {}
dependencies:
  - 02-children-and-registry-schema
---

# 03 — Declarative loader behind a flag

The new loader is the single most important deliverable in this
playbook. Get it right.

## What lands

### `declarative-loader.ts`

Pure function:

```ts
export function loadPlaybookDeclaratively(
  playbookYmlPath: string,
): LoadedPlaybook;
```

Algorithm:
1. Read `playbook.yml`. Parse `tasks:` block — these are root task ids.
2. Build the path registry as a side effect of the walk: for each id,
   resolve its path (default `<parent-dir>/<id>/TASK.md` for bare-id
   children, override for object form). Register `id → path`. Throw
   on duplicate.
3. Read the seed and test libraries (these still scan `<playbook>/seeds/`
   and `<playbook>/tests/` — small libraries, scanning is fine; the
   point of this playbook is replacing the *task* DAG scan, not all
   filesystem reads).
4. For each root, recurse: read the TASK.md, parse, push declared
   children onto the queue. Validate each child's `id` and resolved
   path exist on disk; error otherwise.
5. For tasks with `from_seed:`, validate the named seed exists in the
   library. Children come from the spawning seed at runtime — phase 04
   wires this. The loader records the parent's `dynamicChildrenSeed`
   field but does not enumerate children.
6. Detect cycles: if walking `children:` revisits a parent already on
   the current ancestor path, throw `CycleDetectedError` with the cycle
   path.
7. Return `{ tasks, registry, seeds, tests }`.

### `loader.ts` routing

Add a single conditional at the top of the existing exported `load`
function:

```ts
if (process.env.CONVERGE_DECLARATIVE_DISCOVERY === '1') {
  return loadPlaybookDeclaratively(...);
}
// existing folder-scan path
```

Do not delete or modify the folder-scan path. Phase 06 deletes it.

### Cross-loader parity test

`packages/core/tests/config/loader-parity.test.ts`:
- Load the `minimal-playbook` fixture under both loaders.
- Assert: same set of task ids, same parent-child edges, same seed and
  test registries. Path metadata may differ for spawned-children-not-
  yet-spawned cases — focus parity on the *static* DAG.
- Run for the existing fixture and at least one nested fixture (a
  parent with depth ≥ 3).

This test is the cutover gate. If it ever fails post-phase-03, the
declarative loader has drifted from folder-scan and must be fixed
before phase 05's per-playbook migration can rely on parity.

### Integration test

`packages/cli/tests/integration/declarative-flag.test.ts`:
- Run `converge compile --playbook=<minimal>` with the flag off; assert
  manifest content.
- Run again with the flag on; assert identical manifest content (modulo
  loader-source metadata if the manifest records it).

## TDD discipline

Per leaf, red-green-refactor. Specific must-have leaves:
1. Loader walks a flat playbook (root tasks only, no children).
2. Loader walks a nested playbook (children: bare ids).
3. Loader walks an explicit-path playbook (children: object form with
   path override).
4. Loader detects a cycle and throws.
5. Loader errors on a child id whose path doesn't exist.
6. Loader errors on a duplicate id in the registry.
7. Cross-loader parity passes for the fixture.

## Out of scope

- Runtime / manifest changes (phase 04).
- Migration of any playbook (phase 05).
- Deleting folder-scan (phase 06).

## Done when

All seven checks pass. Both loaders produce identical DAGs for the
fixture. Folder-scan still works unchanged when the flag is off.
