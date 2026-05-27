import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectDir } from '../../../../../src/lib/project-dir';
import { extractGapsFromEvents } from '../../../../../src/lib/mappers';
import type { JournalEvent } from '../../../../../src/types';

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
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const projectDir = getProjectDir();
  if (!projectDir) {
    return NextResponse.json({ error: 'CONVERGE_PROJECT_DIR not set' }, { status: 500 });
  }

  const eventsPath = join(projectDir, '.converge', 'journal', name, 'events.jsonl');
  const events = parseJsonl<JournalEvent>(eventsPath);
  const gaps = extractGapsFromEvents(events);

  return NextResponse.json(gaps);
}
