# Checks: 08-reference/003-task-md

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/reference/task-md.md`

## documents-id-and-outputs
**Description**: documents id and outputs
**Command**: `grep -qE '`id`|^###\s+id' docs/reference/task-md.md && grep -qE '`outputs`|^###\s+outputs' docs/reference/task-md.md`

## documents-checks
**Description**: documents checks
**Command**: `grep -qE '`checks`|^###\s+checks' docs/reference/task-md.md`

## documents-wbs
**Description**: documents wbs
**Command**: `grep -qiE 'wbs' docs/reference/task-md.md`