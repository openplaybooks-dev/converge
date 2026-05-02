---
id: commands-inspect-green
title: Green — DAG inspect
outputs: packages/cli/src/commands-inspect.ts (modified)
checks:
  - id: tests-pass
    cmd: pnpm --filter @converge cli test -- commands-inspect
tags: [tdd, green]
---

# Green — DAG inspect

```ts
const { dag } = buildDagFromPlaybook(playbookDir, rootTasks);
const node = dag.nodes.get(taskId);
if (!node) { console.error('Task not found'); process.exit(1); }
// Display: id, title, description, status, parents, children,
// depends_on, path, virtual
console.log(JSON.stringify(node, null, 2));
```
