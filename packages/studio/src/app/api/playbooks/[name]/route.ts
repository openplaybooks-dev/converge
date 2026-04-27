export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readPlaybook, writePlaybook } from '@/lib/converge-adapter';

async function withErrorHandling(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('Validation failed')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('[playbooks/[name]/route]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  return withErrorHandling(async () => {
    const { name } = await params;
    const { raw, parsed } = await readPlaybook(name);
    return NextResponse.json({ raw, parsed });
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  return withErrorHandling(async () => {
    const { name } = await params;
    const { yaml } = (await req.json()) as { yaml: string };
    await writePlaybook(name, yaml);
    return NextResponse.json({ ok: true });
  });
}