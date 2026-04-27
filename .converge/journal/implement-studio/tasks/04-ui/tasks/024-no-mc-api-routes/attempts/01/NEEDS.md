# Needs: 04-ui/024-no-mc-api-routes

## Checks

- **api-allowlist-only**: src/app/api/ contains only converge-native top-level dirs
- **api-required-present**: All required converge-native API dirs are present
- **nodejs-runtime-on-all-routes**: Every route.ts under src/app/api/ declares runtime = 'nodejs'
