# Checks: 04-ui/007-view-modes

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## components-exist
**Description**: All five view components exist
**Command**: `test -f packages/converge-studio/src/components/views/ViewSwitcher.tsx && test -f packages/converge-studio/src/components/views/KanbanBoard.tsx && test -f packages/converge-studio/src/components/views/TaskTree.tsx && test -f packages/converge-studio/src/components/views/SessionGantt.tsx && test -f packages/converge-studio/src/components/views/TableView.tsx`

## hook-exists
**Description**: useViewMode hook exists
**Command**: `test -f packages/converge-studio/src/lib/use-view-mode.ts`

## typecheck
**Description**: All components typecheck
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`