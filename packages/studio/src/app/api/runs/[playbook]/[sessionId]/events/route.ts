import { readEventsPaginated } from '@/lib/converge-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ playbook: string; sessionId: string }> },
) {
  const { playbook, sessionId } = await params;
  const { searchParams } = new URL(req.url);
  const offset = Number(searchParams.get('offset') ?? 0);
  const limit = Number(searchParams.get('limit') ?? 200);
  return Response.json({
    items: await readEventsPaginated(playbook, sessionId, { offset, limit }),
  });
}
