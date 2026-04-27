# Needs: 03-api-routes/002-tasks-routes

## Expected Outputs

- `packages/converge-studio/src/app/api/playbooks/[name]/tasks/route.ts`
- `packages/converge-studio/src/app/api/playbooks/[name]/tasks/[...path]/route.ts`
- `packages/converge-studio/src/app/api/playbooks/[name]/tasks/[...path]/reset/route.ts`

## Checks

- **tasks-routes-exist**: All three route handlers exist
- **nodejs-runtime**: All three routes export runtime = 'nodejs'
- **typecheck**: Routes typecheck
