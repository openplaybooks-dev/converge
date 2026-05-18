---
id: task-dag-green
title: Green — implement TaskDag class + dag/index.ts barrel export
description: |
  Implement packages/core/src/dag/task-dag.ts. Run tests until green.

inputs:
  - packages/core/tests/dag/task-dag.test.ts
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/topological-sort.ts
  - packages/core/src/manifest/types.ts

outputs:
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/dag/index.ts

checks:
  - id: task-dag-exists
    cmd: test -s packages/core/src/dag/task-dag.ts
    description: TaskDag module exists.
  - id: dag-index-exists
    cmd: test -s packages/core/src/dag/index.ts
    description: DAG barrel export exists.
  - id: tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- task-dag
    description: All TaskDag tests pass (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — implement TaskDag

## Step 1 — `packages/core/src/dag/task-dag.ts`

```ts
import { topologicalSort } from './topological-sort.js';
import type { DagNode } from './dag-node.js';
import type { Manifest } from '../manifest/types.js';

export class TaskDag {
  nodes: Map<string, DagNode> = new Map();
  roots: DagNode[] = [];

  addNode(node: DagNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`);
    }
    this.nodes.set(node.id, node);
    this._recomputeRoots();
  }

  getReady(): DagNode[] {
    const ready: DagNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.status !== 'pending') continue;
      const depsSatisfied = node.depends_on.every(
        depId => this.nodes.get(depId)?.status === 'complete'
      );
      if (depsSatisfied) {
        ready.push(node);
      }
    }
    return ready;
  }

  getDownstream(id: string): DagNode[] {
    const node = this.nodes.get(id);
    if (!node) return [];
    return node.children
      .map(childId => this.nodes.get(childId))
      .filter((n): n is DagNode => n != null);
  }

  getUpstream(id: string): DagNode[] {
    const node = this.nodes.get(id);
    if (!node) return [];
    return node.parents
      .map(parentId => this.nodes.get(parentId))
      .filter((n): n is DagNode => n != null);
  }

  markComplete(id: string): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    node.status = 'complete';
  }

  markFailed(id: string): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    node.status = 'failed';
  }

  topologicalOrder(): DagNode[][] {
    return topologicalSort(this.nodes);
  }

  toManifest(): Manifest {
    // Build parent_map and child_map from node edges
    const parent_map: Record<string, string[]> = {};
    const child_map: Record<string, string[]> = {};
    for (const [id, node] of this.nodes) {
      parent_map[id] = node.parents;
      child_map[id] = node.children;
    }
    return { parent_map, child_map } as Manifest;
  }

  static fromManifest(m: Manifest): TaskDag {
    const dag = new TaskDag();
    // Reconstruct nodes from manifest entries...
    // (Detailed implementation — build DagNode per entry with edges from maps)
    return dag;
  }

  private _recomputeRoots(): void {
    this.roots = [];
    for (const node of this.nodes.values()) {
      if (node.parents.length === 0) {
        this.roots.push(node);
      }
    }
  }
}
```

Populate `depended_on_by` edges during `addNode`: for each dep in
`node.depends_on`, add `node.id` to that dep's `depended_on_by`.

## Step 2 — `packages/core/src/dag/index.ts`

```ts
export { type DagNode, type DagNodeStatus } from './dag-node.js';
export { topologicalSort, detectCycle } from './topological-sort.js';
export { TaskDag } from './task-dag.js';
```

## Step 3 — Green

Run `pnpm --filter @openplaybooks/converge-core test -- task-dag` — all green.
Run `pnpm --filter @openplaybooks/converge-core typecheck` — no errors.

Refactor while green: clean up `_recomputeRoots`, optimize `getReady`
with an in-degree cache, improve error messages.
