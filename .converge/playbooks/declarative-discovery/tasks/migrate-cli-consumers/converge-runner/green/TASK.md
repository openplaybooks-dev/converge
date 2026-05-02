---
id: converge-runner-green
title: Green — converge-runner via executeDag, no waves
outputs: packages/core/src/converge/converge-runner.ts (modified)
checks:
  - id: tests-pass
    cmd: pnpm --filter @converge core test -- converge-runner
tags: [tdd, green]
---

# Green — converge-runner DAG

```ts
export async function convergeRun(opts: ConvergeOptions) {
  const { dag } = buildDagFromPlaybook(opts.playbookDir, opts.rootTasks);

  // Single pass — no wave loop
  const result = await executeDag(dag, {
    projectDir: opts.projectDir,
    maxTaskAttempts: opts.maxTaskAttempts,
    executeTask: async (node) => { /* run task */ },
  });

  return {
    converged: result.failed.length === 0,
    completed: result.completed,
    failed: result.failed,
    // No waves, no scoring, no iterations
  };
}
```

NO waves. NO gap detection. NO scoring. Just executeDag().
