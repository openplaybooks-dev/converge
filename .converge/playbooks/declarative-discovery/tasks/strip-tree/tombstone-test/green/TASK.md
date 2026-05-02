---
id: tombstone-test-green
title: Green — tombstone test passes
description: All deletions complete. Tombstone test fully green.
checks:
  - id: tombstone-test-passes
    cmd: pnpm --filter @converge core test -- no-tree-abstractions
  - id: all-tests-pass
    cmd: pnpm -r test
  - id: no-tasktree-imports
    cmd: "! grep -rln 'TaskTree\\|from.*task/tree' packages/ 2>/dev/null"
  - id: no-discover-children
    cmd: "! grep -rln 'discoverChildren\\|discoverEpicChildren' packages/core/src 2>/dev/null"
tags: [tdd, green, inverted]
---

# Green — tombstone passes

After all 6 deletion sub-tasks complete:

```bash
pnpm --filter @converge core test -- no-tree-abstractions
# All assertions pass

pnpm -r test
# Full suite green

! grep -rln 'TaskTree\|from.*task/tree' packages/
# No output — zero references

! grep -rln 'discoverChildren\|discoverEpicChildren' packages/core/src
# No output — zero references
```

The tombstone test stays permanently. Any future PR that re-introduces
tree abstractions will fail CI.
