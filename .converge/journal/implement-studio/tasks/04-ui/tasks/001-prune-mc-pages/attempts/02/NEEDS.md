# Needs: 04-ui/001-prune-mc-pages

## Expected Outputs

- `packages/converge-studio/src/app`
- `packages/converge-studio/src/components`
- `packages/converge-studio/src/lib`

## Checks

- **legacy-catchall-removed**: The [[...panel]] catch-all dashboard route is gone
- **agent-pages-removed**: Agent registry / orgs / users / rbac pages removed
- **dashboard-panels-removed**: Mission Control dashboard widgets and panels removed
- **gateway-libs-removed**: Gateway/websocket/device-identity lib modules removed
- **gateway-api-removed**: Gateway/openclaw/onboarding/projects API routes removed
- **no-mission-control-literal**: The string 'Mission Control' does not appear in src/ or messages/ (LICENSE.upstream and NOTICE may keep it)
- **build-or-typecheck-passes**: Studio still typechecks after deletions
