export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listPlaybooks, createPlaybook, type NewPlaybookSpec } from '@/lib/converge-adapter';

async function withErrorHandling(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists') || error.message.includes('must be a lowercase')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('[playbooks/route]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return withErrorHandling(async () => {
    const items = await listPlaybooks();
    return NextResponse.json({ items });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = (await req.json()) as NewPlaybookSpec;
    await createPlaybook(body);
    return NextResponse.json({ ok: true, name: body.name }, { status: 201 });
  });
}