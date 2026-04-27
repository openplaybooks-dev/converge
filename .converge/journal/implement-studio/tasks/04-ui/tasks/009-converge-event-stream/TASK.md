---
id: 009-converge-event-stream
title: Converge-native event stream (SSE over filesystem watcher)
outputs:
  - packages/converge-studio/src/app/api/events
  - packages/converge-studio/src/lib/use-converge-events.ts
  - packages/converge-studio/src/components/live-activity.tsx
checks:
  - id: events-route-exists
    description: SSE endpoint exists at /api/events
    cmd: "test -f packages/converge-studio/src/app/api/events/route.ts"
  - id: hook-exists
    description: useConvergeEvents hook exists
    cmd: "test -f packages/converge-studio/src/lib/use-converge-events.ts"
  - id: no-legacy-websocket
    description: No file in src/ still references the legacy gateway/websocket boot
    cmd: "test -z \"$(grep -rl 'useWebSocket\\|STORAGE_GATEWAY_URL\\|gateways/connect\\|gateway-ws' packages/converge-studio/src 2>/dev/null)\""
  - id: typecheck-passes
    description: Studio still typechecks
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

The legacy `[[...panel]]` dashboard booted a websocket against a Mission Control gateway and showed an "Activity" feed of gateway protocol messages. With the gateway gone, the feed only ever shows reconnection errors. Replace it with a converge-native event source over the filesystem watcher.

**Why SSE, not websockets:** the data flow is one-way (server → client) and event-shaped. SSE is simpler, doesn't need a separate gateway process, reconnects automatically, and works through every reverse proxy without configuration.

**Reuse:** `src/lib/converge-adapter/watcher.ts` already exists and watches `.converge/playbooks/**` and `.converge/journal/**` via chokidar. This task wraps it; don't reimplement.

**Add `src/app/api/events/route.ts`** — a Next.js route handler with `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`. It:
1. Creates a `ReadableStream` whose `start(controller)` subscribes to the watcher.
2. Translates each watcher event into an SSE-framed string: `data: ${JSON.stringify(event)}\n\n`.
3. On `cancel`, unsubscribes from the watcher.
4. Returns `new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' } })`.
5. Sends a heartbeat `: ping\n\n` every 15 s so idle connections don't get dropped by proxies.

Event shape (keep small):
```ts
type ConvergeEvent =
  | { kind: 'playbook.changed'; playbook: string; path: string; at: string }
  | { kind: 'task.changed'; playbook: string; taskPath: string; at: string }
  | { kind: 'session.started'; playbook: string; sessionId: string; at: string }
  | { kind: 'session.event'; playbook: string; sessionId: string; eventName: string; at: string }
```

**Add `src/lib/use-converge-events.ts`** — a thin React hook:
```ts
export function useConvergeEvents(onEvent: (e: ConvergeEvent) => void): { connected: boolean }
```
Internally creates an `EventSource('/api/events')`, parses each `MessageEvent.data` as JSON, and calls `onEvent`. Tracks `readyState` for the `connected` flag. Cleans up on unmount. No reconnection logic — `EventSource` reconnects natively.

**Add `src/components/live-activity.tsx`** — a small component (≤ 120 LOC) that:
- Calls `useConvergeEvents` and keeps a ring buffer of the last 50 events in `useState`.
- Renders them in a list: timestamp · kind · context (playbook / taskPath / sessionId).
- No filters, no charts. The live event log is the entire UI.

**Do not** reintroduce `useWebSocket`, `STORAGE_GATEWAY_URL`, `gateways/connect`, the `LiveFeed` component, or the `ActivityFeedPanel`. They were deleted in task 001 and stay deleted.

**Verification:**
- `curl -N -s http://localhost:4000/api/events` opens an SSE stream and stays open. After running `touch .converge/playbooks/implement-studio/playbook.yml` in another shell, the stream emits at least one `data: {"kind":"playbook.changed",...}` line within 2 s.
- `curl http://localhost:4000/api/events` does not 404 or 500.
