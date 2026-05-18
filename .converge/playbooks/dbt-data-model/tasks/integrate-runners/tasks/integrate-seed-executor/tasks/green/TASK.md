---
id: integrate-seed-executor-green
title: Green — migrate seed-executor to execution-scoped paths
description: |
  Update seed-executor.ts. Remove checkpoint writes. Use execution-scoped
  task directories. Typecheck green.

inputs:
  - packages/core/src/executor/seed-executor.ts

outputs:
  - packages/core/src/executor/seed-executor.ts (modified)

checks:
  - id: no-checkpoint-imports
    cmd: "! grep -q 'CheckpointManager\\|UnitCheckpointManager' packages/core/src/executor/seed-executor.ts"
    description: No checkpoint imports.
  - id: uses-execution-paths
    cmd: grep -q 'getExecutionTaskDir' packages/core/src/executor/seed-executor.ts
    description: Uses execution-scoped paths.
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — migrate seed-executor

## Step 1: Spawn path resolution

```ts
// Before:
const taskDir = getJournalStructure(projectDir, epicId, childId).task;

// After:
const taskDir = getExecutionTaskDir(projectDir, executionId, childId);
```

## Step 2: Remove checkpoint writes

Remove:
- `UnitCheckpointManager` usage for spawned tasks
- `CheckpointManager.markTaskSeeded()` calls
- Any `checkpoint.json` file creation in spawn flow

Instead:
- Spawned nodes are already in run_results.json (initialized as `pending` from manifest)
- The DAG runner calls `markRunning()` / `markComplete()` when executing them
- No separate checkpoint file needed

## Step 3: Update ctx.spawn()

`SeedContext.spawn()` signature gains `executionId` parameter.
Task directories created under `executions/{executionId}/tasks/{childId}/`.
