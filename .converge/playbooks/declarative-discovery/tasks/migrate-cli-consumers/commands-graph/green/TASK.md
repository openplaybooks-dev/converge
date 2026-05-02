---
id: commands-graph-green
title: Green — DAG graph serialization
outputs: packages/cli/src/commands-graph.ts (modified)
checks:
  - id: tests-pass
    cmd: pnpm --filter @converge cli test -- commands-graph
tags: [tdd, green]
---

# Green — DAG graph

```ts
const { dag } = buildDagFromPlaybook(playbookDir, rootTasks);
const manifest = dag.toManifest();
// Output in DOT or JSON format
console.log(JSON.stringify(manifest, null, 2));
```
