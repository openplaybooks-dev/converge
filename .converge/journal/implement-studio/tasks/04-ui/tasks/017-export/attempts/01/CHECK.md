# Checks: 04-ui/017-export

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## session-export-route-exists
**Description**: Session export route exists
**Command**: `test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/export/route.ts'`

## playbook-export-route-exists
**Description**: Playbook export route exists
**Command**: `test -f 'packages/converge-studio/src/app/api/playbooks/[name]/export/route.ts'`

## typecheck-passes
**Description**: typecheck-passes
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`