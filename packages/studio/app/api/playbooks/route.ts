import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectDir } from '../../../src/lib/project-dir';
import { mapRunState } from '../../../src/lib/mappers';
import type { PlaybookSummary } from '../../../src/types';

export async function GET() {
  const projectDir = getProjectDir();
  if (!projectDir) {
    return NextResponse.json({ error: 'CONVERGE_PROJECT_DIR not set' }, { status: 500 });
  }

  try {
    const playbooksDir = join(projectDir, '.converge', 'playbooks');
    if (!existsSync(playbooksDir)) {
      return NextResponse.json([]);
    }

    const { readdirSync, statSync } = await import('node:fs');
    const entries = readdirSync(playbooksDir, { withFileTypes: true });
    const summaries: PlaybookSummary[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      const ymlPath = join(playbooksDir, name, 'playbook.yml');
      if (!existsSync(ymlPath)) continue;

      let description = '';
      try {
        const raw = readFileSync(ymlPath, 'utf-8');
        const lines = raw.split(/\r?\n/);
        const descIdx = lines.findIndex(l => l.startsWith('description:'));
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
      } catch { /* skip */ }

      let status = 'pending';
      let updatedAt = new Date().toISOString();
      let taskCount = 0;

      const runstatePath = join(projectDir, '.converge', 'journal', name, 'runstate.json');
      if (existsSync(runstatePath)) {
        try {
          const rs = JSON.parse(readFileSync(runstatePath, 'utf-8'));
          status = rs.metadata?.status || 'pending';
          updatedAt = rs.metadata?.completed_at || rs.metadata?.generated_at || updatedAt;
          taskCount = rs.metadata?.total_nodes || Object.keys(rs.dag?.nodes || {}).length;
        } catch { /* skip */ }
      }

      summaries.push({ name, description, status, updatedAt, taskCount });
    }

    return NextResponse.json(summaries);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
