# Checks: 03-api-routes/004-watch-sse

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## watch-route-exists
**Description**: Watch route exists
**Command**: `test -f packages/converge-studio/src/app/api/watch/route.ts`

## nodejs-runtime
**Description**: Route exports runtime = 'nodejs'
**Command**: `grep -q "runtime = 'nodejs'" packages/converge-studio/src/app/api/watch/route.ts`

## singleton-watcher
**Description**: Watcher is a module-level singleton (avoids one watcher per request)
**Command**: `test -f packages/converge-studio/src/lib/watcher-singleton.ts && grep -q 'getWatcher\|sharedWatcher' packages/converge-studio/src/lib/watcher-singleton.ts`

## typecheck
**Description**: Module typechecks
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`