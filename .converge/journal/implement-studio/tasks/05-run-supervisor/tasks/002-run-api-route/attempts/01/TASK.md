# Task: 05-run-supervisor/002-run-api-route

Wire the run launcher to the supervisor.

**`src/app/api/run/route.ts`** — `POST` to start a run:

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { startRun } from '@/lib/run-supervisor';

export async function POST(req: Request) {
  const { playbook, inputs } = (await req.json()) as { playbook: string; inputs?: Record<string, unknown> };
  if (!playbook) return Response.json({ error: 'playbook required' }, { status: 400 });
  try {
    const h = startRun(playbook, inputs);
    return Response.json({ runId: h.runId, pid: h.pid, startedAt: h.startedAt }, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 409 });
  }
}
```

**`src/app/api/run/[runId]/stream/route.ts`** — SSE for stdout/stderr/exit:

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getRun } from '@/lib/run-supervisor';

export async function GET(req: Request, { params }: { params: { runId: string } }) {
  const handle = getRun(params.runId);
  if (!handle) return new Response('not found', { status: 404 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown, id?: string) =>
        controller.enqueue(enc.encode(
          (id ? `id: ${id}\n` : '') + `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        ));

      // Replay: include current ring-buffer contents
      const bo = handle.stdout.read();
      const be = handle.stderr.read();
      if (bo.length) send('stdout', bo.toString('utf8'));
      if (be.length) send('stderr', be.toString('utf8'));
      if (handle.sessionId) send('session', { sessionId: handle.sessionId });

      const onOut = (c: Buffer) => send('stdout', c.toString('utf8'));
      const onErr = (c: Buffer) => send('stderr', c.toString('utf8'));
      const onSession = (info: { sessionId: string }) => send('session', info);
      const onExit = (info: { code: number }) => { send('exit', info); controller.close(); };

      handle.emitter.on('stdout-chunk', onOut);
      handle.emitter.on('stderr-chunk', onErr);
      handle.emitter.on('session-detected', onSession);
      handle.emitter.on('exit', onExit);

      req.signal.addEventListener('abort', () => {
        handle.emitter.off('stdout-chunk', onOut);
        handle.emitter.off('stderr-chunk', onErr);
        handle.emitter.off('session-detected', onSession);
        handle.emitter.off('exit', onExit);
        controller.close();
      });

      if (handle.status === 'exited') {
        send('exit', { code: handle.exitCode ?? -1 });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

**Last-Event-ID resume**: nice-to-have for MVP. If implementing, attach a sequence id to each chunk pushed into the ring buffer and include it in the `id:` SSE field; on reconnect read the request's `Last-Event-ID` header and skip chunks ≤ that id.