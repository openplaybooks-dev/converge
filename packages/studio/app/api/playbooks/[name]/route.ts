import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveProjectDir } from '../../../../src/lib/project-dir';
import { mapRunStateNode, mapRuntimeGoal } from '../../../../src/lib/mappers';
import type { PlaybookDetail, RunConfig } from '../../../../src/types';

export const dynamic = 'force-dynamic';

function parseTaskHandoff(taskMd: string): { artifact: string; format?: 'md' | 'html'; generate?: string; skill?: string } | null {
  const lines = taskMd.split(/\r?\n/);
  const start = lines.findIndex(line => /^handoff:\s*$/.test(line));
  if (start < 0) return null;

  const handoff: { artifact?: string; format?: 'md' | 'html'; generate?: string; skill?: string } = {};
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (!/^\s+/.test(line)) break;
    const trimmed = line.trim();
    const artifact = trimmed.match(/^artifact:\s*(.+)$/);
    const format = trimmed.match(/^format:\s*(.+)$/);
    const generate = trimmed.match(/^generate:\s*(.+)$/);
    const skill = trimmed.match(/^skill:\s*(.+)$/);
    const artifactValue = artifact?.[1];
    const formatValue = format?.[1];
    const generateValue = generate?.[1];
    const skillValue = skill?.[1];
    if (artifactValue) handoff.artifact = artifactValue.trim();
    else if (formatValue) handoff.format = formatValue.trim() as 'md' | 'html';
    else if (generateValue) handoff.generate = generateValue.trim();
    else if (skillValue) handoff.skill = skillValue.trim();
  }

  return typeof handoff.artifact === 'string' && handoff.artifact.trim()
    ? { artifact: handoff.artifact.trim(), format: handoff.format, generate: handoff.generate, skill: handoff.skill }
    : null;
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
        const firstLine = (lines[descIdx] ?? '').replace(/^description:\s*/, '').trim();
        if (firstLine === '>' || firstLine === '|') {
          const indented: string[] = [];
          for (let i = descIdx + 1; i < lines.length; i++) {
            const line = lines[i] ?? '';
            if (line.match(/^\s+/)) indented.push(line.trim());
            else break;
          }
          description = indented.join(' ');
        } else {
          description = firstLine.replace(/^["']|["']$/g, '');
        }
      }

      const maxAttempts = raw.match(/maxTaskAttempts:\s*(\d+)/);
      const workers = raw.match(/workers:\s*(\d+)/);
      const maxAttemptsValue = maxAttempts?.[1];
      const workersValue = workers?.[1];
      if (maxAttemptsValue) runConfig.maxTaskAttempts = parseInt(maxAttemptsValue);
      if (workersValue) runConfig.workers = parseInt(workersValue);
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

    taskNodes = taskNodes.map(task => {
      if (task.handoff || !task.sourcePath || !existsSync(task.sourcePath)) return task;
      try {
        const handoff = parseTaskHandoff(readFileSync(task.sourcePath, 'utf-8'));
        return handoff ? { ...task, handoff } : task;
      } catch {
        return task;
      }
    });

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
