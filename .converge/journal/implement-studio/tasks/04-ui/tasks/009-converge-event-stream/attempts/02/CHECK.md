# Checks: 04-ui/009-converge-event-stream

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## events-route-exists
**Description**: SSE endpoint exists at /api/events
**Command**: `test -f packages/converge-studio/src/app/api/events/route.ts`

## hook-exists
**Description**: useConvergeEvents hook exists
**Command**: `test -f packages/converge-studio/src/lib/use-converge-events.ts`

## no-legacy-websocket
**Description**: No file in src/ still references the legacy gateway/websocket boot
**Command**: `test -z "$(grep -rl 'useWebSocket\|STORAGE_GATEWAY_URL\|gateways/connect\|gateway-ws' packages/converge-studio/src 2>/dev/null)"`

## typecheck-passes
**Description**: Studio still typechecks
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`