---
id: executor-green
title: Green — implement executeDag()
description: |
  Implement packages/core/src/dag/dag-runner.ts. Single-pass topological
  executor. Run tests until green. Export from dag/index.ts.

inputs:
  - packages/core/tests/dag/dag-runner.test.ts
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/dag/topological-sort.ts

outputs:
  - packages/core/src/dag/dag-runner.ts
  - packages/core/src/dag/index.ts

checks:
  - id: dag-runner-exists
    cmd: test -s packages/core/src/dag/dag-runner.ts
    description: Module exists.
  - id: tests-pass
    cmd: pnpm --filter @converge core test -- dag-runner
    description: All tests pass (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @converge core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — implement executeDag()

Create `packages/core/src/dag/dag-runner.ts`:

```ts
import { TaskDag } from './task-dag.js';
import type { DagNode } from './dag-node.js';

export interface DagResult {
  success: boolean;
  completed: string[];
  failed: string[];
}

export interface DagRunnerOpts {
  projectDir: string;
  maxTaskAttempts: number;
  executeTask: (node: DagNode, projectDir: string) => Promise<void>;
  onNodeStart?: (id: string) => Promise<void>;
  onNodeComplete?: (id: string) => Promise<void>;
  onNodeFail?: (id: string, error: Error) => Promise<void>;
}

export async function executeDag(
  dag: TaskDag,
  opts: DagRunnerOpts,
): Promise<DagResult> {
  const completed: string[] = [];
  const failed: string[] = [];
  const blocked = new Set<string>();

  const layers = dag.topologicalOrder();

  for (const layer of layers) {
    for (const node of layer) {
      // Skip already-complete nodes (resume)
      if (node.status === 'complete') {
        completed.push(node.id);
        continue;
      }

      // Skip failed nodes and their blocked downstream
      if (node.status === 'failed') {
        failed.push(node.id);
        continue;
      }

      // Skip if blocked by a failed dependency
      const blockedByFailedDep = node.depends_on.some(
        depId => dag.nodes.get(depId)?.status === 'failed'
      );
      if (blockedByFailedDep) {
        blocked.add(node.id);
        continue;
      }

      // Execute
      await opts.onNodeStart?.(node.id);
      try {
        node.status = 'running';
        await opts.executeTask(node, opts.projectDir);
        node.status = 'complete';
        dag.markComplete(node.id);
        completed.push(node.id);
        await opts.onNodeComplete?.(node.id);
      } catch (err) {
        node.status = 'failed';
        dag.markFailed(node.id);
        failed.push(node.id);
        await opts.onNodeFail?.(node.id, err as Error);
      }
    }
  }

  return {
    success: failed.length === 0,
    completed,
    failed,
  };
}
```

## Update `dag/index.ts`

Add: `export { executeDag } from './dag-runner.js';`
Add: `export type { DagResult, DagRunnerOpts } from './dag-runner.js';`

## Refactor

After tests pass:
- Extract blocked-check into a helper
- Consider collecting blocked nodes in the result
- Verify O(V + E) — each node visited once

Run `pnpm --filter @converge core test -- dag-runner` — all green.
Run `pnpm --filter @converge core typecheck` — no errors.
