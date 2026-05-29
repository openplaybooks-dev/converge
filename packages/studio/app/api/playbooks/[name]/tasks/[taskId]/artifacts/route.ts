import { NextResponse } from 'next/server';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveProjectDir } from '../../../../../../../src/lib/project-dir';
import { expandPattern } from '../../../../../../../src/lib/artifact-glob';

export const dynamic = 'force-dynamic';

/**
 * Read a task's declared `outputs:` patterns from the inventory
 * (`.converge/inventory/<name>/tasks.jsonl`) and resolve them to real
 * files on disk. The inventory is the runtime source of truth per
 * CLAUDE.md §7.1 — we never re-parse `TASK.md` source here.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string; taskId: string }> },
) {
  const { name, taskId } = await params;
  const projectDir = resolveProjectDir(request);
  if (!projectDir) {
    return NextResponse.json({ error: 'CONVERGE_PROJECT_DIR not set' }, { status: 500 });
  }

  const inventoryPath = join(projectDir, '.converge', 'inventory', name, 'tasks.jsonl');
  if (!existsSync(inventoryPath)) {
    return NextResponse.json({ error: `Inventory not found for playbook "${name}"` }, { status: 404 });
  }

  let patterns: string[] | null = null;
  try {
    const lines = readFileSync(inventoryPath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        if (row?.kind === 'task' && row?.id === taskId) {
          patterns = Array.isArray(row.outputs)
            ? row.outputs.filter((s: unknown): s is string => typeof s === 'string')
            : [];
          break;
        }
      } catch { /* skip malformed row */ }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  if (patterns === null) {
    return NextResponse.json({ error: `Task "${taskId}" not found in inventory` }, { status: 404 });
  }

  const fileSet = new Set<string>();
  for (const pat of patterns) {
    for (const f of expandPattern(projectDir, pat)) fileSet.add(f);
  }
  const files = Array.from(fileSet).sort().map(path => {
    let size: number | undefined;
    try { size = statSync(join(projectDir, path)).size; } catch {}
    const name = path.split('/').pop() ?? path;
    return { path, name, size };
  });

  return NextResponse.json({ taskId, patterns, files });
}
