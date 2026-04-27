# Checks: 03-rebind-ui/005-rebind-runs-pages

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## runs-list-exists
**Description**: /runs/page.tsx exists and uses views primitives
**Command**: `test -f packages/studio/src/app/runs/page.tsx && grep -q 'TableView\|KanbanBoard\|ViewSwitcher' packages/studio/src/app/runs/page.tsx`

## live-session-view-exists
**Description**: live session view exists and consumes runs SSE
**Command**: `test -f 'packages/studio/src/app/runs/[playbook]/[sessionId]/page.tsx' && grep -q '/api/runs\|stream\|EventSource' 'packages/studio/src/app/runs/[playbook]/[sessionId]/page.tsx'`