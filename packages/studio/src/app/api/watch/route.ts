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
      watcher.on('fs-change', handler);
      controller.enqueue(enc.encode(`event: ready\ndata: {}\n\n`));
      req.signal.addEventListener('abort', () => {
        watcher.off('fs-change', handler);
        controller.close();
      });
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}