# Needs: 02-data-layer/001-core-studio-api-export

## Expected Outputs

- `packages/core/src/studio-api.ts`
- `packages/core/package.json`

## Checks

- **studio-api-file-exists**: studio-api.ts module exists
- **exports-entry**: package.json exports map has ./studio-api entry
- **import-resolves**: Import resolves and exposes SimpleLogTailer + loadPlaybook
