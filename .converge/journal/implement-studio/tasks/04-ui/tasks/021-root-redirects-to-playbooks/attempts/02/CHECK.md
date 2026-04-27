# Checks: 04-ui/021-root-redirects-to-playbooks

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: src/app/page.tsx exists
**Command**: `test -f packages/converge-studio/src/app/page.tsx`

## page-redirects
**Description**: page.tsx calls redirect('/playbooks')
**Command**: `bash -c 'P=packages/converge-studio/src/app/page.tsx; grep -q "next/navigation" "$P" && grep -q "/playbooks" "$P" && grep -q "redirect" "$P"'`

## page-no-mc-content
**Description**: page.tsx renders nothing else (no MC dashboard, no launch sequence)
**Command**: `bash -c 'P=packages/converge-studio/src/app/page.tsx; ! grep -qE "Launch|Mission Control|fleet|widget|dashboard" $P'`

## typecheck-passes
**Description**: Studio typechecks
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`