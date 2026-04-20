# Checks: 001-improve/epoch-001/002-implement/003-verify

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## typecheck
**Description**: Zero type errors
**Command**: `cd /Users/minh/Documents/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`

## tests
**Description**: Tests pass
**Command**: `cd /Users/minh/Documents/converge && pnpm test 2>&1 | tail -1`