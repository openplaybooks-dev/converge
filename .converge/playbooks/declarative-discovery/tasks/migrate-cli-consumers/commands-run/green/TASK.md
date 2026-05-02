---
id: commands-run-green
title: Green — switch commands-run to executeDag()
description: |
  Add DAG execution path to commands-run.ts. When the playbook is
  declarative (has children: declarations in its TASK.md files), use
  executeDag(). Otherwise fall back to the tree path.

inputs:
  - packages/cli/tests/commands-run.test.ts
  - packages/core/src/dag/dag-runner.ts
  - packages/core/src/config/declarative-loader.ts

outputs:
  - packages/cli/src/commands-run.ts (modified)

checks:
  - id: tests-pass
    cmd: pnpm --filter @converge cli test -- commands-run
    description: Tests pass with DAG path (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @converge cli typecheck
    description: CLI typechecks.

tags:
  - tdd
  - green
---

# Green — DAG path in commands-run

In `packages/cli/src/commands-run.ts`, add after the existing logic:

```ts
import { buildDagFromPlaybook } from '@converge/core/config/declarative-loader.js';
import { executeDag } from '@converge/core/dag/dag-runner.js';

export async function runCommand(opts: RunOptions): Promise<void> {
  // Check if playbook is declarative
  const playbookDir = resolve(opts.projectDir, '.converge/playbooks', opts.playbook);
  const { dag, errors } = buildDagFromPlaybook(playbookDir, opts.rootTasks ?? []);

  if (errors.length === 0 && dag.nodes.size > 0) {
    // DAG path — playbook has declarations
    const result = await executeDag(dag, {
      projectDir: opts.projectDir,
      maxTaskAttempts: opts.maxTaskAttempts ?? 3,
      executeTask: async (node, projectDir) => {
        await runTask(node, projectDir, opts);
      },
      spawnChildren: opts.seeds ? async (node, projectDir) => {
        return spawnFromSeed(node, projectDir);
      } : undefined,
    });

    if (!result.success) {
      console.error(`Failed tasks: ${result.failed.join(', ')}`);
      process.exitCode = 1;
    }
    console.log(`Completed: ${result.completed.length}, Failed: ${result.failed.length}`);
    return;
  }

  // Fallback: tree-based path (existing code)
  // ...
}
```

Run baseline test — must still pass. Run full test suite — no
regressions. Typecheck green.
