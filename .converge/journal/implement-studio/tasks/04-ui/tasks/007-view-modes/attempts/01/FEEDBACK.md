# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **components-exist**
- ❌ **hook-exists**
- ✅ **typecheck**

## ❌ components-exist

**Command**: `test -f packages/converge-studio/src/components/views/ViewSwitcher.tsx && test -f packages/converge-studio/src/components/views/KanbanBoard.tsx && test -f packages/converge-studio/src/components/views/TaskTree.tsx && test -f packages/converge-studio/src/components/views/SessionGantt.tsx && test -f packages/converge-studio/src/components/views/TableView.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/components/views/ViewSwitcher.tsx && test -f packages/converge-studio/src/components/views/KanbanBoard.tsx && test -f packages/converge-studio/src/components/views/TaskTree.tsx && test -f packages/converge-studio/src/components/views/SessionGantt.tsx && test -f packages/converge-studio/src/components/views/TableView.tsx
```

## ❌ hook-exists

**Command**: `test -f packages/converge-studio/src/lib/use-view-mode.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/lib/use-view-mode.ts
```
