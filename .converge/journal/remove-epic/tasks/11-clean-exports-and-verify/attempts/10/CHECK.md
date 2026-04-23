# Checks: 11-clean-exports-and-verify

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-epic-refs
**Description**: Zero epic references in packages/core/src (exports only)
**Command**: `test -z "$(grep -rn 'EpicConfig\|EpicStatus\|EpicContext\|EpicManager\|EpicDefinition\|EpicBuilder\|EpicDeps' --include='*.ts' packages/core/src/index.ts 2>/dev/null)"`

## tsc-clean
**Description**: TypeScript compiles clean
**Command**: `cd packages/core && npx tsc --noEmit`