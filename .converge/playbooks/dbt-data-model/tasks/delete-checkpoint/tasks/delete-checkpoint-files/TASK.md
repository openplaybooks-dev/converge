---
id: delete-checkpoint-files
title: Delete the four checkpoint source files
description: |
  Delete manager.ts, filesystem-status.ts, unit-checkpoint.ts, and
  task-checkpoint.ts. Also clean up stale checkpoint.json files from
  journal directories.

inputs:
  - packages/core/src/checkpoint/manager.ts
  - packages/core/src/checkpoint/filesystem-status.ts
  - packages/core/src/checkpoint/unit-checkpoint.ts
  - packages/core/src/checkpoint/task-checkpoint.ts

outputs:
  - packages/core/src/checkpoint/manager.ts (deleted)
  - packages/core/src/checkpoint/filesystem-status.ts (deleted)
  - packages/core/src/checkpoint/unit-checkpoint.ts (deleted)
  - packages/core/src/checkpoint/task-checkpoint.ts (deleted)

checks:
  - id: files-deleted
    cmd: "! test -f packages/core/src/checkpoint/manager.ts && ! test -f packages/core/src/checkpoint/filesystem-status.ts && ! test -f packages/core/src/checkpoint/unit-checkpoint.ts && ! test -f packages/core/src/checkpoint/task-checkpoint.ts"
    description: All four checkpoint files deleted.

skills: []
references:
  - "packages/core/src/checkpoint/"

vars: {}
dependencies: []
---

# 02 — Delete checkpoint files

Delete four files:
```bash
rm packages/core/src/checkpoint/manager.ts
rm packages/core/src/checkpoint/filesystem-status.ts
rm packages/core/src/checkpoint/unit-checkpoint.ts
rm packages/core/src/checkpoint/task-checkpoint.ts
```

Also clean up stale checkpoint.json files from journal directories:

```bash
find .converge/journal -name "checkpoint.json" -delete
rm .converge/journal/.checkpoint.json
```

No code changes needed — tombstone tests already verify deletion,
and prune-checkpoint-index handles the exports cleanup.
