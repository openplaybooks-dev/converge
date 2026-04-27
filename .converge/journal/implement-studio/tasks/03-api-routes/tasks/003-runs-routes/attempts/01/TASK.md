# Task: 03-api-routes/003-runs-routes

Implement runs listing, single-session metadata, paginated events, and SSE event tail.

**Path scheme**: sessions are scoped per-playbook in converge (`.converge/journal/<playbook>/sessions/<sessionId>`), so the route must be `/api/runs/[playbook]/[sessionId]`.

**`api/runs/route.ts`** — `GET` lists sessions across all playbooks (or filter via `?playbook=`):

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { listPlaybooks, listSessions } from '@/lib/converge-adapter';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('playbook');
  const playbooks = filter ? [{ name: filter }] : await listPlaybooks();
  const all = (await Promise.all(playbooks.map(p => listSessions(p.name)))).flat();
  all.sort((a, b) => (b.startTime ?? '').localeCompare(a.startTime ?? ''));
  return Response.json({ items: all });
}
```

**`runs/[playbook]/[sessionId]/route.ts`** — metadata:

```ts
import { readMetadata } from '@/lib/converge-adapter';

export async function GET(_req: Request, { params }: { params: { playbook: string; sessionId: string } }) {
  return Response.json(await readMetadata(params.playbook, params.sessionId));
}
```

**`events/route.ts`** — paginated events:

```ts
import { readEventsPaginated } from '@/lib/converge-adapter';

export async function GET(req: Request, { params }: { params: { playbook: string; sessionId: string } }) {
  const { searchParams } = new URL(req.url);
  const offset = Number(searchParams.get('offset') ?? 0);
  const limit = Number(searchParams.get('limit') ?? 200);
  return Response.json({
    items: await readEventsPaginated(params.playbook, params.sessionId, { offset, limit }),
  });
}
```

**`stream/route.ts`** — SSE tail:

```ts
import { tailEvents } from '@/lib/converge-adapter';

export async function GET(req: Request, { params }: { params: { playbook: string; sessionId: string } }) {
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        for await (const ev of tailEvents(params.playbook, params.sessionId)) {
          if (req.signal.aborted) break;
          send('event', ev);
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
```

**Resume support**: support `Last-Event-ID` header so reconnecting clients skip already-seen events. Set the SSE `id:` field per event.