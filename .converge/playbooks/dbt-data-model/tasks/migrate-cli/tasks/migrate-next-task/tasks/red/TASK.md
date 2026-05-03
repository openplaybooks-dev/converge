---
id: migrate-next-task-red
title: Red — next-task still uses FilesystemTaskStatus
description: |
  Verify next-task.ts imports FilesystemTaskStatus. Expected RED —
  not yet migrated.

inputs:
  - packages/cli/src/next-task.ts

outputs: []

checks:
  - id: imports-filesystem-status
    cmd: grep -q 'FilesystemTaskStatus' packages/cli/src/next-task.ts
    description: Importing FilesystemTaskStatus (pre-migration).

tags:
  - tdd
  - red
---

# Red — pre-migration baseline
