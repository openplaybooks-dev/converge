# Checks: 01-delete-epic-files

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## epic-manager-gone
**Description**: epic-manager.ts deleted
**Command**: `test ! -f packages/core/src/runtime/epic-manager.ts`

## epic-context-gone
**Description**: epic-context.ts deleted
**Command**: `test ! -f packages/core/src/context/epic-context.ts`

## epic-scanner-gone
**Description**: epic-scanner.ts deleted
**Command**: `test ! -f packages/core/src/planning/epic-scanner.ts`

## epic-checkpoints-gone
**Description**: ensure-epic-checkpoints.ts deleted
**Command**: `test ! -f packages/core/src/checkpoint/ensure-epic-checkpoints.ts`