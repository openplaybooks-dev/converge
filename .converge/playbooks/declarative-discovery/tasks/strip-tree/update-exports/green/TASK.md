---
id: update-exports-green
title: Green — replace tree exports with DAG exports
outputs: packages/core/src/index.ts (modified)
checks:
  - id: no-tree-exports
    cmd: "! grep -q 'task/tree' packages/core/src/index.ts"
  - id: dag-exports
    cmd: grep -q 'dag' packages/core/src/index.ts
  - id: typecheck-green
    cmd: pnpm -r typecheck
tags: [tdd, green, inverted]
---

# Green — DAG exports

In `packages/core/src/index.ts`:
- Remove: `export * from './task/tree/index.js';`
- Remove: any other tree-related exports
- Add: `export * from './dag/index.js';`

Verify all consumers that imported from the tree barrel now import
from the DAG barrel (should already be done from phase 05).

Run `pnpm -r typecheck && pnpm -r test` — all green.
