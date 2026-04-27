export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { listTasks } from '@/lib/converge-adapter';

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const items = await listTasks(name);
  return Response.json({ items });
}
