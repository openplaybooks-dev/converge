# Checks: 04-ui/011-logs-panel

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## logs-page-exists
**Description**: Logs page exists under run detail
**Command**: `test -f 'packages/converge-studio/src/app/runs/[playbook]/[sessionId]/logs/page.tsx'`

## logs-api-exists
**Description**: Logs API route exists and returns JSON
**Command**: `test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/logs/route.ts'`

## typecheck-passes
**Description**: typecheck-passes
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`