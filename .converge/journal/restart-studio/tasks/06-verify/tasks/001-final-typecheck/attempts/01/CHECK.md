# Checks: 06-verify/001-final-typecheck

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## zero-errors
**Description**: Studio typecheck has zero errors
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`

## report-written
**Description**: Final typecheck report exists
**Command**: `test -f .converge/studio-state/final-typecheck.json`