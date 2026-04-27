export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getRun } from '@/lib/run-supervisor';

export async function GET(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const handle = getRun(runId);
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
