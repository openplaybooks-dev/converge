# Checks: 05-run-supervisor/002-run-api-route

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## routes-exist
**Description**: Both run routes exist
**Command**: `test -f packages/converge-studio/src/app/api/run/route.ts && test -f 'packages/converge-studio/src/app/api/run/[runId]/stream/route.ts'`

## nodejs-runtime
**Description**: Both routes export runtime = 'nodejs'
**Command**: `grep -q "runtime = 'nodejs'" packages/converge-studio/src/app/api/run/route.ts && grep -q "runtime = 'nodejs'" 'packages/converge-studio/src/app/api/run/[runId]/stream/route.ts'`

## typecheck
**Description**: Routes typecheck
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`