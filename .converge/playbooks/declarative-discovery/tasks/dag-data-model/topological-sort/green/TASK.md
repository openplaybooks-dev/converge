---
id: topological-sort-green
title: Green — implement topological sort (Kahn's algorithm)
description: |
  Implement packages/core/src/dag/topological-sort.ts. Run tests until
  green. Refactor while green.

inputs:
  - packages/core/tests/dag/topological-sort.test.ts
  - packages/core/src/dag/dag-node.ts

outputs:
  - packages/core/src/dag/topological-sort.ts

checks:
  - id: topological-sort-exists
    cmd: test -s packages/core/src/dag/topological-sort.ts
    description: Module exists.
  - id: tests-pass
    cmd: pnpm --filter @converge/core test -- topological-sort
    description: All topological sort tests pass (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @converge/core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — implement topological sort

Create `packages/core/src/dag/topological-sort.ts`.

## topologicalSort — Kahn's algorithm

```ts
export function topologicalSort(nodes: Map<string, DagNode>): DagNode[][] {
  // 1. Compute in-degree for each node (count of depends_on edges)
  // 2. Queue nodes with in-degree 0
  // 3. While queue not empty:
  //    a. Dequeue all in current layer
  //    b. For each, decrement in-degree of nodes that depend on it
  //    c. If a node's in-degree reaches 0, enqueue for next layer
  // 4. If processed count < total nodes, cycle exists → throw
  // 5. Return layers
}
```

- Build reverse index: `depended_on_by` for each node
- In-degree = number of unsatisfied `depends_on` edges
- Layer grouping: all nodes that become ready in the same iteration
  form a layer
- Cycle detection: if not all nodes are processed, compute the
  remaining sub-graph and call `detectCycle` for the error message

## detectCycle — DFS coloring

```ts
export function detectCycle(nodes: Map<string, DagNode>): string[] | null {
  // DFS with three colors:
  //   WHITE (0) — unvisited
  //   GRAY  (1) — in current recursion stack
  //   BLACK (2) — fully processed
  // If we reach a GRAY node, we found a cycle.
  // Trace back through parent pointers to build the cycle path.
}
```

## Refactor

After all tests pass:
- Extract shared in-degree computation if used by both functions
- Ensure error messages include node ids and the cycle path
- Verify O(V + E) complexity

Run `pnpm --filter @converge/core test -- topological-sort` — all green.
Run `pnpm --filter @converge/core typecheck` — no errors.
