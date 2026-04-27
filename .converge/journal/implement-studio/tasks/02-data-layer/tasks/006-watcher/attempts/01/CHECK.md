# Checks: 02-data-layer/006-watcher

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## watcher-module-exists
**Description**: watcher.ts and index.ts exist
**Command**: `test -f packages/converge-studio/src/lib/converge-adapter/watcher.ts && test -f packages/converge-studio/src/lib/converge-adapter/index.ts`

## typecheck
**Description**: Modules typecheck
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`

## adapter-public-api
**Description**: index.ts re-exports the full adapter surface
**Command**: `grep -q 'listPlaybooks\|listTasks\|listSessions\|watch' packages/converge-studio/src/lib/converge-adapter/index.ts`