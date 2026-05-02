---
id: cleanup-unit-red
title: Red — Unit still has tree fields
checks:
  - id: unit-has-parent-field
    cmd: grep -nE 'parent.*:.*Unit' packages/core/src/task/unit/unit.ts
    description: Unit.parent field still exists (RED — we want it gone).
tags: [tdd, red, inverted]
---

# Red — Unit tree fields still exist

These fields should be gone after this sub-task:
- `parent: Unit | null`
- `children?: Unit[]`
- `sortIndex: number`
- `static compareBySortIndex(a, b)`

Currently they exist — RED.

Verify with grep:
```bash
grep -nE 'parent.*:.*Unit|children\?:.*Unit\[\]|sortIndex' \
  packages/core/src/task/unit/unit.ts
```
