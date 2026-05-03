---
id: tombstone-tests
title: Tombstone tests — assert deleted files don't exist (inverted red-green)
description: |
  Write tests that assert the four checkpoint files do NOT exist on disk.
  RED phase: tests fail because files still exist. GREEN phase: delete
  the files and tests pass.

inputs:
  - packages/core/src/checkpoint/manager.ts
  - packages/core/src/checkpoint/filesystem-status.ts
  - packages/core/src/checkpoint/unit-checkpoint.ts
  - packages/core/src/checkpoint/task-checkpoint.ts

outputs:
  - packages/core/tests/checkpoint/checkpoint-deleted.test.ts (new)

checks:
  - id: tombstone-test-exists
    cmd: test -s packages/core/tests/checkpoint/checkpoint-deleted.test.ts
    description: Tombstone test file exists.

skills: []
references:
  - "packages/core/src/checkpoint/"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 01 — Tombstone tests

## Children

### red (INVERTED)
Write tests asserting files DON'T exist. They still do → RED.

Test: `!existsSync('packages/core/src/checkpoint/manager.ts')` → returns false → test fails.
This is intentional — it proves the file still exists before we delete it.

### green (INVERTED)
Delete the files. Now tests pass because files genuinely don't exist.
GREEN confirms the deletion is complete.

## What tombstone tests cover

1. `manager.ts` does not exist
2. `filesystem-status.ts` does not exist
3. `unit-checkpoint.ts` does not exist
4. `task-checkpoint.ts` does not exist
5. `grep -r "CheckpointManager" packages/` returns zero hits
6. `grep -r "FilesystemTaskStatus" packages/` returns zero hits
