---
id: integrate-task-runner-green
title: Green — replace all checkpoint calls in task-runner.ts
description: |
  Replace all checkpoint references with RunResultsManager. Update journal
  paths to execution-scoped. Tests pass. Typecheck green.

inputs:
  - packages/core/src/task/lifecycle/task-runner.ts

outputs:
  - packages/core/src/task/lifecycle/task-runner.ts (modified)

checks:
  - id: no-checkpoint-imports
    cmd: "! grep -q 'CheckpointManager\\|UnitCheckpointManager\\|TaskCheckpointManager' packages/core/src/task/lifecycle/task-runner.ts"
    description: No checkpoint imports in task-runner.ts.
  - id: uses-run-results
    cmd: grep -q 'RunResultsManager' packages/core/src/task/lifecycle/task-runner.ts
    description: task-runner.ts uses RunResultsManager.
  - id: typecheck-green
    cmd: pnpm --filter @converge/core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — migrate task-runner to RunResultsManager

## Step 1: Replace imports

Remove:
```ts
import { CheckpointManager } from "../../checkpoint/manager.js";
import { UnitCheckpointManager } from "../../checkpoint/unit-checkpoint.js";
import { TaskCheckpointManager } from "../../checkpoint/task-checkpoint.js";
```

Add:
```ts
import { RunResultsManager } from "../../manifest/run-results-manager.js";
```

## Step 2: Replace state mutation calls

| Old | New |
|-----|-----|
| `checkpointMgr.markTaskCompleted(id)` | `runResults.markComplete(id, durationMs)` |
| `checkpointMgr.markTaskFailed(id)` | `runResults.markFailed(id, error, durationMs)` |
| `checkpointMgr.incrementTaskAttempt(id)` | `runResults.incrementAttempt(id)` |
| `unitCheckpoint.startAttempt(n)` | `runResults.markRunning(id)` |
| `unitCheckpoint.completeAttempt(n, outcome, startedAt)` | `runResults.markComplete(id, duration)` |
| `checkpointMgr.isTaskLocked(id)` | `runResults.isLocked(id)` |
| `checkpointMgr.getTaskAttemptCount(id)` | `runResults.getAttemptCount(id)` |

## Step 3: Update journal paths

Task execution context now writes to:
`executions/{executionId}/tasks/{taskId}/` (flat, execution-scoped)

Not to:
`journal/{playbook}/tasks/{taskId}/` (persistent, cross-execution)

## Step 4: Pass RunResultsManager through

`executeTask()` needs `runResults` and `executionId` parameters.
`TaskExecutionContext` gets `runResults: RunResultsManager`.
