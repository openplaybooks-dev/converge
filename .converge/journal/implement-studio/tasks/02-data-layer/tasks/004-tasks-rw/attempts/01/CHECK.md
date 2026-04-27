# Checks: 02-data-layer/004-tasks-rw

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## tasks-module-exists
**Description**: tasks.ts and frontmatter.ts exist
**Command**: `test -f packages/converge-studio/src/lib/converge-adapter/tasks.ts && test -f packages/converge-studio/src/lib/converge-adapter/frontmatter.ts`

## typecheck
**Description**: Modules typecheck
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`

## read-real-task
**Description**: readTaskMd returns frontmatter for a known task
**Command**: `cd packages/converge-studio && CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge tsx -e "import('./src/lib/converge-adapter/tasks.ts').then(async m=>{const t=await m.readTaskMd('oss-standardize','01-brand');process.exit(t.frontmatter.title==='Brand Consolidation'?0:1)}).catch(e=>{console.error(e);process.exit(1)})"`