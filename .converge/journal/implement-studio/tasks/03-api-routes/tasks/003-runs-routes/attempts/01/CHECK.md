# Checks: 03-api-routes/003-runs-routes

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## runs-routes-exist
**Description**: All four runs route handlers exist
**Command**: `test -f packages/converge-studio/src/app/api/runs/route.ts && test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/route.ts' && test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/events/route.ts' && test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/stream/route.ts'`

## nodejs-runtime
**Description**: All four routes export runtime = 'nodejs'
**Command**: `find packages/converge-studio/src/app/api/runs -name 'route.ts' | xargs grep -l "runtime = 'nodejs'" | wc -l | xargs test 4 -eq`

## typecheck
**Description**: Routes typecheck
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`