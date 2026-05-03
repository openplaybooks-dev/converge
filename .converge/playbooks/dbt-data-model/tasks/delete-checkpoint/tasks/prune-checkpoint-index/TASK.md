---
id: prune-checkpoint-index
title: Prune checkpoint/index.ts — keep only atomic-write.ts
description: |
  Update checkpoint/index.ts to export only atomic-write.ts.
  Remove all deleted module exports. Verify no package imports
  the deleted modules.

inputs:
  - packages/core/src/checkpoint/index.ts

outputs:
  - packages/core/src/checkpoint/index.ts (modified)

checks:
  - id: atomic-write-exported
    cmd: grep -q 'atomic-write' packages/core/src/checkpoint/index.ts
    description: atomic-write.ts is still exported.
  - id: no-manager-export
    cmd: "! grep -q 'manager\\|filesystem-status\\|unit-checkpoint\\|task-checkpoint' packages/core/src/checkpoint/index.ts"
    description: No deleted module exports.
  - id: typecheck-green
    cmd: pnpm -r typecheck
    description: All packages typecheck after pruning.

skills: []
references:
  - "packages/core/src/checkpoint/index.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 03 — Prune checkpoint/index.ts

## Children

### red
Verify checkpoint/index.ts still exports deleted module names.
Expected RED — not yet pruned.

### green
Update index.ts to export only atomic-write.ts. Remove all
deleted module exports. Verify typecheck passes.

## Target index.ts

```ts
export { atomicWriteFile, atomicWriteFileSync } from "./atomic-write.js";
```

Nothing else.
