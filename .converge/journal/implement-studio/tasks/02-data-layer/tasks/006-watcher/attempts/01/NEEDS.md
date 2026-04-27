# Needs: 02-data-layer/006-watcher

## Expected Outputs

- `packages/converge-studio/src/lib/converge-adapter/watcher.ts`
- `packages/converge-studio/src/lib/converge-adapter/index.ts`

## Checks

- **watcher-module-exists**: watcher.ts and index.ts exist
- **typecheck**: Modules typecheck
- **adapter-public-api**: index.ts re-exports the full adapter surface
