# Needs: 03-api-routes/001-playbooks-routes

## Expected Outputs

- `packages/converge-studio/src/app/api/playbooks/route.ts`
- `packages/converge-studio/src/app/api/playbooks/[name]/route.ts`

## Checks

- **routes-exist**: Both route handlers exist
- **nodejs-runtime**: Both routes export runtime = 'nodejs'
- **typecheck**: Routes typecheck
