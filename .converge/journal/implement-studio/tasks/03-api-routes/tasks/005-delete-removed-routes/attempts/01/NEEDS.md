# Needs: 03-api-routes/005-delete-removed-routes

## Expected Outputs

- `packages/converge-studio/src/app/api`

## Checks

- **agents-removed**: /api/agents routes removed
- **auth-removed**: /api/auth routes removed (no NextAuth in MVP)
- **framework-adapters-removed**: Framework adapter API routes removed
- **build-still-passes**: Studio still builds after deletions
