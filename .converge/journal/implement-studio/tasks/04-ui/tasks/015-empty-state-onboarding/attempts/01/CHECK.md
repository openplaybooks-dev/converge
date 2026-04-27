# Checks: 04-ui/015-empty-state-onboarding

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## empty-state-component-exists
**Description**: EmptyState component exists
**Command**: `test -f packages/converge-studio/src/components/empty-state.tsx`

## empty-state-rendered-by-index
**Description**: The /playbooks index page imports EmptyState (so 0-playbook case renders it)
**Command**: `grep -q 'empty-state' packages/converge-studio/src/app/playbooks/page.tsx`

## typecheck-passes
**Description**: typecheck-passes
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`