# Checks: 02-data-layer/005-sessions-and-tail

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## sessions-module-exists
**Description**: sessions.ts exists
**Command**: `test -f packages/converge-studio/src/lib/converge-adapter/sessions.ts`

## typecheck
**Description**: Module typechecks
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`

## list-real-sessions
**Description**: listSessions returns sessions for an existing journal
**Command**: `cd packages/converge-studio && CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge tsx -e "import('./src/lib/converge-adapter/sessions.ts').then(async m=>{const s=await m.listSessions('oss-standardize');process.exit(s.length>0?0:1)}).catch(e=>{console.error(e);process.exit(1)})"`