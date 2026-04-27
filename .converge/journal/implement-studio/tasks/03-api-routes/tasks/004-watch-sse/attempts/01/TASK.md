# Task: 03-api-routes/004-watch-sse

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