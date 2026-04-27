# Checks: 03-api-routes/001-playbooks-routes

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## routes-exist
**Description**: Both route handlers exist
**Command**: `test -f packages/converge-studio/src/app/api/playbooks/route.ts && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/route.ts'`

## nodejs-runtime
**Description**: Both routes export runtime = 'nodejs'
**Command**: `grep -l "runtime = 'nodejs'" packages/converge-studio/src/app/api/playbooks/route.ts 'packages/converge-studio/src/app/api/playbooks/[name]/route.ts' | wc -l | xargs test 2 -eq`

## typecheck
**Description**: Routes typecheck
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`