# Checks: 11-clean-exports-and-verify

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-epic-refs
**Description**: Zero epic references in packages/core/src
**Command**: `test -z "$(grep -rn 'export.*EpicConfig\|export.*EpicStatus\|export.*EpicContext\|export.*EpicManager\|export.*EpicDefinition\|export.*EpicBuilder\|export type Epic\|from.*epicId\|import.*EpicConfig\|import.*EpicStatus\|import.*EpicContext\|import.*EpicManager\|import.*EpicDefinition\|import.*EpicBuilder' --include='*.ts' packages/core/src/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')"`

## tsc-clean
**Description**: TypeScript compiles clean
**Command**: `cd packages/core && npx tsc --noEmit`