---
id: dynamic-spawn-red
title: Red — failing tests for dynamic spawn
description: |
  Write tests for virtual node materialization. Mock the
  child-synthesizer to return known children. Run them. RED.

outputs:
  - packages/core/tests/dag/dag-runner-spawn.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/dag/dag-runner-spawn.test.ts
    description: Test file exists.
  - id: tests-fail
    cmd: "! pnpm --filter @converge/core test -- dag-runner-spawn 2>/dev/null"
    description: Tests fail (RED).

tags:
  - tdd
  - red
---

# Red — failing tests for dynamic spawn

Write `packages/core/tests/dag/dag-runner-spawn.test.ts`.

## Test scenarios

1. **Virtual node materializes**: Parent A has `from_seed: 'tokens'`.
   On completion, child-synthesizer produces children [B, C]. B and C
   are added to the DAG and executed after A. Verify they appear in
   `result.completed`.

2. **Virtual node replaced by concrete**: The virtual node (`.virtual:
   true`) is replaced with a concrete DagNode with a real taskDef
   after the spawner runs.

3. **Spawned children respect depends_on**: B and C both have
   `depends_on: [A]` — they don't execute until A completes.

4. **Multi-generation spawn**: A spawns B; B itself has `from_seed:`
   and spawns C when B completes. C executes after B.

5. **Path override from seed entry**: A seed entry specifies a custom
   path for the spawned child. The resulting DagNode has the custom
   path.

6. **Empty spawn**: from_seed produces no children (seed returns
   empty). No new nodes added. No errors.

7. **Spawned children appear in topological order**: After spawn,
   `dag.topologicalOrder()` includes the new nodes in correct layers.

Run `pnpm --filter @converge core test -- dag-runner-spawn` — RED.
