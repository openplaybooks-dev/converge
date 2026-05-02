---
id: executor-red
title: Red — failing tests for executeDag()
description: |
  Write unit tests for the DAG runner. Mock task execution to track
  call order and verify topological execution. Run them. Confirm RED
  — dag-runner.ts doesn't exist yet.

outputs:
  - packages/core/tests/dag/dag-runner.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/dag/dag-runner.test.ts
    description: Test file exists.
  - id: tests-fail
    cmd: "! pnpm --filter @converge core test -- dag-runner 2>/dev/null"
    description: Tests fail (RED) — module doesn't exist.
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(|assert' packages/core/tests/dag/dag-runner.test.ts | awk '$1+0 < 8 { exit 1 }'
    description: At least 8 assertions.

tags:
  - tdd
  - red
---

# Red — failing tests for DAG runner

Write `packages/core/tests/dag/dag-runner.test.ts`.

## Test helper

```ts
function makeDag(edges: [string, string[]][]): TaskDag {
  const dag = new TaskDag();
  for (const [id, children] of edges) {
    dag.addNode({
      id, parents: [], children,
      depends_on: [], depended_on_by: [],
      taskDef: { id, title: id, description: '', body: '', checks: [] } as TaskDefinition,
      path: `/tasks/${id}/TASK.md`,
      status: 'pending', virtual: false,
    });
  }
  // Wire parents from children edges
  for (const node of dag.nodes.values()) {
    for (const childId of node.children) {
      const child = dag.nodes.get(childId);
      if (child && !child.parents.includes(node.id)) {
        child.parents.push(node.id);
      }
    }
  }
  return dag;
}

// Mock execute function that records call order
function mockExecute(): { execute: (id: string) => Promise<void>; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    execute: async (id: string) => { calls.push(id); },
  };
}
```

## Test scenarios

1. **Linear A→B→C**: A executes before B, B before C. `calls` is
   `['A', 'B', 'C']` or equivalent valid topological order.

2. **Diamond A→[B,C]→D**: A executes first, B and C execute after A
   (order between B and C unspecified), D executes last (after both
   B and C).

3. **Single node**: one-node DAG executes and completes.
   `result.completed` contains the node id.

4. **Empty DAG**: returns `{ success: true, completed: [], failed: [] }`.

5. **Failed blocking task**: A fails. B (depends_on [A]) is never
   executed. `result.failed` contains A. `calls` does not contain B.

6. **Failed non-blocking**: A fails, but B and C (both depend on A
   but are siblings, not downstream in children chain) — actually this
   depends on semantics. For now, test that a failed task's downstream
   in `depends_on` are not executed.

7. **Resume from checkpoint**: three nodes A→B→C. Mark A and B as
   already complete (status='complete'). Runner starts from C.

8. **Results returned**: completed and failed arrays contain the
   correct ids after execution.

Run `pnpm --filter @converge core test -- dag-runner` — fails (RED).
