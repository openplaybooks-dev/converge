---
id: commands-list-green
title: Green — switch commands-list to dag.nodes
description: Replace tree walk with dag.nodes iteration. Baseline test passes.
inputs:
  - packages/cli/tests/commands-list.test.ts
outputs:
  - packages/cli/src/commands-list.ts (modified)
checks:
  - id: tests-pass
    cmd: pnpm --filter @converge cli test -- commands-list
  - id: typecheck-green
    cmd: pnpm --filter @converge cli typecheck
tags: [tdd, green]
---

# Green — commands-list DAG path

```ts
const { dag } = buildDagFromPlaybook(playbookDir, rootTasks);
let nodes = [...dag.nodes.values()];
// Apply --select filter against nodes
// Output node id, title, status
```

Baseline test must still produce same output.
