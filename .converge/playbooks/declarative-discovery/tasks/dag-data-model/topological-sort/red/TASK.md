---
id: topological-sort-red
title: Red — failing tests for topological sort
description: |
  Write unit tests for topologicalSort() and detectCycle(). Cover linear,
  diamond, cycle, empty, single-node, and disconnected graphs. Run them.
  Confirm RED — topological-sort.ts does not exist yet.

inputs:
  - packages/core/src/dag/dag-node.ts

outputs:
  - packages/core/tests/dag/topological-sort.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/dag/topological-sort.test.ts
    description: Test file exists and is non-empty.
  - id: tests-fail
    cmd: "! pnpm --filter @converge/core test -- topological-sort 2>/dev/null"
    description: Tests fail (RED) — implementation does not exist yet.
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(|assert' packages/core/tests/dag/topological-sort.test.ts | awk '$1+0 < 8 { exit 1 }'
    description: At least 8 assertions.

tags:
  - tdd
  - red
---

# Red — failing tests for topological sort

Write `packages/core/tests/dag/topological-sort.test.ts`.

## Helper

```ts
function makeNode(id: string, depends_on: string[] = []): DagNode {
  return {
    id,
    parents: [],
    children: [],
    depends_on,
    depended_on_by: [],
    taskDef: { id, title: id, description: '', body: '', checks: [] } as TaskDefinition,
    path: `/tasks/${id}/TASK.md`,
    status: 'pending',
    virtual: false,
  };
}
```

## Test scenarios

### topologicalSort

1. **Linear A→B→C**: A has no deps, B depends_on [A], C depends_on [B].
   Result: `[[A], [B], [C]]` — three layers.

2. **Diamond A→[B,C]→D**: A no deps, B depends_on [A], C depends_on [A],
   D depends_on [B, C]. Result: `[[A], [B, C], [D]]` — B and C in the
   same layer (order between them unspecified).

3. **Empty DAG**: empty map returns `[]`.

4. **Single node**: one node with no edges returns `[[node]]`.

5. **Disconnected**: A→B and C→D with no edge between the two sub-graphs.
   Both sub-graphs sort correctly; A and C may appear in layer 0.

6. **Multi-layer chain**: A→B→C→D→E produces 5 layers.

7. **Cycle throws**: A→B→C→A. `topologicalSort()` throws with a cycle
   error.

### detectCycle

8. **Acyclic returns null**: `detectCycle(diamondNodes)` returns `null`.

9. **Cycle returns path**: `detectCycle(cycleNodes)` returns `[A, B, C, A]`
   or equivalent cycle path.

10. **Self-loop**: A depends_on [A]. `detectCycle` catches it.

Run `pnpm --filter @converge/core test -- topological-sort` — fails
because the module doesn't exist. RED confirmed.
