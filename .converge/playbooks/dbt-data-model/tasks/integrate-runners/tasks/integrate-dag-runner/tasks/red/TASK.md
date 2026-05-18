---
id: integrate-dag-runner-red
title: Red — integration tests for DAG runner with RunResultsManager
description: |
  Write tests that verify a full DAG execution writes correct run_results.json.
  Expected RED — dag-runner doesn't accept RunResultsManager yet.

inputs:
  - packages/core/src/dag/dag-runner.ts

outputs:
  - packages/core/tests/dag/dag-runner-with-results.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/dag/dag-runner-with-results.test.ts
    description: Test file exists.
  - id: tests-fail
    cmd: "! pnpm --filter @openplaybooks/converge-core test -- dag-runner-with-results 2>/dev/null"
    description: Tests fail (RED).

tags:
  - tdd
  - red
---

# Red — failing integration tests

Write `packages/core/tests/dag/dag-runner-with-results.test.ts`. Cover:

1. **Linear DAG**: A→B→C execution produces run_results with all three pass
2. **Failed node**: when B fails, A=pass, B=error, C=skipped
3. **Diamond DAG**: A→[B,C]→D — B and C in same layer, both must complete before D
4. **Attempt counting**: each node gets correct attempt numbers
5. **Duration tracking**: completed_at - started_at is plausible
6. **execution_id in metadata**: run_results.metadata.execution_id is set

Expected RED — dag-runner doesn't accept RunResultsManager parameter yet.
