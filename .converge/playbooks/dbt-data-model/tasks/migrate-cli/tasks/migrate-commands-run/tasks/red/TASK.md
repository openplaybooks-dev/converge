---
id: migrate-commands-run-red
title: Red — commands-run still uses checkpoint/session imports
description: |
  Verify commands-run.ts imports CheckpointManager and SessionLogger.
  Expected RED — not yet migrated.

inputs:
  - packages/cli/src/commands-run.ts

outputs: []

checks:
  - id: imports-checkpoint
    cmd: grep -q 'CheckpointManager' packages/cli/src/commands-run.ts
    description: Importing CheckpointManager (pre-migration).

tags:
  - tdd
  - red
---

# Red — pre-migration baseline
