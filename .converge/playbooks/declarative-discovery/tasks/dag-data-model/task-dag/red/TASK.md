---
id: task-dag-red
title: Red — failing tests for TaskDag
description: |
  Write unit tests for the TaskDag class. Cover construction, node
  addition, readiness queries, mutations, topological ordering, and
  manifest round-trip. Run them. Confirm RED — task-dag.ts doesn't
  exist yet.

inputs:
  - packages/core/src/dag/dag-node.ts

outputs:
  - packages/core/tests/dag/task-dag.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/dag/task-dag.test.ts
    description: Test file exists and is non-empty.
  - id: tests-fail
    cmd: "! pnpm --filter @converge/core test -- task-dag 2>/dev/null"
    description: Tests fail (RED) — implementation does not exist.
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(|assert' packages/core/tests/dag/task-dag.test.ts | awk '$1+0 < 10 { exit 1 }'
    description: At least 10 assertions.

tags:
  - tdd
  - red
---

# Red — failing tests for TaskDag

Write `packages/core/tests/dag/task-dag.test.ts`.

## Helper

```ts
function makeNode(overrides: Partial<DagNode> = {}): DagNode {
  return {
    id: 'task-1',
    parents: [],
    children: [],
    depends_on: [],
    depended_on_by: [],
    taskDef: { id: 'task-1', title: 'Test', description: '', body: '', checks: [] } as TaskDefinition,
    path: '/tasks/task-1/TASK.md',
    status: 'pending',
    virtual: false,
    ...overrides,
  };
}
```

## Test scenarios

1. **Empty DAG**: `new TaskDag()` — `nodes` is empty Map, `roots` is
   empty array, `getReady()` returns `[]`.

2. **addNode**: add one node — `nodes.size === 1`, `nodes.get('task-1')`
   returns the node.

3. **Duplicate id throws**: adding a second node with the same id throws.

4. **Roots — no incoming children edges**: A has `parents: []`,
   B has `parents: ['A']`. `roots` contains only A.

5. **getReady — all deps satisfied**: A and B where B depends_on [A].
   Initially only A is ready (depends_on is empty). After
   `markComplete('A')`, B becomes ready.

6. **getReady — multiple deps**: C depends_on [A, B]. Only ready after
   both A and B are complete.

7. **markComplete**: changes status to `'complete'`, updates
   `depended_on_by` reverse edges.

8. **markFailed**: changes status to `'failed'`.

9. **getDownstream**: returns direct children (from `children:` edges).

10. **getUpstream**: returns direct parents.

11. **topologicalOrder**: delegates to topologicalSort. Linear 3-node
    DAG returns `[[A], [B], [C]]`.

12. **Multi-parent**: both A and B declare C as child. C.parents is
    `['A', 'B']`. Both `getDownstream('A')` and `getDownstream('B')`
    include C.

13. **toManifest**: produces an object with `parent_map` and `child_map`.

14. **fromManifest round-trip**: `TaskDag.fromManifest(dag.toManifest())`
    produces a DAG with the same node ids and edges.

Run `pnpm --filter @converge/core test -- task-dag` — import fails
because the file doesn't exist. RED confirmed.
