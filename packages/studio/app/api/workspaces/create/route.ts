import { NextResponse } from 'next/server';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();
  const path = typeof body.path === 'string' ? body.path.trim() : '';
  const name = typeof body.name === 'string' && body.name.trim()
    ? body.name.trim()
    : (path ? basename(path) : '');
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (!path) {
    return NextResponse.json({ error: 'path required' }, { status: 400 });
  }

  try {
    // Create the workspace folder if it doesn't exist
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }

    const convergeDir = join(path, '.converge');
    if (existsSync(convergeDir)) {
      return NextResponse.json(
        { error: `Workspace already exists at ${path}` },
        { status: 409 },
      );
    }

    mkdirSync(convergeDir, { recursive: true });
    mkdirSync(join(convergeDir, 'playbooks'), { recursive: true });

    // Minimal project.yaml
    const yaml = `name: ${name}\n` +
      (description ? `description: ${description}\n` : '') +
      `\n` +
      `ai:\n` +
      `  default: claude\n` +
      `  providers:\n` +
      `    claude:\n` +
      `      provider: claude\n`;
    writeFileSync(join(convergeDir, 'project.yaml'), yaml, 'utf-8');

    // .gitignore for journal/inventory runtime artifacts
    const gitignore = `journal/\ninventory/\n*.log\n`;
    writeFileSync(join(convergeDir, '.gitignore'), gitignore, 'utf-8');

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
      ok: true,
      workspace: { name, path, description, playbookCount },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
