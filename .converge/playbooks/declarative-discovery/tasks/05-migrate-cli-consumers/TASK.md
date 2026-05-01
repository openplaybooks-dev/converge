---
title: Replace TaskTree with TaskDag in every CLI command and core consumer; one commit per consumer
description: |
  Replace TaskTree with TaskDag in every consumer identified in phase 01's
  REFS.md. One commit per consumer — both APIs coexist during this phase.
  TaskTree and the tree/ directory still exist but are unreferenced by
  the end of this phase. After this phase, only phase 06's deletion
  remains.

  Consumers to migrate (in order):
    1. commands-run.ts — switch from TaskTree to TaskDag+runDag
    2. next-task.ts — replace buildTaskTree/getTaskStates with DAG queries
    3. commands-tree.ts — topological order display
    4. commands-gantt.ts — DAG node listing
    5. commands-graph.ts — dag.toManifest()
    6. commands-inspect.ts — dag.nodes.values()
    7. autonomous-run.ts — runDag() instead of TaskTree loop
    8. converge-runner.ts — DagRunner in wave loop
    9. reconcile.ts — DAG-based reconciliation
    10. tree-display.ts — rewrite as DAG layer display

inputs:
  - .converge/playbooks/declarative-discovery/REFS.md
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/dag/dag-runner.ts
  - packages/core/src/task/tree (to be replaced)

outputs:
  - packages/cli/src/commands-run.ts
  - packages/cli/src/next-task.ts
  - packages/cli/src/commands-tree.ts
  - packages/cli/src/commands-gantt.ts
  - packages/cli/src/commands-graph.ts
  - packages/cli/src/commands-inspect.ts
  - packages/cli/src/autonomous-run.ts
  - packages/cli/src/reconcile.ts
  - packages/cli/src/tree-display.ts
  - packages/core/src/converge/converge-runner.ts
  - packages/cli/tests (updated)

checks:
  - id: typecheck-green
    cmd: pnpm -r typecheck
    description: All packages typecheck after each consumer migration.
  - id: tests-green
    cmd: pnpm -r test
    description: All tests pass.
  - id: built-cli-exists
    cmd: test -x packages/cli/dist/index.js
    description: CLI builds end-to-end.
  - id: commands-run-uses-dag
    cmd: grep -q 'runDag\|TaskDag' packages/cli/dist/commands-run.js
    description: commands-run uses the DAG runner.
  - id: next-task-uses-dag
    cmd: grep -q 'TaskDag\|dag.nodes' packages/cli/dist/next-task.js
    description: next-task uses TaskDag instead of TaskTree.
  - id: tree-display-shows-dag
    cmd: grep -q 'topological\|DagNode\|getReady' packages/cli/dist/tree-display.js
    description: tree-display renders DAG layers.
  - id: converge-runner-uses-dag
    cmd: grep -q 'runDag\|TaskDag' packages/core/dist/converge/converge-runner.js
    description: converge-runner uses the DAG runner.
  - id: autonomous-run-uses-dag
    cmd: grep -q 'runDag\|TaskDag' packages/cli/dist/autonomous-run.js
    description: autonomous-run uses the DAG runner.
  - id: all-commands-functional
    cmd: |
      node packages/cli/dist/index.js tree 2>&1 | head -5
      node packages/cli/dist/index.js gantt 2>&1 | head -5
      node packages/cli/dist/index.js graph 2>&1 | head -5
    description: tree, gantt, and graph commands produce output without crashing.

skills: []
references:
  - ".converge/playbooks/declarative-discovery/REFS.md"

vars: {}
dependencies:
  - 04-migrate-playbooks
---

# 05 — Migrate CLI consumers from TaskTree to TaskDag

Replace `TaskTree` with `TaskDag` in every consumer. One commit per
consumer. Both APIs coexist — TaskTree still exists but is unreferenced
by the end of this phase.

## Migration order (by dependency graph)

### 1. `commands-run.ts`
Switch from `TaskTree.load()` + tree-walk to `buildDagFromPlaybook()` +
`runDag()`. This is the primary execution path.

### 2. `next-task.ts` (largest — ~1800 lines)
Replace `buildTaskTree()` with `buildDagFromPlaybook()`.
Replace `getTaskStates()` with DAG queries:
- `completed` → nodes with status 'complete'
- `failed` → nodes with status 'failed'
- `blocked` → nodes whose `depends_on` include a failed blocking node
- `wbsProgress` → DAG nodes with children

### 3. `commands-tree.ts`
Replace `TaskTree.load()` + `printTaskTree()` with topological order
display. Each layer is a tree level.

### 4. `commands-gantt.ts`
Replace tree traversal with `dag.topologicalOrder()` listing.

### 5. `commands-graph.ts`
Replace `TaskTree.load()` with `dag.toManifest()` serialization.

### 6. `commands-inspect.ts`
Replace `walkTaskTree()` with `dag.nodes.values()` iteration.

### 7. `autonomous-run.ts`
Replace `TaskTree.load()` + snap-execute loop with `runDag()`.

### 8. `converge-runner.ts`
Replace `TaskTree.load()` in wave loop with DagRunner.

### 9. `reconcile.ts`
Replace `buildTaskTree()` with DAG-based reconciliation.

### 10. `tree-display.ts`
Rewrite `printTaskTree()` as `printDag()` showing topological layers.

## Backward compatibility

Each consumer change keeps the old code path behind a check — if the
playbook doesn't have `children:` declarations yet (pre-phase-04), fall
back to TaskTree. This gate is removed in phase 06.

## Done when

All checks pass. Every CLI command functions. TaskTree is unreferenced
but still exists on disk (deleted in phase 06).
