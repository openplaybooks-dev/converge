# Checks: 09-concepts/002-filesystem-as-plan

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/concepts/filesystem-as-plan.md`

## covers-journal
**Description**: covers the journal directory
**Command**: `grep -qiE '\.converge/journal' docs/concepts/filesystem-as-plan.md`

## covers-debugging
**Description**: shows shell-tool debugging
**Command**: `grep -qiE 'cat|grep|ls|tail|debug' docs/concepts/filesystem-as-plan.md`