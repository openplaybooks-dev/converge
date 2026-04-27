# Checks: 02-data-layer/003-playbooks-rw

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## playbooks-module-exists
**Description**: playbooks.ts exists
**Command**: `test -f packages/converge-studio/src/lib/converge-adapter/playbooks.ts`

## typecheck
**Description**: Module typechecks
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`

## list-real-playbooks
**Description**: listPlaybooks returns at least one of the real playbooks in this repo
**Command**: `cd packages/converge-studio && CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge node --import tsx --input-type=module -e "import('./src/lib/converge-adapter/playbooks.ts').then(async m=>{const ps=await m.listPlaybooks();process.exit(ps.find(p=>p.name==='oss-standardize')?0:1)}).catch(e=>{console.error(e);process.exit(1)})"`