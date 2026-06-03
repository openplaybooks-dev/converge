import { NextResponse } from 'next/server';
import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { resolveProjectDir } from '../../../../../src/lib/project-dir';

export const dynamic = 'force-dynamic';

interface CommentEvent {
  event: 'comment.add';
  taskId: string;
  body: string;
  kind: 'comment' | 'rework';
  timestamp: string;
}

interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  kind: 'comment' | 'rework';
  timestamp: string;
}

function commentsPath(projectDir: string, name: string): string {
  return join(projectDir, '.converge', 'inventory', name, 'comments.jsonl');
}

function readComments(path: string): TaskComment[] {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, 'utf-8');
  const out: TaskComment[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const ev = JSON.parse(trimmed) as CommentEvent;
      if (ev.event !== 'comment.add') continue;
      if (typeof ev.taskId !== 'string' || typeof ev.body !== 'string') continue;
      const kind = ev.kind === 'rework' ? 'rework' : 'comment';
      out.push({
        id: `${ev.timestamp}-${ev.taskId}`,
        taskId: ev.taskId,
        body: ev.body,
        kind,
        timestamp: ev.timestamp,
      });
    } catch { /* skip malformed line */ }
  }
  return out;
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

  const url = new URL(request.url);
  const taskId = url.searchParams.get('taskId');

  let comments = readComments(commentsPath(projectDir, name));
  if (taskId) comments = comments.filter(c => c.taskId === taskId);
  comments.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return NextResponse.json({ comments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const projectDir = resolveProjectDir(request);
  if (!projectDir) {
    return NextResponse.json({ error: 'CONVERGE_PROJECT_DIR not set' }, { status: 500 });
  }

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }); }

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : '';
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  const kind: 'comment' | 'rework' = body.kind === 'rework' ? 'rework' : 'comment';

  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'body required' }, { status: 400 });

  const timestamp = new Date().toISOString();
  const event: CommentEvent = { event: 'comment.add', taskId, body: text, kind, timestamp };

  const path = commentsPath(projectDir, name);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(event) + '\n', 'utf-8');

  const comment: TaskComment = {
    id: `${timestamp}-${taskId}`,
    taskId,
    body: text,
    kind,
    timestamp,
  };
  return NextResponse.json({ comment });
}
