import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectDir } from '../../../../src/lib/project-dir';
import { mapRunStateNode, mapRuntimeGoal } from '../../../../src/lib/mappers';
import type { PlaybookDetail, RunConfig } from '../../../../src/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const projectDir = getProjectDir();
  if (!projectDir) {
    return NextResponse.json({ error: 'CONVERGE_PROJECT_DIR not set' }, { status: 500 });
  }

  try {
    const playbookYml = join(projectDir, '.converge', 'playbooks', name, 'playbook.yml');
    if (!existsSync(playbookYml)) {
      return NextResponse.json({ error: `Playbook "${name}" not found` }, { status: 404 });
    }

    let description = '';
    let runConfig: RunConfig = {};
    try {
      const raw = readFileSync(playbookYml, 'utf-8');
      const lines = raw.split(/\r?\n/);
      const descIdx = lines.findIndex((l: string) => l.startsWith('description:'));
      if (descIdx >= 0) {
        const firstLine = lines[descIdx].replace(/^description:\s*/, '').trim();
        if (firstLine === '>' || firstLine === '|') {
          const indented: string[] = [];
          for (let i = descIdx + 1; i < lines.length; i++) {
            if (lines[i].match(/^\s+/)) indented.push(lines[i].trim());
            else break;
          }
          description = indented.join(' ');
        } else {
          description = firstLine.replace(/^["']|["']$/g, '');
        }
      }

      const maxAttempts = raw.match(/maxTaskAttempts:\s*(\d+)/);
      const workers = raw.match(/workers:\s*(\d+)/);
      const maxIter = raw.match(/maxIterations:\s*(\d+)/);
      if (maxAttempts) runConfig.maxTaskAttempts = parseInt(maxAttempts[1]);
      if (workers) runConfig.workers = parseInt(workers[1]);
      if (maxIter) runConfig.maxIterations = parseInt(maxIter[1]);
    } catch { /* skip */ }

    let status = 'pending';
    let updatedAt = new Date().toISOString();
    let taskNodes: any[] = [];

    const runstatePath = join(projectDir, '.converge', 'journal', name, 'runstate.json');
    if (existsSync(runstatePath)) {
      try {
        const rs = JSON.parse(readFileSync(runstatePath, 'utf-8'));
        status = rs.metadata?.status || 'pending';
        updatedAt = rs.metadata?.completed_at || rs.metadata?.generated_at || updatedAt;
        taskNodes = Object.values(rs.dag?.nodes || {}).map((n: any) => mapRunStateNode(n));
      } catch { /* skip */ }
    }

    let goals: any[] = [];
    try {
      const goalsPath = join(projectDir, '.converge', 'inventory', name, 'goals.jsonl');
      if (existsSync(goalsPath)) {
        const goalsContent = readFileSync(goalsPath, 'utf-8');
        const goalEvents = goalsContent
          .split(/\r?\n/)
          .filter(l => l.trim().length > 0)
          .flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } });

        const goalMap = new Map<string, any>();
        for (const ev of goalEvents) {
          if (ev.event === 'goal.upsert' && ev.goal) {
            const existing = goalMap.get(ev.goal.id);
            goalMap.set(ev.goal.id, {
              ...ev.goal,
              status_runtime: existing?.status_runtime ?? 'pending',
            });
          } else if (ev.event === 'goal.status' && ev.goalId) {
            const existing = goalMap.get(ev.goalId);
            if (existing) goalMap.set(ev.goalId, { ...existing, status_runtime: ev.status });
          }
        }
        goals = Array.from(goalMap.values()).map(mapRuntimeGoal);
      }
    } catch { /* skip — inventory may not exist */ }

    const detail: PlaybookDetail = {
      name,
      description,
      status,
      updatedAt,
      taskCount: taskNodes.length,
      tasks: taskNodes,
      goals,
      runConfig,
    };

    return NextResponse.json(detail);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
