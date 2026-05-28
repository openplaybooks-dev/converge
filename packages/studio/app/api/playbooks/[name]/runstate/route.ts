import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveProjectDir } from '../../../../../src/lib/project-dir';
import { mapRunState } from '../../../../../src/lib/mappers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const projectDir = resolveProjectDir(request);
  if (!projectDir) {
    return NextResponse.json({ error: 'CONVERGE_PROJECT_DIR not set' }, { status: 500 });
  }

  const runstatePath = join(projectDir, '.converge', 'journal', name, 'runstate.json');
  if (!existsSync(runstatePath)) {
    return NextResponse.json(null);
  }

  try {
    const raw = readFileSync(runstatePath, 'utf-8');
    const coreRunState = JSON.parse(raw);
    return NextResponse.json(mapRunState(coreRunState));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
