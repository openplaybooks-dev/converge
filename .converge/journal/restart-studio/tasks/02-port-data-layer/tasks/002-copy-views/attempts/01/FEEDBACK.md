# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **views-present**

## ❌ views-present

**Command**: `for f in KanbanBoard SessionGantt TableView TaskTree ViewSwitcher; do test -f packages/studio/src/components/views/$f.tsx || exit 1; done && test -f packages/studio/src/components/views/index.ts`
**Exit code**: 1
**Output**:
```
Command failed: for f in KanbanBoard SessionGantt TableView TaskTree ViewSwitcher; do test -f packages/studio/src/components/views/$f.tsx || exit 1; done && test -f packages/studio/src/components/views/index.ts
```
