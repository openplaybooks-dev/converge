# Needs: 04-ui/018-secrets-scan

## Expected Outputs

- `packages/converge-studio/src/app/api/playbooks/[name]/secrets-scan`
- `packages/converge-studio/src/lib/secrets-scan.ts`
- `packages/converge-studio/src/components/secrets-scan-card.tsx`

## Checks

- **scan-lib-exists**: Secrets scan library exists
- **scan-api-exists**: /api/playbooks/[name]/secrets-scan returns findings
- **card-component-exists**: SecretsScanCard component exists
- **typecheck-passes**: typecheck-passes
