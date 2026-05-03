---
id: autonomous-run-green
title: Green — executeDag() wrapper
outputs: packages/cli/src/autonomous-run.ts
checks:
  - id: tests-pass
    cmd: pnpm --filter @converge/cli test
tags: [tdd, green]
---

# Green — autonomous-run via executeDag

```ts
export async function autonomousRun(opts: AutonomousRunOptions) {
  const { dag } = buildDagFromPlaybook(opts.playbookDir, opts.rootTasks);

  // Mark already-complete nodes from checkpoint
  const checkpoint = loadCheckpoint(opts.playbookDir);
  for (const [id, status] of Object.entries(checkpoint)) {
    const node = dag.nodes.get(id);
    if (node && status === 'complete') {
      dag.markComplete(id);
      node.status = 'complete';
    }
  }

  // Single pass — no iteration loop
  return executeDag(dag, {
    projectDir: opts.projectDir,
    maxTaskAttempts: opts.maxTaskAttempts,
    executeTask: async (node) => { /* run task */ },
  });
}
```

NO loop. NO iteration. NO waves. Just executeDag().
