# Checks: 04-ui/008-promote-playbooks-to-root

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## root-page-exists
**Description**: src/app/page.tsx exists (i.e. / is served by the playbooks index)
**Command**: `test -f packages/converge-studio/src/app/page.tsx`

## studio-route-group-removed
**Description**: The (studio) route group is gone
**Command**: `test ! -d 'packages/converge-studio/src/app/(studio)'`

## playbooks-routes-at-root
**Description**: /playbooks/[name] and /runs are at the URL root
**Command**: `test -f 'packages/converge-studio/src/app/playbooks/[name]/page.tsx' && test -f 'packages/converge-studio/src/app/runs/page.tsx'`

## typecheck-passes
**Description**: Studio still typechecks after the move
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`