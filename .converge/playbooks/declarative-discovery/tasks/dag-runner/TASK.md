---
id: dag-runner
title: DAG runner — executeDag() runs topological pass; no iterations, no waves; dynamic spawns materialize virtual nodes
description: |
  Implement executeDag() — a single-pass topological executor. No iteration
  loop. No wave loop. Just: compute topological order, execute each layer,
  spawn virtual nodes as parents complete, return results. This replaces
  the entire convergence loop (iterations, waves, gap detection,
  next-task finding).

inputs:
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/topological-sort.ts
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/config/declarative-loader.ts
  - packages/core/src/task/unit/unit.ts
  - packages/core/src/runtime/child-synthesizer.ts
  - packages/core/src/runtime/seed-spawner.ts

outputs:
  - packages/core/src/dag/dag-runner.ts
  - packages/core/tests/dag/dag-runner.test.ts
  - packages/cli/tests/integration/dag-runner.test.ts

checks:
  - id: typecheck-green
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck.
  - id: tests-green
    cmd: pnpm --filter @converge/core --filter @converge/cli test
    description: All tests pass.
  - id: dag-runner-exists
    cmd: test -s packages/core/src/dag/dag-runner.ts
    description: DAG runner module exists.
  - id: linear-dag-executes
    cmd: pnpm --filter @converge core test -- dag-runner -- linear
    description: Linear DAG (A→B→C) executes in correct order.
  - id: diamond-dag-executes
    cmd: pnpm --filter @converge core test -- dag-runner -- diamond
    description: Diamond DAG executes B and C after A, D after both.
  - id: failed-task-blocks-downstream
    cmd: pnpm --filter @converge core test -- dag-runner -- blocking
    description: Failed blocking task prevents downstream execution.
  - id: dynamic-spawn-adds-nodes
    cmd: pnpm --filter @converge core test -- dag-runner -- spawn
    description: Dynamic spawns add virtual nodes mid-execution.
  - id: checkpoint-resume-works
    cmd: pnpm --filter @converge core test -- dag-runner -- resume
    description: Resume skips completed nodes.

skills: []
references:
  - "docs/design/declarative-discovery.md"

vars: {}
dependencies:
  - declarative-loader
children:
  - auto-complete
  - dynamic-spawn
  - executor
  - integration-tests
---

# 03 — DAG runner

`executeDag()` replaces the entire convergence loop. No iterations.
No waves. No gap detection. No next-task finding.

## API

```ts
export interface DagResult {
  success: boolean;
  completed: string[];
  failed: string[];
}

export async function executeDag(
  dag: TaskDag,
  opts: {
    projectDir: string;
    maxTaskAttempts: number;
    onNodeStart?: (id: string) => Promise<void>;
    onNodeComplete?: (id: string) => Promise<void>;
    onNodeFail?: (id: string, error: Error) => Promise<void>;
  }
): Promise<DagResult>;
```

## Algorithm

1. Compute topological order (`dag.topologicalOrder()`).
2. For each layer:
   a. Get ready nodes in this layer (all `depends_on` satisfied).
   b. Execute each ready node via the task runner.
   c. On success: `dag.markComplete(id)`.
   d. On failure: `dag.markFailed(id)`. If blocking, skip downstream
      nodes that depend on it.
   e. After each node: check for dynamic spawns. If the node has
      `from_seed:`, materialize virtual children as concrete nodes.
3. Return `{ success, completed, failed }`.

Sequential within each layer. Parallelism is a future optimization.

## Children

### auto-complete
Pre-execution check: if all task outputs exist on disk AND all checks
pass, skip execution — the task is already satisfied. Handles resume
and re-run scenarios without re-executing completed work.

### executor
Implement `executeDag()`. Core topological executor. Unit tests with
linear, diamond, single-node, empty DAGs. Test failure blocking and
checkpoint resume.

### dynamic-spawn
Virtual node materialization. When a parent with `from_seed:`
completes, `child-synthesizer` runs and produces concrete child tasks.
These replace the virtual nodes in the DAG. Test multi-generation
spawning.

### integration-tests
CLI-level test: `converge run --playbook=minimal-playbook` executes
via the DAG runner. Tasks complete in topological order. Output
matches expected execution trace.

## Done when

All checks pass. Linear, diamond, and spawning DAGs execute correctly.
Failed tasks block downstream. Resume works.
