---
id: integrate-task-runner
title: Replace checkpoint calls with RunResultsManager in task-runner.ts
description: |
  Replace all CheckpointManager/UnitCheckpointManager/TaskCheckpointManager
  references in task-runner.ts with RunResultsManager. Journal paths become
  execution-scoped. Remove checkpoint.json writes from task execution flow.

inputs:
  - packages/core/src/task/lifecycle/task-runner.ts
  - packages/core/src/checkpoint/manager.ts
  - packages/core/src/checkpoint/unit-checkpoint.ts
  - packages/core/src/checkpoint/task-checkpoint.ts

outputs:
  - packages/core/src/task/lifecycle/task-runner.ts (modified)

checks:
  - id: no-checkpoint-imports
    cmd: "! grep -q 'CheckpointManager\\|UnitCheckpointManager\\|TaskCheckpointManager' packages/core/src/task/lifecycle/task-runner.ts"
    description: No checkpoint imports in task-runner.ts.
  - id: uses-run-results
    cmd: grep -q 'RunResultsManager' packages/core/src/task/lifecycle/task-runner.ts
    description: task-runner.ts uses RunResultsManager.

skills: []
references:
  - "packages/core/src/task/lifecycle/task-runner.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 03 — Integrate task-runner

## Children

### red
Baseline tests: capture current task execution behavior (checkpoint writes,
attempt tracking, status transitions). Expected RED when run against new
code path (checkpoint imports broken).

### green
Replace all checkpoint references in task-runner.ts:
- `checkpointMgr.markTaskCompleted(id)` → `runResults.markComplete(id, duration)`
- `checkpointMgr.markTaskFailed(id)` → `runResults.markFailed(id, error, duration)`
- `checkpointMgr.incrementTaskAttempt(id)` → `runResults.incrementAttempt(id)`
- `unitCheckpoint.startAttempt(n)` → `runResults.markRunning(id)`
- `unitCheckpoint.completeAttempt(n, outcome, startedAt)` → `runResults.markComplete(id, duration)` or `markFailed(id, ...)`
- `checkpointMgr.isTaskLocked(id)` → `runResults.isLocked(id)`
- `checkpointMgr.getTaskAttemptCount(id)` → `runResults.getAttemptCount(id)`

Task execution context (logs, LEARN.md, NEEDS.md) goes to:
`executions/{executionId}/tasks/{taskId}/` instead of `journal/{playbook}/tasks/{taskId}/`
