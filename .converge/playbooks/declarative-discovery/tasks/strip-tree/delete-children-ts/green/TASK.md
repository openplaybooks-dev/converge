---
id: delete-children-ts-green
title: Green — rm children.ts
checks:
  - id: children-ts-gone
    cmd: "! test -f packages/core/src/task/unit/children.ts"
  - id: tests-pass
    cmd: pnpm --filter @converge core test -- no-tree-abstractions
tags: [tdd, green, inverted]
---

# Green — delete children.ts

```bash
rm packages/core/src/task/unit/children.ts
```

Verify `pnpm -r typecheck && pnpm -r test` — all green.
