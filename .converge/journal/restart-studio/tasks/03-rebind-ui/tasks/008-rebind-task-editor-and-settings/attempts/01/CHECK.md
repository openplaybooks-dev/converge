# Checks: 03-rebind-ui/008-rebind-task-editor-and-settings

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## task-editor-exists
**Description**: Task editor page exists
**Command**: `test -f 'packages/studio/src/app/playbooks/[name]/tasks/by-path/[...path]/page.tsx'`

## settings-page-exists
**Description**: /settings/page.tsx exists
**Command**: `test -f packages/studio/src/app/settings/page.tsx`