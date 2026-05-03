---
id: tombstone-tests-green
title: Green (INVERTED) — delete files, tombstone tests pass
description: |
  Delete the four checkpoint files. Now tombstone tests pass because
  files genuinely don't exist. GREEN confirms deletion is complete.

inputs:
  - packages/core/tests/checkpoint/checkpoint-deleted.test.ts

outputs: []

checks:
  - id: tests-pass
    cmd: pnpm --filter @converge/core test -- checkpoint-deleted
    description: Tombstone tests pass (GREEN) — files are gone.

tags:
  - tdd
  - green
---

# Green (INVERTED) — delete files

Delete the four files:
```bash
rm packages/core/src/checkpoint/manager.ts
rm packages/core/src/checkpoint/filesystem-status.ts
rm packages/core/src/checkpoint/unit-checkpoint.ts
rm packages/core/src/checkpoint/task-checkpoint.ts
```

Run `pnpm --filter @converge/core test -- checkpoint-deleted`.
Expected: **ALL TESTS PASS** — files are gone.
