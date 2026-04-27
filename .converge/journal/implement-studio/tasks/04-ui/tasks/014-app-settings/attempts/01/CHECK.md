# Checks: 04-ui/014-app-settings

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## settings-page-exists
**Description**: /settings page exists
**Command**: `test -f packages/converge-studio/src/app/settings/page.tsx`

## settings-api-exists
**Description**: /api/settings returns the read-only environment info
**Command**: `test -f packages/converge-studio/src/app/api/settings/route.ts`

## typecheck-passes
**Description**: typecheck-passes
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`