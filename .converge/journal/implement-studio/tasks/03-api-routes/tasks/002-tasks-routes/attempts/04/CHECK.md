# Checks: 03-api-routes/002-tasks-routes

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## tasks-routes-exist
**Description**: All three route handlers exist
**Command**: `test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/route.ts' && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/[...path]/route.ts' && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/[...path]/reset/route.ts'`

## nodejs-runtime
**Description**: All three routes export runtime = 'nodejs'
**Command**: `find 'packages/converge-studio/src/app/api/playbooks/[name]/tasks' -name 'route.ts' | xargs grep -l "runtime = 'nodejs'" | wc -l | xargs test 3 -eq`

## typecheck
**Description**: Routes typecheck
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`