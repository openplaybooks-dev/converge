# Checks: 02-data-layer/002-paths-and-root

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## paths-module-exists
**Description**: paths.ts exists
**Command**: `test -f packages/converge-studio/src/lib/converge-adapter/paths.ts`

## typecheck
**Description**: Module typechecks
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`