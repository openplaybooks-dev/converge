# Checks: 01-delete-epic-files

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## epic-context-removed
**Description**: EpicContext interface removed from context/types.ts
**Command**: `test -z "$(grep -n 'EpicContext' packages/core/src/context/types.ts 2>/dev/null)"`

## epic-manager-removed
**Description**: EpicManager removed from Runtime interface
**Command**: `test -z "$(grep -n 'epics: EpicManager' packages/core/src/runtime/types.ts 2>/dev/null)"`

## epic-lifecycle-hooks-removed
**Description**: Epic lifecycle hooks removed from hooks/types.ts
**Command**: `test -z "$(grep -n 'epic:' packages/core/src/hooks/types.ts 2>/dev/null)"`

## epic-exports-removed
**Description**: Epic exports removed from index.ts
**Command**: `test -z "$(grep -n 'EpicContext\|EpicConfig\|EpicStatus\|EpicManager' packages/core/src/index.ts 2>/dev/null)"`