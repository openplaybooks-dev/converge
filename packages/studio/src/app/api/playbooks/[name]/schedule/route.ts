export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readSchedule, writeSchedule } from '@/lib/converge-adapter/schedule';

async function withErrorHandling(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('Invalid cron')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('[playbooks/[name]/schedule/route]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  return withErrorHandling(async () => {
    const { name } = await params;
    const schedule = await readSchedule(name);
    return NextResponse.json(schedule);
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  return withErrorHandling(async () => {
    const { name } = await params;
    const body = await req.json() as { cron?: string | null; timezone?: string | null; enabled?: boolean };

    await writeSchedule(name, {
      cron: body.cron ?? null,
      timezone: body.timezone ?? null,
      enabled: body.enabled ?? false,
    });

    return NextResponse.json({ success: true });
  });
}