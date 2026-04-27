# Checks: 04-ui/001-prune-mc-pages

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## legacy-catchall-removed
**Description**: The [[...panel]] catch-all dashboard route is gone
**Command**: `test ! -d 'packages/converge-studio/src/app/[[...panel]]'`

## agent-pages-removed
**Description**: Agent registry / orgs / users / rbac pages removed
**Command**: `test -z "$(find packages/converge-studio/src/app -type d \( -iname 'agents' -o -iname 'agent-registry' -o -iname 'orgs' -o -iname 'users' -o -iname 'rbac' \) 2>/dev/null)"`

## dashboard-panels-removed
**Description**: Mission Control dashboard widgets and panels removed
**Command**: `test ! -d 'packages/converge-studio/src/components/dashboard' && test ! -d 'packages/converge-studio/src/components/panels' && test ! -d 'packages/converge-studio/src/components/onboarding' && test ! -d 'packages/converge-studio/src/components/modals'`

## gateway-libs-removed
**Description**: Gateway/websocket/device-identity lib modules removed
**Command**: `test ! -f 'packages/converge-studio/src/lib/websocket.ts' && test ! -f 'packages/converge-studio/src/lib/device-identity.ts' && test ! -f 'packages/converge-studio/src/lib/plugins.ts'`

## gateway-api-removed
**Description**: Gateway/openclaw/onboarding/projects API routes removed
**Command**: `test ! -d 'packages/converge-studio/src/app/api/gateways' && test ! -d 'packages/converge-studio/src/app/api/openclaw' && test ! -d 'packages/converge-studio/src/app/api/onboarding' && test ! -d 'packages/converge-studio/src/app/api/projects'`

## no-mission-control-literal
**Description**: The string 'Mission Control' does not appear in src/ or messages/ (LICENSE.upstream and NOTICE may keep it)
**Command**: `test -z "$(grep -ril 'mission control' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"`

## build-or-typecheck-passes
**Description**: Studio still typechecks after deletions
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`