# Checks: 04-ui/005-runs-list

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: Runs list page exists
**Command**: `test -f 'packages/converge-studio/src/app/runs/page.tsx'`

## typecheck
**Description**: Page typechecks
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`