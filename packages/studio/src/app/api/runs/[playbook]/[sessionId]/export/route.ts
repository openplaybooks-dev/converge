export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readMetadata, readEventsPaginated } from '@/lib/converge-adapter/sessions';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ playbook: string; sessionId: string }> }
) {
  const { playbook, sessionId } = await params;
  const metadata = await readMetadata(playbook, sessionId);
  const events = await readEventsPaginated(playbook, sessionId, { offset: 0, limit: 50000 });
  return NextResponse.json(
    { ...metadata, events },
    {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="session-${playbook}-${sessionId}.json"`,
      },
    }
  );
}
