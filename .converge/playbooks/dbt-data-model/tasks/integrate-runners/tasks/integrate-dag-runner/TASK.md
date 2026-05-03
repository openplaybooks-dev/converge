---
id: integrate-dag-runner
title: Wire RunResultsManager into dag-runner.ts
description: |
  Update executeDag() to accept RunResultsManager. At each lifecycle point,
  call the manager. Propagate skips to downstream nodes when a node fails.
  Replace DagNodeStatus-based state tracking with RunResultsManager queries.

inputs:
  - packages/core/src/dag/dag-runner.ts
  - packages/core/src/manifest/run-results-manager.ts

outputs:
  - packages/core/src/dag/dag-runner.ts (modified)
  - packages/core/tests/dag/dag-runner-with-results.test.ts (new)

checks:
  - id: runner-uses-manager
    cmd: grep -q 'RunResultsManager' packages/core/src/dag/dag-runner.ts
    description: dag-runner.ts uses RunResultsManager.
  - id: tests-pass
    cmd: pnpm --filter @converge/core test -- dag-runner
    description: DAG runner tests pass with RunResultsManager.

skills: []
references:
  - "packages/core/src/dag/dag-runner.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 02 — Integrate dag-runner

## Children

### red
Write integration tests: full DAG execution produces correct run_results.json.
Verify pending→running→complete lifecycle, skipped propagation, attempt
counting. Expected RED — runner doesn't use RunResultsManager yet.

### green
Update `DagRunnerOpts` to include `runResults: RunResultsManager`.
In the execution loop:
- Before executing: `await runResults.markRunning(node.id)` → gets attempt #
- After success: `await runResults.markComplete(node.id, duration)`
- After failure: `await runResults.markFailed(node.id, error.message, duration)`
- After failure, find downstream nodes and `await runResults.markSkipped(id)` for each
- Replace `node.status` reads with `await runResults.isComplete(id)` / `isLocked(id)`
- Remove `dag.markComplete()` / `dag.markFailed()` calls (state is in run_results now)
