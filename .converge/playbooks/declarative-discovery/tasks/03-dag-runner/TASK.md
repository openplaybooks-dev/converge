---
title: DAG runner executes tasks in topological order; replaces sequential child iteration in fix-gaps
description: |
  Land packages/core/src/dag/dag-runner.ts. The runner executes tasks
  via topological sort (Kahn's algorithm): on each iteration, getReady()
  returns nodes whose depends_on are all complete. Each ready node runs
  its convergence loop. When a node completes, downstream may become
  ready. WBS spawning adds new nodes to the running DAG.

  Wire the runner into fix-gaps.ts so that when the declarative flag is
  on, the DAG runner orchestrates task execution instead of the
  sequential for-child-of-children loop.

inputs:
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/topological-sort.ts
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/config/declarative-loader.ts
  - packages/core/src/task/unit/unit.ts
  - packages/core/src/task/unit/fix-gaps.ts
  - packages/core/src/task/unit/run.ts
  - packages/core/src/runtime/child-synthesizer.ts
  - packages/core/src/runtime/seed-spawner.ts

outputs:
  - packages/core/src/dag/dag-runner.ts
  - packages/core/src/task/unit/fix-gaps.ts
  - packages/core/src/task/unit/run.ts
  - packages/core/tests/dag/dag-runner.test.ts
  - packages/cli/tests/integration/dag-runner.test.ts

checks:
  - id: typecheck-green
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck.
  - id: tests-green
    cmd: pnpm --filter @converge/core --filter @converge/cli test
    description: All tests pass with flag off (tree execution unchanged).
  - id: dag-runner-exists
    cmd: test -s packages/core/src/dag/dag-runner.ts
    description: DAG runner module exists.
  - id: linear-dag-executes
    cmd: pnpm --filter @converge/core test -- dag-runner -- linear
    description: Linear DAG (A→B→C) executes in correct order.
  - id: diamond-dag-executes
    cmd: pnpm --filter @converge/core test -- dag-runner -- diamond
    description: Diamond DAG (A→[B,C]→D) executes B and C after A, D after both.
  - id: failed-task-blocks-downstream
    cmd: pnpm --filter @converge/core test -- dag-runner -- blocking
    description: A failed blocking task prevents downstream from running.
  - id: wbs-spawn-adds-nodes
    cmd: pnpm --filter @converge/core test -- dag-runner -- spawn
    description: WBS spawning adds new nodes to the running DAG.
  - id: checkpoint-resume-works
    cmd: pnpm --filter @converge/core test -- dag-runner -- resume
    description: Resume skips completed nodes and continues with ready nodes.

skills: []
references:
  - "docs/design/declarative-discovery.md"

vars: {}
dependencies:
  - 02-declarative-loader
---

# 03 — DAG runner

The runner replaces tree-based orchestration with topological execution.

## What lands

### `dag-runner.ts`

```ts
export async function runDag(opts: {
  dag: TaskDag;
  projectDir: string;
  epicId: string;
  maxTaskAttempts: number;
}): Promise<{ success: boolean; completed: string[]; failed: string[] }>;
```

Kahn's algorithm:
1. Compute initial ready set: nodes whose `depends_on` are all satisfied.
2. While ready set is not empty:
   a. For each ready node, run its convergence loop via `executeTask()`.
   b. On success: `dag.markComplete(id)`, update checkpoint.
   c. On failure: `dag.markFailed(id)`. If blocking, skip downstream.
   d. Recompute ready set.
3. WBS spawn: `dag.addNode()` for new children; recompute ready set.
4. Return `{ success, completed, failed }`.

Sequential within each layer initially. Parallelism is a future
optimization.

### `fix-gaps.ts` changes

When `unit.declarative` is true (flag on):
- Skip `for (child of unit.children)` sequential loop.
- Plan/WBS/leaf gap resolution unchanged (per-task concerns).
- Child delegation handled by DagRunner at the playbook level.

### WBS spawning integration

When a task's WBS spawns children via `from_seed:`:
```ts
dag.addNode({
  id: childId,
  parents: [parentId],
  children: [],
  depends_on: [parentId],
  depended_on_by: [],
  taskDef: childTaskDef,
  path: childPath,
  status: 'pending',
});
```

The DAG runner picks them up when the parent completes.

## TDD

Must-have tests:
1. Linear DAG (A→B→C): B after A, C after B.
2. Diamond DAG (A→[B,C]→D): B,C after A; D after both.
3. Failed blocking task stops downstream.
4. WBS spawn adds nodes mid-run.
5. Checkpoint resume skips completed nodes.
6. Single-node DAG runs and completes.

## Done when

All checks pass. Linear, diamond, and spawning DAGs execute in correct
topological order. Failed tasks block downstream. Resume works.
Tree execution unchanged when flag off.
