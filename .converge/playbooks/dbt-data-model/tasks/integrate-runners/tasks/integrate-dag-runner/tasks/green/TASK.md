---
id: integrate-dag-runner-green
title: Green — wire RunResultsManager into executeDag()
description: |
  Update dag-runner.ts to use RunResultsManager. Tests pass. Typecheck green.

inputs:
  - packages/core/tests/dag/dag-runner-with-results.test.ts

outputs:
  - packages/core/src/dag/dag-runner.ts (modified)

checks:
  - id: tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- dag-runner
    description: All DAG runner tests pass (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — integrate RunResultsManager into dag-runner

Update `packages/core/src/dag/dag-runner.ts`:

```ts
import { RunResultsManager } from "../manifest/run-results-manager.js";

export interface DagRunnerOpts {
  dag: TaskDag;
  runResults: RunResultsManager;
  // ... existing opts
}

export async function executeDag(opts: DagRunnerOpts): Promise<RunResults> {
  const { dag, runResults } = opts;

  while (true) {
    const ready = dag.getReady();
    if (ready.length === 0) break;

    for (const node of ready) {
      const attemptNum = await runResults.markRunning(node.id);
      const startedAt = Date.now();

      try {
        // ... execute the node (existing logic)
        const duration = Date.now() - startedAt;
        await runResults.markComplete(node.id, duration);
      } catch (error) {
        const duration = Date.now() - startedAt;
        await runResults.markFailed(
          node.id,
          (error as Error).message,
          duration,
        );
        // Skip all downstream nodes
        const downstream = dag.getDownstream(node.id);
        for (const ds of downstream) {
          await runResults.markSkipped(ds.id);
        }
      }
    }
  }

  return runResults.getResultsSnapshot();
}
```

Key changes:
- `DagRunnerOpts` gets `runResults: RunResultsManager`
- Use `runResults.isLocked(id)` instead of `node.status === 'complete'` checks
- Remove calls to `dag.markComplete()` / `dag.markFailed()` — state lives in run_results
- `executeDag()` returns `RunResults` for the caller
