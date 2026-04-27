export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { readTaskMd, writeTaskMd, resetTask } from '@/lib/converge-adapter';

export async function GET(_req: Request, { params }: { params: Promise<{ name: string; path: string[] }> }) {
  const { name, path } = await params;
  const taskPath = path.join('/');
  const data = await readTaskMd(name, taskPath);
  return Response.json(data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ name: string; path: string[] }> }) {
  const { name, path } = await params;
  const taskPath = path.join('/');
  const { frontmatter, body } = (await req.json()) as { frontmatter: Record<string, unknown>; body: string };
  await writeTaskMd(name, taskPath, frontmatter, body);
  return Response.json({ ok: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ name: string; path: string[] }> }) {
  const { name, path } = await params;
  const url = new URL(req.url);
  if (url.searchParams.get('reset') === 'true') {
    await resetTask(name, path.join('/'));
    return Response.json({ ok: true });
  }
  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
