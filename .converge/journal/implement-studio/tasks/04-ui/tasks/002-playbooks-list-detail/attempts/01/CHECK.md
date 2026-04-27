# Checks: 04-ui/002-playbooks-list-detail

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## pages-exist
**Description**: List + detail page files exist
**Command**: `test -f 'packages/converge-studio/src/app/playbooks/page.tsx' && test -f 'packages/converge-studio/src/app/playbooks/[name]/page.tsx'`

## typecheck
**Description**: Pages typecheck
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`