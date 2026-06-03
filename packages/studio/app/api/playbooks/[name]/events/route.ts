import { NextResponse } from 'next/server';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveProjectDir } from '../../../../../src/lib/project-dir';
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

function collectEvents(journalDir: string): JournalEvent[] {
  const events: JournalEvent[] = [];

  const topEvents = join(journalDir, 'events.jsonl');
  events.push(...parseJsonl<JournalEvent>(topEvents));

  const tasksDir = join(journalDir, 'tasks');
  if (existsSync(tasksDir)) {
    try {
      for (const taskEntry of readdirSync(tasksDir, { withFileTypes: true })) {
        if (!taskEntry.isDirectory()) continue;
        const taskEventsPath = join(tasksDir, taskEntry.name, 'logs', 'events.jsonl');
        events.push(...parseJsonl<JournalEvent>(taskEventsPath));

        const attemptsDir = join(tasksDir, taskEntry.name, 'attempts');
        if (existsSync(attemptsDir)) {
          for (const attemptEntry of readdirSync(attemptsDir, { withFileTypes: true })) {
            if (!attemptEntry.isDirectory()) continue;
            const attemptEvents = join(attemptsDir, attemptEntry.name, 'logs', 'events.jsonl');
            events.push(...parseJsonl<JournalEvent>(attemptEvents));
          }
        }
      }
    } catch { /* skip */ }
  }

  events.sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''));
  return events;
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

  const journalDir = join(projectDir, '.converge', 'journal', name);
  if (!existsSync(journalDir)) {
    return NextResponse.json([]);
  }

  try {
    let events = collectEvents(journalDir);

    const url = new URL(request.url);
    const last = url.searchParams.get('last');
    const since = url.searchParams.get('since');
    const eventType = url.searchParams.get('eventType');

    if (since) {
      events = events.filter(e => e.timestamp > since);
    }
    if (eventType) {
      const types = eventType.split(',');
      events = events.filter(e => types.includes(e.eventType));
    }
    if (last) {
      events = events.slice(-parseInt(last, 10));
    }

    return NextResponse.json(events);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
