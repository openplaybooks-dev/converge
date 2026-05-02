---
id: delete-task-tree-green
title: Green — rm -rf packages/core/src/task/tree/
description: Delete the entire tree/ directory. Tests go GREEN.

outputs: (deleted directory)

checks:
  - id: tree-directory-gone
    cmd: "! test -d packages/core/src/task/tree"
  - id: tests-pass
    cmd: pnpm --filter @converge core test -- no-tree-abstractions
  - id: typecheck-green
    cmd: pnpm -r typecheck
  - id: all-tests-green
    cmd: pnpm -r test

tags: [tdd, green, inverted]
---

# Green — delete task/tree/

```bash
rm -rf packages/core/src/task/tree/
```

Run `pnpm -r typecheck` — fix any remaining imports from `task/tree/`
in consumer files. At this point (post phase 05), there should be
zero consumers importing from `task/tree/`.

Run `pnpm --filter @converge core test -- no-tree-abstractions` —
tree directory assertions PASS (GREEN). The directory is gone.

Run `pnpm -r test` — all other tests still pass.
