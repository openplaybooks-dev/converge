# Needs: 03-api-routes/003-runs-routes

## Expected Outputs

- `packages/converge-studio/src/app/api/runs/route.ts`
- `packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/route.ts`
- `packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/events/route.ts`
- `packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/stream/route.ts`

## Checks

- **runs-routes-exist**: All four runs route handlers exist
- **nodejs-runtime**: All four routes export runtime = 'nodejs'
- **typecheck**: Routes typecheck
