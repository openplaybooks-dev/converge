---
id: migrate-cli-consumers
title: Replace TaskTree with TaskDag in every CLI command and core consumer
description: |
  Replace TaskTree with TaskDag in every consumer identified in phase 01's
  REFS.md. One sub-task per consumer. Both APIs coexist during this phase.
  TaskTree and the tree/ directory still exist but are unreferenced by
  the end of this phase. After this phase, only phase 06's deletion
  remains.

  Consumers to migrate (in order):
    1. commands-run.ts — executeDag() instead of iteration loop
    2. commands-list.ts — dag.nodes instead of tree walk
    3. commands-tree.ts — topological layers display
    4. commands-gantt.ts — DAG node listing
    5. commands-graph.ts — dag.toManifest()
    6. commands-inspect.ts — dag.nodes.get(id)
    7. autonomous-run.ts — executeDag() wrapper, NO iteration loop
    8. converge-runner.ts — executeDag(), NO wave loop

inputs:
  - .converge/playbooks/declarative-discovery/REFS.md
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/dag/dag-runner.ts
  - packages/core/src/task/tree

outputs:
  - packages/cli/src/commands-run.ts
  - packages/cli/src/commands-list.ts
  - packages/cli/src/commands-tree.ts
  - packages/cli/src/commands-gantt.ts
  - packages/cli/src/commands-graph.ts
  - packages/cli/src/commands-inspect.ts
  - packages/cli/src/autonomous-run.ts
  - packages/core/src/converge/converge-runner.ts

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
  - migrate-playbooks
children:
  - autonomous-run
  - commands-gantt
  - commands-graph
  - commands-inspect
  - commands-list
  - commands-run
  - commands-tree
  - converge-runner
---

# 05 — Migrate CLI consumers from TaskTree to TaskDag

Replace `TaskTree` with `TaskDag` in every consumer. One sub-task per
consumer. Both APIs coexist — TaskTree still exists but is unreferenced
by the end.

## Migration pattern (all consumers)

Each consumer follows the same TDD pattern:

- **01-red**: Write a baseline test that captures the current behavior
  of the consumer using TaskTree. Assert specific outputs. The test
  may pass or fail depending on whether the DAG code path already
  exists — the point is to have a contract.
- **02-green**: Switch the consumer to use TaskDag/executeDag instead
  of TaskTree. The baseline test from 01-red must still pass. Keep
  the old code path behind a flag as a fallback (removed in phase 06).

## Done when

All consumers use TaskDag. All tests pass. Tree code unreferenced.
