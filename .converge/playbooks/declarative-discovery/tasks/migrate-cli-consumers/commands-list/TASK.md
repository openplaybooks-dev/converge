---
id: commands-list
title: commands-list.ts — replace tree walk with dag.nodes
description: |
  The list command currently walks the task tree to enumerate tasks.
  Replace with dag.nodes iteration. The --select DSL already works
  against the DAG — no changes needed there.

inputs:
  - packages/cli/src/commands-list.ts
  - packages/core/src/dag/task-dag.ts

outputs:
  - packages/cli/src/commands-list.ts (modified)

checks:
  - id: tests-pass
    cmd: pnpm --filter @openplaybooks/converge test -- commands-list
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge exec tsc --noEmit

dependencies: []
children:
  - commands-list-red
  - commands-list-green
---

# 02 — commands-list.ts

Replace `TaskTree.load()` tree walk with `buildDagFromPlaybook()` +
`dag.nodes` iteration. The `--select` filter applies against DAG
nodes the same way.

### red
Write baseline test: `converge list --playbook=minimal-playbook`
outputs expected task ids.

### green
Switch to DAG. Build dag, iterate `dag.nodes.values()`, apply
selector filter, output. Baseline test must pass.
