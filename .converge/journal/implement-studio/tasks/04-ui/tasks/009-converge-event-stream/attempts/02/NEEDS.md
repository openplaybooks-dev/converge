# Needs: 04-ui/009-converge-event-stream

## Expected Outputs

- `packages/converge-studio/src/app/api/events`
- `packages/converge-studio/src/lib/use-converge-events.ts`
- `packages/converge-studio/src/components/live-activity.tsx`

## Checks

- **events-route-exists**: SSE endpoint exists at /api/events
- **hook-exists**: useConvergeEvents hook exists
- **no-legacy-websocket**: No file in src/ still references the legacy gateway/websocket boot
- **typecheck-passes**: Studio still typechecks
