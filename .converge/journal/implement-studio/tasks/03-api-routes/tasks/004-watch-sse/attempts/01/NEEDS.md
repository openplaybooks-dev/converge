# Needs: 03-api-routes/004-watch-sse

## Expected Outputs

- `packages/converge-studio/src/app/api/watch/route.ts`
- `packages/converge-studio/src/lib/watcher-singleton.ts`

## Checks

- **watch-route-exists**: Watch route exists
- **nodejs-runtime**: Route exports runtime = 'nodejs'
- **singleton-watcher**: Watcher is a module-level singleton (avoids one watcher per request)
- **typecheck**: Module typechecks
