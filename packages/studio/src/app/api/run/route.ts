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
