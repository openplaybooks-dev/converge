---
id: integrate-task-runner-red
title: Red — baseline tests capture checkpoint behavior
description: |
  Write baseline tests that capture current task-runner checkpoint behavior.
  Expected RED when checkpoint imports break.

inputs:
  - packages/core/src/task/lifecycle/task-runner.ts

outputs: []

checks:
  - id: checkpoint-imports-exist
    cmd: grep -q 'CheckpointManager' packages/core/src/task/lifecycle/task-runner.ts
    description: CheckpointManager is still imported (pre-migration).
  - id: unit-checkpoint-imports-exist
    cmd: grep -q 'UnitCheckpointManager' packages/core/src/task/lifecycle/task-runner.ts
    description: UnitCheckpointManager is still imported (pre-migration).

tags:
  - tdd
  - red
---

# Red — pre-migration baseline

Verify current state:
- `task-runner.ts` imports CheckpointManager
- `task-runner.ts` imports UnitCheckpointManager
- `task-runner.ts` imports TaskCheckpointManager

These assertions confirm the RED baseline before migration.
