---
id: migrate-autonomous-run-red
title: Red — autonomous-run still uses checkpoint/session imports
description: |
  Verify autonomous-run.ts imports CheckpointManager and SessionLogger.
  Expected RED — not yet migrated.

inputs:
  - packages/cli/src/autonomous-run.ts

outputs: []

checks:
  - id: imports-checkpoint
    cmd: grep -q 'CheckpointManager' packages/cli/src/autonomous-run.ts
    description: Importing CheckpointManager (pre-migration).
  - id: imports-session
    cmd: grep -q 'SessionLogger' packages/cli/src/autonomous-run.ts
    description: Importing SessionLogger (pre-migration).

tags:
  - tdd
  - red
---

# Red — pre-migration baseline

Verify current state:
- `autonomous-run.ts` imports CheckpointManager
- `autonomous-run.ts` imports SessionLogger
- `autonomous-run.ts` imports FilesystemTaskStatus (for --resume)

These assertions confirm the RED baseline.
