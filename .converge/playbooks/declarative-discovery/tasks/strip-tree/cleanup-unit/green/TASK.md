---
id: cleanup-unit-green
title: Green — remove tree fields from Unit
outputs: packages/core/src/task/unit/unit.ts (modified)
checks:
  - id: unit-no-parent-field
    cmd: "! grep -nE 'parent.*:.*Unit|children\\?:.*Unit\\[\\]|sortIndex' packages/core/src/task/unit/unit.ts"
  - id: typecheck-green
    cmd: pnpm -r typecheck
  - id: tests-green
    cmd: pnpm -r test
tags: [tdd, green, inverted]
---

# Green — remove tree fields from Unit

Remove from `packages/core/src/task/unit/unit.ts`:
- `parent: Unit | null`
- `children?: Unit[]`
- `sortIndex: number`
- `static compareBySortIndex(a: Unit, b: Unit): number`

Keep (these are DAG fields):
- `parentIds: string[]`
- `childIds: string[]`
- `depends_on: string[]`

Fix all callers that reference the removed fields:
- `unit.parent` → lookup from task registry by `unit.parentIds[0]`
  (or use DAG node parents)
- `unit.children` → use `unit.childIds` (string array, not Unit refs)
- `unit.sortIndex` → no replacement (order comes from topological sort)
- `Unit.compareBySortIndex` → no replacement

Run `pnpm -r typecheck && pnpm -r test` — all green.
