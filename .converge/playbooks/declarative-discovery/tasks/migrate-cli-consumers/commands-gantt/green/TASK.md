---
id: commands-gantt-green
title: Green — DAG gantt display
outputs: packages/cli/src/commands-gantt.ts (modified)
checks:
  - id: tests-pass
    cmd: pnpm --filter @converge cli test -- commands-gantt
tags: [tdd, green]
---

# Green — DAG gantt

Replace tree traversal with `dag.topologicalOrder()`. Each node
displayed with its layer, status, and depends_on edges.
