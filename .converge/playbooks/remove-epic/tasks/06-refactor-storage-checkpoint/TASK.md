---
id: 06-refactor-storage-checkpoint
title: Refactor storage and checkpoint systems — epicId → playbookId
blocking: true
dependencies: [05-refactor-tree-and-dataflow]
---

Remove epicId from storage operations and checkpoint management.

**`packages/core/src/storage/filesystem.ts`:**
- Delete all epic operations: readEpicConfig, writeEpicConfig, readEpicStatus, writeEpicStatus, readEpicDeps, writeEpicDeps, appendEpicLog, listEpics
- Add playbook equivalents: readPlaybookConfig, writePlaybookConfig, readPlaybookStatus, writePlaybookStatus, readPlaybookDeps, writePlaybookDeps, appendPlaybookLog, listPlaybooks
- Change task operations from `(epicId, taskId)` to `(playbookId, taskId)` signatures
- Remove `epics` from init() directory creation, add `playbooks`

**`packages/core/src/checkpoint/manager.ts`:**
- Remove parseTaskId() that splits epicId/taskPath
- Remove epicId from all method signatures (markTaskCompleted, markTaskFailed, markTaskSeeded, removeFromCompleted, reconcileTask)
- Replace with playbookId where context is needed

**`packages/core/src/checkpoint/task-checkpoint.ts`:**
- Remove epicId from TaskCheckpoint interface
- Change TaskCheckpointManager constructor from `(projectDir, epicId, taskId)` to `(projectDir, playbookId, taskId)`

**`packages/core/src/checkpoint/unit-checkpoint.ts`:**
- Remove "epic" from unit type enum: `"project" | "epic" | "task"` → `"project" | "playbook" | "task"`
- Remove epicId parameter from constructor

**`packages/core/src/checkpoint/filesystem-status.ts`:**
- Remove epicId from all path construction

**`packages/core/src/checkpoint/migration.ts`:**
- Remove epic migration logic entirely (no backward compat)

**`packages/core/src/checkpoint/resumability.ts`:**
- Remove epicId references

**`packages/core/src/checkpoint/tree-utils.ts`:**
- Remove epicId references

**`packages/core/src/checkpoint/cleanup.ts`:**
- Remove epicId references
