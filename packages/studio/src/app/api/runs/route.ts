import { listPlaybooks, listSessions } from '@/lib/converge-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('playbook');
  const playbooks = filter ? [{ name: filter }] : await listPlaybooks();
  const all = (await Promise.all(playbooks.map((p) => listSessions(p.name)))).flat();
  all.sort((a, b) => (b.startTime ?? '').localeCompare(a.startTime ?? ''));
  return Response.json({ items: all });
}
