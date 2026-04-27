# Checks: 02-data-layer/001-core-studio-api-export

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## studio-api-file-exists
**Description**: studio-api.ts module exists
**Command**: `test -f packages/core/src/studio-api.ts`

## exports-entry
**Description**: package.json exports map has ./studio-api entry
**Command**: `node -e "const e=require('./packages/core/package.json').exports;process.exit(e['./studio-api']?0:1)"`

## import-resolves
**Description**: Import resolves and exposes SimpleLogTailer + loadPlaybook
**Command**: `cd packages/core && pnpm build 2>&1 | tail -3 && node --input-type=module -e "import('@converge/core/studio-api').then(m=>{if(!m.SimpleLogTailer||!m.loadPlaybook)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})"`