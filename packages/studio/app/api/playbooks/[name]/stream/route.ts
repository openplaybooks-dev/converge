import { existsSync, readFileSync, watch, statSync, openSync, readSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectDir } from '../../../../../src/lib/project-dir';
import { mapRunState } from '../../../../../src/lib/mappers';
import type { JournalEvent } from '../../../../../src/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const projectDir = getProjectDir();
  if (!projectDir) {
    return new Response(JSON.stringify({ error: 'CONVERGE_PROJECT_DIR not set' }), { status: 500 });
  }

  const journalDir = join(projectDir, '.converge', 'journal', name);
  const runstatePath = join(journalDir, 'runstate.json');
  const eventsPath = join(journalDir, 'events.jsonl');
  const tasksJsonlPath = join(projectDir, '.converge', 'inventory', name, 'tasks.jsonl');

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const watchers: ReturnType<typeof watch>[] = [];
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let eventsOffset = 0;
      let tasksOffset = 0;

      try { eventsOffset = existsSync(eventsPath) ? statSync(eventsPath).size : 0; } catch {}
      try { tasksOffset = existsSync(tasksJsonlPath) ? statSync(tasksJsonlPath).size : 0; } catch {}

      function send(event: string, data: any) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { closed = true; }
      }

      // Send initial runstate
      if (existsSync(runstatePath)) {
        try {
          const rs = JSON.parse(readFileSync(runstatePath, 'utf-8'));
          send('runstate', mapRunState(rs));
        } catch {}
      }

      function onRunstateChange() {
        if (closed) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          try {
            if (existsSync(runstatePath)) {
              const rs = JSON.parse(readFileSync(runstatePath, 'utf-8'));
              send('runstate', mapRunState(rs));
            }
          } catch {}
        }, 100);
      }

      function readNewLines(filePath: string, offset: number): { lines: string[]; newOffset: number } {
        try {
          const size = statSync(filePath).size;
          if (size <= offset) return { lines: [], newOffset: offset };
          const buf = Buffer.alloc(size - offset);
          const fd = openSync(filePath, 'r');
          readSync(fd, buf, 0, buf.length, offset);
          closeSync(fd);
          const text = buf.toString('utf-8');
          const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
          return { lines, newOffset: size };
        } catch {
          return { lines: [], newOffset: offset };
        }
      }

      function onEventsChange() {
        if (closed) return;
        const { lines, newOffset } = readNewLines(eventsPath, eventsOffset);
        eventsOffset = newOffset;
        for (const line of lines) {
          try {
            const ev = JSON.parse(line) as JournalEvent;
            send('journal', ev);
          } catch {}
        }
      }

      function onInventoryChange() {
        if (closed) return;
        const { lines, newOffset } = readNewLines(tasksJsonlPath, tasksOffset);
        tasksOffset = newOffset;
        if (lines.length > 0) {
          send('inventory', { updated: true });
        }
      }

      // Watch files
      if (existsSync(journalDir)) {
        try {
          const rsWatcher = watch(runstatePath, onRunstateChange);
          watchers.push(rsWatcher);
        } catch {}
        try {
          const evWatcher = watch(eventsPath, onEventsChange);
          watchers.push(evWatcher);
        } catch {}
      }

      const inventoryDir = join(projectDir, '.converge', 'inventory', name);
      if (existsSync(inventoryDir)) {
        try {
          const invWatcher = watch(tasksJsonlPath, onInventoryChange);
          watchers.push(invWatcher);
        } catch {}
      }

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        try { controller.enqueue(encoder.encode(': heartbeat\n\n')); }
        catch { closed = true; clearInterval(heartbeat); }
      }, 15000);

      // Cleanup on close — store reference for cancel
      (controller as any).__cleanup = () => {
        closed = true;
        clearInterval(heartbeat);
        if (debounceTimer) clearTimeout(debounceTimer);
        for (const w of watchers) { try { w.close(); } catch {} }
      };
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
