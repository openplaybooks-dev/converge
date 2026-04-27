---
id: 004-watch-sse
title: /api/watch SSE filesystem-change stream
dependencies:
  - 001-playbooks-routes
outputs:
  - packages/converge-studio/src/app/api/watch/route.ts
  - packages/converge-studio/src/lib/watcher-singleton.ts
checks:
  - id: watch-route-exists
    description: Watch route exists
    cmd: "test -f packages/converge-studio/src/app/api/watch/route.ts"
  - id: nodejs-runtime
    description: Route exports runtime = 'nodejs'
    cmd: "grep -q \"runtime = 'nodejs'\" packages/converge-studio/src/app/api/watch/route.ts"
  - id: singleton-watcher
    description: Watcher is a module-level singleton (avoids one watcher per request)
    cmd: "test -f packages/converge-studio/src/lib/watcher-singleton.ts && grep -q 'getWatcher\\|sharedWatcher' packages/converge-studio/src/lib/watcher-singleton.ts"
  - id: typecheck
    description: Module typechecks
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Expose the filesystem watcher as an SSE stream so the UI auto-refreshes on `.converge/` changes.

**`src/lib/watcher-singleton.ts`**:

```ts
import { ConvergeWatcher, resolveProjectRoot } from './converge-adapter/index.js';

let _watcher: ConvergeWatcher | undefined;

export function getWatcher(): ConvergeWatcher {
  if (!_watcher) {
    _watcher = new ConvergeWatcher(resolveProjectRoot());
    _watcher.start();
    process.on('exit', () => _watcher?.stop());
  }
  return _watcher;
}
```

This makes one watcher per Node process — multiple SSE subscribers share it via `EventEmitter` listeners.

**`src/app/api/watch/route.ts`**:

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getWatcher } from '@/lib/watcher-singleton';

export async function GET(req: Request) {
  const watcher = getWatcher();
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const handler = (ev: unknown) => {
        if (req.signal.aborted) return;
        controller.enqueue(enc.encode(`event: change\ndata: ${JSON.stringify(ev)}\n\n`));
      };
      watcher.on('change', handler);
      // initial heartbeat
      controller.enqueue(enc.encode(`event: ready\ndata: {}\n\n`));
      req.signal.addEventListener('abort', () => {
        watcher.off('change', handler);
        controller.close();
      });
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

**Risk**: with many simultaneous SSE clients, the watcher emitter listener cap (default 10) will warn. Bump it on the singleton: `_watcher.setMaxListeners(100)`.
