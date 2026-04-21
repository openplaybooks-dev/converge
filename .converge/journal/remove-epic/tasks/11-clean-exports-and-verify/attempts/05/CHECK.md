# Checks: 11-clean-exports-and-verify

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-epic-exports
**Description**: No epic types exported from public API
**Command**: `test -z "$(grep -E 'EpicConfig|EpicStatus|EpicContext|EpicManager|EpicDefinition|EpicBuilder|EpicDeps' packages/core/src/index.ts packages/core/src/*/index.ts 2>/dev/null)"`

## tsc-clean
**Description**: TypeScript compiles clean
**Command**: `cd packages/core && npx tsc --noEmit`