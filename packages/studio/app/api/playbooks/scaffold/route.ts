import { NextResponse } from 'next/server';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { setProjectDir } from '../../../../src/lib/project-dir';

function copyDirFiltered(src: string, dest: string) {
  const skip = new Set(['journal', 'inventory', 'logs', 'cache', 'node_modules', '.next']);
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirFiltered(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { example, targetDir } = body as { example: string; targetDir: string };

  if (!example || !targetDir) {
    return NextResponse.json({ error: 'example and targetDir required' }, { status: 400 });
  }

  try {
    const convergeRoot = join(__dirname, '..', '..', '..', '..', '..', '..');
    let exampleDir = '';
    const searchPaths = [
      join(targetDir, '..', '..', 'examples', example),
      join(process.cwd(), '..', '..', 'examples', example),
    ];

    // Walk up from studio package to find the converge root examples
    let dir = __dirname;
    for (let i = 0; i < 10; i++) {
      const candidate = join(dir, 'examples', example);
      if (existsSync(candidate)) {
        exampleDir = candidate;
        break;
      }
      const parent = join(dir, '..');
      if (parent === dir) break;
      dir = parent;
    }

    if (!exampleDir) {
      // Try known path
      const knownPath = join('D:\\converge\\examples', example);
      if (existsSync(knownPath)) exampleDir = knownPath;
    }

    if (!exampleDir) {
      return NextResponse.json({ error: `Example "${example}" not found` }, { status: 404 });
    }

    // Create target directory
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // Copy .converge directory (playbooks, project config, skills)
    const srcConverge = join(exampleDir, '.converge');
    if (existsSync(srcConverge)) {
      copyDirFiltered(srcConverge, join(targetDir, '.converge'));
    }

    // Copy scripts if they exist
    const srcScripts = join(exampleDir, 'scripts');
    if (existsSync(srcScripts)) {
      copyDirFiltered(srcScripts, join(targetDir, 'scripts'));
    }

    // Set studio's project dir to the new target
    setProjectDir(targetDir);

    // Discover what playbooks were scaffolded
    const playbooksDir = join(targetDir, '.converge', 'playbooks');
    const playbooks: string[] = [];
    if (existsSync(playbooksDir)) {
      for (const entry of readdirSync(playbooksDir, { withFileTypes: true })) {
        if (entry.isDirectory() && existsSync(join(playbooksDir, entry.name, 'playbook.yml'))) {
          playbooks.push(entry.name);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      targetDir,
      playbooks,
      example,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
