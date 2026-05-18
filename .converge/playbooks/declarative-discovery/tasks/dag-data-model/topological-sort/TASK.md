---
id: topological-sort
title: Topological sort — Kahn's algorithm + cycle detection
description: |
  Implement topologicalSort() and detectCycle() under
  packages/core/src/dag/topological-sort.ts. Uses Kahn's algorithm:
  in-degree tracking, zero-in-degree queue, layer grouping.
  detectCycle() uses DFS coloring for clear cycle-path error messages.

inputs:
  - packages/core/src/dag/dag-node.ts

outputs:
  - packages/core/src/dag/topological-sort.ts
  - packages/core/tests/dag/topological-sort.test.ts

checks:
  - id: topological-sort-exists
    cmd: test -s packages/core/src/dag/topological-sort.ts
    description: Topological sort module exists.
  - id: tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- topological-sort
    description: Topological sort tests pass.
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

skills: []
references:
  - "packages/core/src/dag/dag-node.ts"

vars: {}
dependencies: []
children:
  - topological-sort-red
  - topological-sort-green
---

# 02 — Topological sort

Kahn's algorithm for deterministic topological ordering. Returns
layers — nodes in the same layer have no dependencies on each other
and can execute in parallel.

## API

```ts
export function topologicalSort(nodes: Map<string, DagNode>): DagNode[][];

export function detectCycle(nodes: Map<string, DagNode>): string[] | null;
```

- `topologicalSort` — returns layers (array of arrays). Layer 0 has no
  `depends_on`. Each subsequent layer depends only on nodes in earlier
  layers. Throws if a cycle is detected.
- `detectCycle` — returns the cycle path `[A, B, C, A]` if found,
  `null` if acyclic. DFS with white/gray/black coloring.

## Children

### red
Write `packages/core/tests/dag/topological-sort.test.ts`. Cover linear,
diamond, cycle, empty, single-node, disconnected sub-graphs, and
`detectCycle` for both cyclic and acyclic DAGs.

### green
Implement `packages/core/src/dag/topological-sort.ts`. Run tests green.
Refactor while green.

## Done when

All tests pass. Typecheck green.
