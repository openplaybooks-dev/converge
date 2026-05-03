---
id: integrate-seed-executor-red
title: Red — seed-executor still uses checkpoint paths
description: |
  Verify seed-executor currently imports checkpoint modules and writes
  to persistent journal paths. Expected RED baseline.

inputs:
  - packages/core/src/executor/seed-executor.ts

outputs: []

checks:
  - id: uses-checkpoint
    cmd: grep -q 'checkpoint' packages/core/src/executor/seed-executor.ts
    description: seed-executor still references checkpoint (pre-migration).

tags:
  - tdd
  - red
---

# Red — pre-migration baseline

Verify current state:
- `seed-executor.ts` references checkpoint modules
- `seed-executor.ts` writes to `journal/{playbook}/tasks/` paths
- `seed-executor.ts` does NOT reference `getExecutionTaskDir`

These assertions confirm the RED baseline.
