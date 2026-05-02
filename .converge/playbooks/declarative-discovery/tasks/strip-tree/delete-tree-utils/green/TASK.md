---
id: delete-tree-utils-green
title: Green — rm tree-utils.ts
checks:
  - id: tree-utils-gone
    cmd: "! test -f packages/core/src/checkpoint/tree-utils.ts"
  - id: tests-pass
    cmd: pnpm --filter @converge core test -- no-tree-abstractions
tags: [tdd, green, inverted]
---

# Green — delete tree-utils.ts

```bash
rm packages/core/src/checkpoint/tree-utils.ts
```

Verify typecheck and tests green.
