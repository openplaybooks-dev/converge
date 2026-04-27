# Checks: 05-finalize/001-root-redirect

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: src/app/page.tsx exists
**Command**: `test -f packages/studio/src/app/page.tsx`

## redirect-to-playbooks
**Description**: page.tsx redirects to /playbooks
**Command**: `grep -q 'next/navigation' packages/studio/src/app/page.tsx && grep -q 'redirect' packages/studio/src/app/page.tsx && grep -q '/playbooks' packages/studio/src/app/page.tsx`