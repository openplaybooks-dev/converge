export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import YAML from 'yaml';
import { readPlaybook } from '@/lib/converge-adapter/playbooks';
import { convergeDir, playbookTasksDir } from '@/lib/converge-adapter/paths';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const { raw } = await readPlaybook(name);
  const root = convergeDir();
  const tasksDir = playbookTasksDir(name, root);

  const tasks: Record<string, string> = {};

  async function walk(dir: string, prefix = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (entry.name === 'TASK.md') {
        const rel = prefix ? `${prefix}/TASK.md` : 'TASK.md';
        const content = await fs.readFile(path.join(dir, entry.name), 'utf8');
        tasks[rel] = content;
      }
    }
  }

  try {
    await walk(tasksDir);
  } catch {
    // tasks dir may not exist
  }

  const doc = { playbook: raw, tasks };
  const yaml = YAML.stringify(doc);

  return new Response(yaml, {
    headers: {
      'Content-Type': 'application/x-yaml',
      'Content-Disposition': `attachment; filename="${name}.playbook.yaml"`,
    },
  });
}
