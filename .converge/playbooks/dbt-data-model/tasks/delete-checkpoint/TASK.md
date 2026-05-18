---
id: delete-checkpoint
title: "Delete all old checkpoint infrastructure — inverted red-green"
description: |
  Inverted red-green: write tombstone tests asserting files DON'T exist
  (RED because they still do), then delete them (GREEN). Delete:
  CheckpointManager, FilesystemTaskStatus, UnitCheckpointManager,
  TaskCheckpointManager. Prune checkpoint/index.ts to keep only
  atomic-write.ts. Zero references to deleted modules.

inputs:
  - packages/core/src/checkpoint/index.ts

outputs:
  - packages/core/src/checkpoint/manager.ts (deleted)
  - packages/core/src/checkpoint/filesystem-status.ts (deleted)
  - packages/core/src/checkpoint/unit-checkpoint.ts (deleted)
  - packages/core/src/checkpoint/task-checkpoint.ts (deleted)
  - packages/core/src/checkpoint/index.ts (modified — keep atomic-write only)

checks:
  - id: no-checkpoint-manager
    cmd: "! test -f packages/core/src/checkpoint/manager.ts"
    description: CheckpointManager is deleted.
  - id: no-filesystem-status
    cmd: "! test -f packages/core/src/checkpoint/filesystem-status.ts"
    description: FilesystemTaskStatus is deleted.
  - id: no-unit-checkpoint
    cmd: "! test -f packages/core/src/checkpoint/unit-checkpoint.ts"
    description: UnitCheckpointManager is deleted.
  - id: no-checkpoint-imports
    cmd: "! grep -rln 'CheckpointManager\\|FilesystemTaskStatus\\|UnitCheckpointManager\\|TaskCheckpointManager' packages/ 2>/dev/null"
    description: Zero references to deleted modules.
  - id: atomic-write-survives
    cmd: test -f packages/core/src/checkpoint/atomic-write.ts
    description: Atomic write utility survives.
  - id: tombstone-tests-green
    cmd: pnpm --filter @openplaybooks/converge-core test -- checkpoint-deleted
    description: Tombstone tests pass (GREEN — files are gone).

skills: []
references:
  - "packages/core/src/checkpoint/"

vars: {}
dependencies: []
children:
  - tombstone-tests
  - delete-checkpoint-files
  - prune-checkpoint-index
---

# 05 — Delete checkpoint infrastructure

**Inverted red-green**: Write tests asserting files DON'T exist. RED because
they still do. Then delete them. GREEN.

## Children

### tombstone-tests
Red-green (inverted): Write tests asserting manager.ts, filesystem-status.ts,
unit-checkpoint.ts, task-checkpoint.ts do NOT exist. RED — they still exist.
GREEN — delete them and tests pass.

### delete-checkpoint-files
Delete the four checkpoint files. No code changes — just `rm`.

### prune-checkpoint-index
Update checkpoint/index.ts to export only atomic-write.ts.
Remove all deleted module exports.
