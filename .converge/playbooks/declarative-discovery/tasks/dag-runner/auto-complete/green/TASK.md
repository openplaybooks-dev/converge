---
id: auto-complete-green
title: Green — verify integration; fix if needed
description: |
  Run the auto-complete tests. They should pass — the navigator-graph
  already has this logic. If any fail, fix the integration between
  `executeDag()` and `converge()`.

inputs:
  - packages/core/tests/dag/auto-complete.test.ts
  - packages/core/src/navigator/core/navigator.ts
  - packages/core/src/dag/dag-runner.ts

checks:
  - id: auto-complete-tests-pass
    cmd: pnpm --filter @converge core test -- auto-complete
    description: All auto-complete tests pass (GREEN).
  - id: dag-runner-tests-pass
    cmd: pnpm --filter @converge core test -- dag-runner
    description: Existing DAG runner tests still pass.
  - id: typecheck-green
    cmd: pnpm --filter @converge core typecheck
    description: Core typechecks.

tags: [tdd, green]
---

# Green — verify, fix if needed

## Step 1 — Run tests

```bash
pnpm --filter @converge core test -- auto-complete
```

Expected: all tests pass. The navigator-graph's `check-outputs-exist`
already handles auto-completion.

## Step 2 — If any test fails

The DAG runner's integration with `converge()` may need adjustment:

1. `executeDag()` must call `converge()` (not a custom `executeTask`)
   for per-node execution.
2. `converge()` must receive the correct `unit`, `projectDir`, and
   `taskContext`.
3. The `check-outputs-exist` preflight action must be in the default
   graph (it already is — in `default-graph.ts`).

## Step 3 — Confirm the integration point

The DAG runner should look like:

```ts
// In executeDag(), per node:
const unit = createUnitFromDagNode(node, projectDir);
const result = await converge({
  unit,
  projectDir,
  epicId: node.id,
  registry: actionRegistry,
  taskContext: createTaskContext(node),
  maxActions: opts.maxActions ?? 100,
});
// converge() already handles: check-outputs-exist → detect-gaps →
// resolve → execute → verify → signal-done
// If outputs+checks already satisfied, it returns { success: true }
// immediately without executing the task body.
```

## Done when

All auto-complete tests pass. Existing DAG runner tests pass. The
integration between `executeDag()` and `converge()` is verified —
the navigator-graph's preflight check handles auto-completion.
