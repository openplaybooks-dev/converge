# Checks: 02-port-data-layer/002-copy-views

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## views-present
**Description**: All 5 view primitives + index exist
**Command**: `for f in KanbanBoard SessionGantt TableView TaskTree ViewSwitcher; do test -f packages/studio/src/components/views/$f.tsx || exit 1; done && test -f packages/studio/src/components/views/index.ts`