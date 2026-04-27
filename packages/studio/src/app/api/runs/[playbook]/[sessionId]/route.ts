import { readMetadata } from '@/lib/converge-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ playbook: string; sessionId: string }> },
) {
  const { playbook, sessionId } = await params;
  return Response.json(await readMetadata(playbook, sessionId));
}
