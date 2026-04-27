# Checks: 04-ui/013-audit-log

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## audit-page-exists
**Description**: /audit page exists
**Command**: `test -f packages/converge-studio/src/app/audit/page.tsx`

## audit-uses-runs-api
**Description**: audit page fetches from /api/runs (no separate /api/audit route)
**Command**: `grep -q '/api/runs' packages/converge-studio/src/app/audit/page.tsx`

## typecheck-passes
**Description**: typecheck-passes
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`