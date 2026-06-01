import { NextResponse } from 'next/server';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ error: 'path query param required' }, { status: 400 });
  }

  if (!existsSync(path)) {
    return NextResponse.json({ error: `Path does not exist: ${path}` }, { status: 404 });
  }

  const convergeDir = join(path, '.converge');
  if (!existsSync(convergeDir)) {
    return NextResponse.json(
      { error: `Not a converge workspace (no .converge/ directory at ${path})` },
      { status: 404 },
    );
  }

  let name = basename(path);
  let description = '';
  const projectYaml = join(convergeDir, 'project.yaml');
  const projectYml = join(convergeDir, 'project.yml');
  const projectFile = existsSync(projectYaml) ? projectYaml : (existsSync(projectYml) ? projectYml : '');
  if (projectFile) {
    try {
      const raw = readFileSync(projectFile, 'utf-8');
      const nameMatch = raw.match(/^name:\s*(.+)$/m);
      const nameValue = nameMatch?.[1];
      if (nameValue) name = nameValue.trim().replace(/^["']|["']$/g, '');

      // Multi-line YAML description support (folded `>` block)
      const lines = raw.split(/\r?\n/);
      const descIdx = lines.findIndex(l => l.startsWith('description:'));
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
    } catch { /* skip */ }
  }

  let playbookCount = 0;
  const playbooksDir = join(convergeDir, 'playbooks');
  if (existsSync(playbooksDir)) {
    try {
      for (const entry of readdirSync(playbooksDir, { withFileTypes: true })) {
        if (entry.isDirectory() && existsSync(join(playbooksDir, entry.name, 'playbook.yml'))) {
          playbookCount++;
        }
      }
    } catch { /* skip */ }
  }

  return NextResponse.json({
    name,
    path,
    description,
    playbookCount,
  });
}
