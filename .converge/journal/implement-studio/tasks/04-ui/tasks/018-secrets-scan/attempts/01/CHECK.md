# Checks: 04-ui/018-secrets-scan

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## scan-lib-exists
**Description**: Secrets scan library exists
**Command**: `test -f packages/converge-studio/src/lib/secrets-scan.ts`

## scan-api-exists
**Description**: /api/playbooks/[name]/secrets-scan returns findings
**Command**: `test -f 'packages/converge-studio/src/app/api/playbooks/[name]/secrets-scan/route.ts'`

## card-component-exists
**Description**: SecretsScanCard component exists
**Command**: `test -f packages/converge-studio/src/components/secrets-scan-card.tsx`

## typecheck-passes
**Description**: typecheck-passes
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`