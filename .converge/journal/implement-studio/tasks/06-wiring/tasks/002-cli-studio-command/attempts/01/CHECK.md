# Checks: 06-wiring/002-cli-studio-command

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## command-file-exists
**Description**: commands-studio.ts exists
**Command**: `test -f packages/cli/src/commands-studio.ts`

## registered-in-main
**Description**: main.ts references commands-studio
**Command**: `grep -q 'commands-studio\|runStudio' packages/cli/src/main.ts`

## optional-dep-on-studio
**Description**: cli has optionalDependency on @converge/studio
**Command**: `node -e "const p=require('./packages/cli/package.json');process.exit(p.optionalDependencies&&p.optionalDependencies['@converge/studio']?0:1)"`

## studio-help
**Description**: `converge studio --help` runs and mentions studio
**Command**: `pnpm --filter @converge/cli build 2>&1 | tail -3 && node packages/cli/dist/index.js studio --help 2>&1 | grep -qi studio`