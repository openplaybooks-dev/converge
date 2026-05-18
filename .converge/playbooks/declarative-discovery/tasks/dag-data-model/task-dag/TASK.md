---
id: task-dag
title: TaskDag class — DAG container with nodes, edges, manifest serialization
description: |
  Implement the TaskDag class under packages/core/src/dag/task-dag.ts.
  TaskDag owns the node map, computes roots, provides graph queries
  (getReady, getDownstream, getUpstream), supports mutation
  (markComplete, markFailed, addNode), and serializes to/from the
  existing Manifest format.

inputs:
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/topological-sort.ts
  - packages/core/src/manifest/types.ts

outputs:
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/dag/index.ts
  - packages/core/tests/dag/task-dag.test.ts

checks:
  - id: task-dag-exists
    cmd: test -s packages/core/src/dag/task-dag.ts
    description: TaskDag module exists.
  - id: dag-index-exists
    cmd: test -s packages/core/src/dag/index.ts
    description: DAG barrel export exists.
  - id: tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- task-dag
    description: TaskDag tests pass.
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

skills: []
references:
  - "packages/core/src/dag/dag-node.ts"
  - "packages/core/src/manifest/types.ts"

vars: {}
dependencies: []
children:
  - task-dag-red
  - task-dag-green
---

# 03 — TaskDag

The TaskDag is the primary container. It owns all nodes, computes the
root set, provides readiness queries for the runner, and serializes to
the manifest format.

## API

```ts
export class TaskDag {
  nodes: Map<string, DagNode>;
  roots: DagNode[];

  constructor();

  addNode(node: DagNode): void;
  getReady(): DagNode[];
  getDownstream(id: string): DagNode[];
  getUpstream(id: string): DagNode[];
  markComplete(id: string): void;
  markFailed(id: string): void;
  topologicalOrder(): DagNode[][];

  toManifest(): Manifest;
  static fromManifest(m: Manifest): TaskDag;
}
```

- `roots` — nodes with no incoming `children:` edges (no parent
  declares them as a child). These are the playbook's entry points.
- `getReady()` — nodes whose `depends_on` are all `'complete'` (or
  `depends_on` is empty).
- `topologicalOrder()` — delegates to `topologicalSort()`.
- `addNode()` — for WBS/dynamic spawns at runtime. Recomputes roots
  and reverse edges.
- `toManifest()` / `fromManifest()` — round-trip through the existing
  manifest format (`parent_map`, `child_map`).

## Children

### red
Write `packages/core/tests/dag/task-dag.test.ts`. Cover: empty DAG,
addNode, getReady, markComplete/markFailed, getDownstream/getUpstream,
topologicalOrder, toManifest/fromManifest round-trip, multi-parent,
duplicate id rejection.

### green
Implement `task-dag.ts` and `dag/index.ts`. Run tests green.

## Done when

All tests pass. Typecheck green. Barrel export exists.
