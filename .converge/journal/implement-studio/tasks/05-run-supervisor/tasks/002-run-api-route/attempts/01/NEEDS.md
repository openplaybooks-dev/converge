# Needs: 05-run-supervisor/002-run-api-route

## Expected Outputs

- `packages/converge-studio/src/app/api/run/route.ts`
- `packages/converge-studio/src/app/api/run/[runId]/stream/route.ts`

## Checks

- **routes-exist**: Both run routes exist
- **nodejs-runtime**: Both routes export runtime = 'nodejs'
- **typecheck**: Routes typecheck
