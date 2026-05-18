---
id: dag-node-green
title: Green — implement DagNode interface
description: |
  Implement packages/core/src/dag/dag-node.ts. Run tests — they must
  pass (GREEN). Keep the implementation minimal: just the type definition.

inputs:
  - packages/core/tests/dag/dag-node.test.ts

outputs:
  - packages/core/src/dag/dag-node.ts

checks:
  - id: dag-node-exists
    cmd: test -s packages/core/src/dag/dag-node.ts
    description: DagNode module exists.
  - id: tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- dag-node
    description: DagNode tests pass (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — implement DagNode

Create `packages/core/src/dag/dag-node.ts`:

```ts
import type { TaskDefinition } from '../config/task-definition.js';

export type DagNodeStatus = 'pending' | 'ready' | 'running' | 'complete' | 'failed';

export interface DagNode {
  id: string;
  parents: string[];
  children: string[];
  depends_on: string[];
  depended_on_by: string[];
  taskDef: TaskDefinition;
  path: string;
  status: DagNodeStatus;
  virtual: boolean;
}
```

No factory function needed yet — TaskDag (sub-task 03) handles node
creation. This file is purely the type definition.

Run `pnpm --filter @openplaybooks/converge-core test -- dag-node` — all tests pass.

Run `pnpm --filter @openplaybooks/converge-core typecheck` — no errors.

## Done when

Module exists, tests green, typecheck green.
