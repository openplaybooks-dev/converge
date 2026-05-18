---
id: prune-checkpoint-index-green
title: Green — prune index.ts to atomic-write.ts only
description: |
  Reduce checkpoint/index.ts to a single export. Typecheck green.

inputs:
  - packages/core/src/checkpoint/index.ts

outputs:
  - packages/core/src/checkpoint/index.ts (modified)

checks:
  - id: only-atomic-write
    cmd: grep -q 'atomic-write' packages/core/src/checkpoint/index.ts && ! grep -q 'manager\|filesystem-status\|unit-checkpoint\|task-checkpoint' packages/core/src/checkpoint/index.ts
    description: index.ts exports only atomic-write.
  - id: typecheck-green
    cmd: pnpm -r typecheck
    description: All packages typecheck.

tags:
  - tdd
  - green
---

# Green — prune index.ts

Replace entire content of `packages/core/src/checkpoint/index.ts`:

```ts
export { atomicWriteFile, atomicWriteFileSync } from "./atomic-write.js";
```

Run `pnpm -r typecheck`. If any package still imports a deleted module from
`@openplaybooks/converge-core`'s checkpoint barrel, fix the import to point to the new
location or remove it.
