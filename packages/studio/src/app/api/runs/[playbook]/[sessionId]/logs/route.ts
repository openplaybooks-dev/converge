import { readEventsPaginated } from '@/lib/converge-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ playbook: string; sessionId: string }> },
) {
  const { playbook, sessionId } = await params;
  const { searchParams } = new URL(req.url);

  const level = searchParams.get('level');
  const since = searchParams.get('since');
  const limit = Math.min(Number(searchParams.get('limit') ?? 500), 5000);

  const allEvents = await readEventsPaginated(playbook, sessionId, { offset: 0, limit: 5000 });

  let filtered = allEvents;

  if (level && level !== 'all') {
    filtered = filtered.filter(e => e.level === level);
  }

  if (since) {
    const sinceMs = new Date(since).getTime();
    filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= sinceMs);
  }

  const items = filtered.slice(0, limit);

  return Response.json({ items });
}
