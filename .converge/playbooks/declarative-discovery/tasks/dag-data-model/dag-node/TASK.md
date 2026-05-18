---
id: dag-node
title: DagNode interface — pure data, no execution logic
description: |
  Define the DagNode interface under packages/core/src/dag/dag-node.ts.
  DagNode is pure data — it replaces Unit's tree role (parent/children)
  while Unit continues to own execution concerns. A DagNode can be
  concrete (backed by a TASK.md on disk) or virtual (spawned dynamically
  from a seed — exists in the DAG but has no file yet).

inputs:
  - packages/core/src/config/task-definition.ts
  - packages/core/src/manifest/types.ts

outputs:
  - packages/core/src/dag/dag-node.ts
  - packages/core/tests/dag/dag-node.test.ts

checks:
  - id: dag-node-exists
    cmd: test -s packages/core/src/dag/dag-node.ts
    description: DagNode module exists.
  - id: dag-node-tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- dag-node
    description: DagNode unit tests pass.

skills: []
references:
  - "packages/core/src/config/task-definition.ts"

vars: {}
dependencies: []
children:
  - dag-node-red
  - dag-node-green
---

# 01 — DagNode

Define the `DagNode` interface — the fundamental unit of the DAG.
Pure data, no execution logic. Replaces `Unit.parent: Unit | null`
and `Unit.children?: Unit[]`.

## Interface

```ts
export type DagNodeStatus = 'pending' | 'ready' | 'running' | 'complete' | 'failed';

export interface DagNode {
  id: string;
  parents: string[];        // incoming edges (who declares me as a child)
  children: string[];       // outgoing edges (who I declare as children)
  depends_on: string[];     // execution dependencies
  depended_on_by: string[]; // reverse deps (computed at DAG build time)
  taskDef: TaskDefinition;  // the actual task config
  path: string;             // file path — metadata, not structure
  status: DagNodeStatus;
  virtual: boolean;         // true for seeded/dynamic nodes (no TASK.md on disk)
}
```

- `parents` / `children` — DAG edges from `children:` declarations
- `depends_on` / `depended_on_by` — execution ordering edges
- `virtual: true` — node from `from_seed:`, no file on disk; materialized at runtime
- `status` — used by the DAG runner; initial value is `'pending'`

## Children

### red
Write `packages/core/tests/dag/dag-node.test.ts`. Tests for the
interface shape: default values, status type, structural typing.

### green
Implement `packages/core/src/dag/dag-node.ts`. Export the interface
and type. Keep it minimal — just the type definition.

## Done when

DagNode interface exists, tests pass, typecheck green.
