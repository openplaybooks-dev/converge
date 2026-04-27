export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { resetTask } from '@/lib/converge-adapter';

export async function POST(_req: Request, { params }: { params: Promise<{ name: string; path: string[] }> }) {
  const { name, path } = await params;
  await resetTask(name, path.join('/'));
  return Response.json({ ok: true });
}
