import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { playbookTasksDir, tasksJournalDir } from './paths';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter';
import { CheckpointSchema } from '@converge/core/studio-api';
import { z } from 'zod';

export interface TaskSummary {
  taskPath: string;
  title?: string;
  hasChildren: boolean;
  blocking?: boolean;
}

function journalIdToFsSegments(taskPath: string): string[] {
  const norm = taskPath.replace(/\\/g, '/').replace(/^\/+|\/+$/, '');
  const segments = norm.split('/');
  const out: string[] = ['tasks', segments[0]];
  for (let i = 1; i < segments.length; i++) {
    out.push('spawned', segments[i]);
  }
  return out;
}

export async function listTasks(playbook: string, root?: string): Promise<TaskSummary[]> {
  const tasksRoot = playbookTasksDir(playbook, root);
  const results: TaskSummary[] = [];

  async function walk(dir: string, relativePrefix: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const taskMdExists = entries.some(e => e.name === 'TASK.md' && e.isFile());
    if (taskMdExists) {
      const taskDir = path.dirname(dir);
      const rel = path.relative(tasksRoot, taskDir).replace(/\\/g, '/');
      const frontmatter = await parseTaskFrontmatter(playbook, rel, root);
      results.push({
        taskPath: rel,
        title: frontmatter.title as string | undefined,
        hasChildren: entries.some(e => e.isDirectory() && e.name === 'tasks'),
        blocking: frontmatter.blocking as boolean | undefined,
      });
    }
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'tasks') {
        const subDir = path.join(dir, entry.name);
        const subRel = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
        await walk(subDir, subRel);
      }
    }
  }

  async function parseTaskFrontmatter(pb: string, tp: string, r?: string): Promise<Record<string, unknown>> {
    try {
      const fullPath = path.join(playbookTasksDir(pb, r), tp, 'TASK.md');
      const text = await fs.readFile(fullPath, 'utf-8');
      return parseFrontmatter(text).data;
    } catch {
      return {};
    }
  }

  await walk(tasksRoot, '');
  return results;
}

export async function readTaskMd(
  playbook: string,
  taskPath: string,
  root?: string,
): Promise<{ frontmatter: Record<string, unknown>; body: string }> {
  const fullPath = path.join(playbookTasksDir(playbook, root), taskPath, 'TASK.md');
  const text = await fs.readFile(fullPath, 'utf-8');
  const { data, content } = parseFrontmatter(text);
  return { frontmatter: data, body: content };
}

export async function writeTaskMd(
  playbook: string,
  taskPath: string,
  frontmatter: Record<string, unknown>,
  body: string,
  root?: string,
): Promise<void> {
  const fullPath = path.join(playbookTasksDir(playbook, root), taskPath, 'TASK.md');
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, serializeFrontmatter(frontmatter, body), 'utf-8');
}

export async function readCheckpoint(
  playbook: string,
  taskPath: string,
  root?: string,
): Promise<z.infer<typeof CheckpointSchema> | null> {
  const fsSegments = journalIdToFsSegments(taskPath);
  const fullPath = path.join(tasksJournalDir(playbook, root), ...fsSegments, 'checkpoint.json');
  try {
    const text = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function resetTask(playbook: string, taskPath: string, root?: string): Promise<void> {
  const fsSegments = journalIdToFsSegments(taskPath);
  const taskDir = path.join(tasksJournalDir(playbook, root), ...fsSegments);
  try {
    await fs.rm(taskDir, { recursive: true, force: true });
  } catch {
    // already absent
  }
}
