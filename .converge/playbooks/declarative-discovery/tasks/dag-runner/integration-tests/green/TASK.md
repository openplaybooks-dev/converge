---
id: integration-tests-green
title: Green — wire DAG runner into CLI; make integration test pass
description: |
  Wire executeDag() into the CLI's run command. Use a temporary env var
  or code path to activate the DAG runner. This is a minimal integration
  — full consumer migration happens in phase 05.

inputs:
  - packages/cli/tests/integration/dag-runner.test.ts
  - packages/cli/src/commands-run.ts
  - packages/core/src/dag/dag-runner.ts
  - packages/core/src/config/declarative-loader.ts

outputs:
  - packages/cli/src/commands-run.ts (minimal DAG path)

checks:
  - id: integration-tests-pass
    cmd: pnpm --filter @converge cli test -- dag-runner
    description: Integration tests pass (GREEN).
  - id: existing-tests-pass
    cmd: pnpm --filter @converge cli test
    description: Existing CLI tests still pass.
  - id: typecheck-green
    cmd: pnpm --filter @converge cli typecheck
    description: CLI typechecks.

tags:
  - tdd
  - green
---

# Green — wire DAG runner into CLI

## Step 1 — Add DAG path to commands-run.ts

In `packages/cli/src/commands-run.ts`, add a conditional path:

```ts
import { buildDagFromPlaybook } from '@converge/core/config/declarative-loader.js';
import { executeDag } from '@converge/core/dag/dag-runner.js';

export async function runCommand(opts: RunOptions): Promise<void> {
  if (process.env.CONVERGE_USE_DAG === '1') {
    // DAG path
    const { dag } = buildDagFromPlaybook(
      opts.projectDir,
      opts.playbookRoots,
    );
    const result = await executeDag(dag, {
      projectDir: opts.projectDir,
      maxTaskAttempts: opts.maxTaskAttempts ?? 3,
      executeTask: async (node, projectDir) => {
        // Run the task's convergence logic
        await runTaskUnit(node, projectDir);
      },
    });
    if (!result.success) {
      process.exit(1);
    }
    return;
  }

  // Existing tree-based path unchanged
  // ...
}
```

## Step 2 — Verify integration test

```bash
CONVERGE_USE_DAG=1 pnpm --filter @converge cli test -- dag-runner
```

All assertions pass. Tasks execute in topological order. No iteration
or wave messages in output.

## Step 3 — Keep existing path

The tree-based code path stays unchanged. The DAG path is minimal —
just enough to prove the integration works. Phase 05 does the full
migration.

## Done when

Integration test green. CLI can run a playbook via DAG runner.
Existing tests unbroken.
