import { tailEvents } from '@/lib/converge-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ playbook: string; sessionId: string }> },
) {
  const { playbook, sessionId } = await params;
  const lastEventId = req.headers.get('Last-Event-ID');
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let id = 0;
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      try {
        for await (const ev of tailEvents(playbook, sessionId)) {
          if (req.signal.aborted) break;
          if (lastEventId && id <= Number(lastEventId)) continue;
          id++;
          send('event', ev);
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
