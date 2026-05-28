import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveProjectDir } from '../../../../../src/lib/project-dir';
import { extractGapsFromEvents } from '../../../../../src/lib/mappers';
import type { JournalEvent } from '../../../../../src/types';

export const dynamic = 'force-dynamic';

function parseJsonl<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, 'utf-8');
  return content
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .flatMap(line => {
      try { return [JSON.parse(line) as T]; }
      catch { return []; }
    });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const projectDir = resolveProjectDir(request);
  if (!projectDir) {
    return NextResponse.json({ error: 'CONVERGE_PROJECT_DIR not set' }, { status: 500 });
  }

  const eventsPath = join(projectDir, '.converge', 'journal', name, 'events.jsonl');
  const events = parseJsonl<JournalEvent>(eventsPath);
  const gaps = extractGapsFromEvents(events);

  return NextResponse.json(gaps);
}
