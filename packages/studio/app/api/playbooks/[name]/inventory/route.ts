import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectDir } from '../../../../../src/lib/project-dir';

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

interface GoalEvent {
  event: string;
  goal?: any;
  goalId?: string;
  status?: string;
  timestamp: string;
}

function replayGoals(events: GoalEvent[]): any[] {
  const goals = new Map<string, any>();
  for (const ev of events) {
    if (ev.event === 'goal.upsert' && ev.goal) {
      const existing = goals.get(ev.goal.id);
      goals.set(ev.goal.id, {
        ...ev.goal,
        status_runtime: existing?.status_runtime ?? 'pending',
        createdAt: existing?.createdAt ?? ev.timestamp,
        updatedAt: ev.timestamp,
      });
    } else if (ev.event === 'goal.status' && ev.goalId) {
      const existing = goals.get(ev.goalId);
      if (existing) {
        goals.set(ev.goalId, {
          ...existing,
          status_runtime: ev.status,
          updatedAt: ev.timestamp,
        });
      }
    }
  }
  return Array.from(goals.values());
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

  const inventoryDir = join(projectDir, '.converge', 'inventory', name);
  const tasksPath = join(inventoryDir, 'tasks.jsonl');
  const goalsPath = join(inventoryDir, 'goals.jsonl');

  const tasks = parseJsonl<any>(tasksPath).filter(row => typeof row.id === 'string');
  const goalEvents = parseJsonl<GoalEvent>(goalsPath);
  const goals = replayGoals(goalEvents);

  return NextResponse.json({ tasks, goals });
}
