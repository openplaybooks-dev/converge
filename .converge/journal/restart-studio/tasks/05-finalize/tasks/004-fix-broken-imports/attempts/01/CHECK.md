# Checks: 05-finalize/004-fix-broken-imports

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## typecheck-passes
**Description**: Studio typecheck has zero errors
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`

## fix-report-written
**Description**: Typecheck-fix report exists
**Command**: `test -f .converge/studio-state/typecheck-fix.json`