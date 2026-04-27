# Checks: 03-rebind-ui/007-rebind-playbooks-list-and-new

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## list-page-exists
**Description**: /playbooks/page.tsx exists and lists playbooks
**Command**: `test -f packages/studio/src/app/playbooks/page.tsx && grep -q 'listPlaybooks\|/api/playbooks' packages/studio/src/app/playbooks/page.tsx`

## new-page-exists
**Description**: /playbooks/new/page.tsx exists with a form posting to /api/playbooks
**Command**: `test -f packages/studio/src/app/playbooks/new/page.tsx && grep -q '/api/playbooks' packages/studio/src/app/playbooks/new/page.tsx`