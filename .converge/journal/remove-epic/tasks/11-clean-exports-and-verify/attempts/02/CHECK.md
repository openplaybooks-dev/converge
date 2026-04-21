# Checks: 11-clean-exports-and-verify

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-epic-refs
**Description**: Zero epic references in packages/core/src
**Command**: `test -z "$(grep -rn 'epicId\|EpicId\|epic_id\|EpicConfig\|EpicStatus\|EpicContext\|EpicManager\|EpicDefinition\|EpicBuilder\|EpicDeps\|epicConfig\|epicStatus\|epicDeps\|epicLog\|epicTasks\|EpicScanner\|EpicMetadata\|epicDir\|extractEpicId\|extractEpicDir\|ensureEpicCheckpoints\|updateEpicProgress\|EpicEvalAPI\|EpicPlanAPI' --include='*.ts' packages/core/src/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')"`

## tsc-clean
**Description**: TypeScript compiles clean
**Command**: `cd packages/core && npx tsc --noEmit`