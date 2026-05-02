---
id: commands-tree-green
title: Green — topological layer display
description: Switch tree display to topological layers.
outputs: packages/cli/src/commands-tree.ts (modified)
checks:
  - id: tests-pass
    cmd: pnpm --filter @converge cli test -- commands-tree
tags: [tdd, green]
---

# Green — DAG tree display

```ts
const { dag } = buildDagFromPlaybook(playbookDir, rootTasks);
const layers = dag.topologicalOrder();
layers.forEach((layer, i) => {
  console.log(`\nLayer ${i}:`);
  for (const node of layer) {
    const indent = '  '.repeat(node.parents.length);
    console.log(`${indent}${node.id} [${node.status}]`);
  }
});
```

Baseline test passes with the new display format.
