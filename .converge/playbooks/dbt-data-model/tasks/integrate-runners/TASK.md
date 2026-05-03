---
id: integrate-runners
title: "Replace checkpoint calls with RunResultsManager in all runners; generate context.json"
description: |
  Wire RunResultsManager into dag-runner.ts, task-runner.ts, and
  seed-executor.ts. Create context-generator.ts to generate per-task
  context.json from manifest at execution start. Update journal paths
  to flat execution-scoped structure. Update ancillary modules
  (ancestor-propagation, loop-detector, result-snapshot).

inputs:
  - packages/core/src/dag/dag-runner.ts
  - packages/core/src/task/lifecycle/task-runner.ts
  - packages/core/src/executor/seed-executor.ts
  - packages/core/src/manifest/run-results-manager.ts

outputs:
  - packages/core/src/manifest/context-generator.ts (new)
  - packages/core/src/dag/dag-runner.ts (modified)
  - packages/core/src/task/lifecycle/task-runner.ts (modified)
  - packages/core/src/executor/seed-executor.ts (modified)

checks:
  - id: context-generator-exists
    cmd: test -s packages/core/src/manifest/context-generator.ts
    description: Context generator module exists.
  - id: dag-runner-integrated
    cmd: grep -q 'RunResultsManager' packages/core/src/dag/dag-runner.ts
    description: dag-runner.ts uses RunResultsManager.
  - id: task-runner-integrated
    cmd: grep -q 'RunResultsManager' packages/core/src/task/lifecycle/task-runner.ts
    description: task-runner.ts uses RunResultsManager.
  - id: tests-green
    cmd: (cd packages/core && npx vitest run tests/dag tests/unit/manifest)
    description: Dag and manifest tests pass.

skills: []
references:
  - "packages/core/src/manifest/run-results-manager.ts"
  - "packages/core/src/dag/dag-runner.ts"

vars: {}
dependencies: []
children:
  - context-generator
  - integrate-dag-runner
  - integrate-task-runner
  - integrate-seed-executor
---

# 03 — Integrate into runners

This phase is the core behavioral change. All checkpoint writes become
RunResultsManager calls. All task artifacts move to execution-scoped paths.
context.json is generated for each task at execution start.

## Children

### context-generator
Red-green: Create module that generates per-task context.json from manifest.
Each context.json contains: id, parents, children, depends_on, depended_on_by,
siblings, path. Written to execution/{id}/tasks/{taskId}/context.json.

### integrate-dag-runner
Red-green: Wire RunResultsManager into executeDag(). At each lifecycle point
(markRunning, markComplete, markFailed), call the manager. Propagate skips
to downstream nodes when a node fails.

### integrate-task-runner
Red-green: Replace CheckpointManager/UnitCheckpointManager/TaskCheckpointManager
with RunResultsManager in task-runner.ts. Journal paths become execution-scoped.

### integrate-seed-executor
Red-green: Spawn paths use execution-scoped directories. Remove all
checkpoint.json writes from spawn flow. Dynamic nodes added to run_results.
