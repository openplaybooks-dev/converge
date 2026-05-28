import { NextResponse } from 'next/server';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

export const dynamic = 'force-dynamic';

interface Entry {
  name: string;
  path: string;
  hasConverge: boolean;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  let path = url.searchParams.get('path') || '';

  if (!path) {
    // Default to home directory
    path = homedir();
  }

  // Normalize
  try {
    path = resolve(path);
  } catch {
    return NextResponse.json({ error: `Invalid path: ${path}` }, { status: 400 });
  }

  if (!existsSync(path)) {
    return NextResponse.json({ error: `Path does not exist: ${path}` }, { status: 404 });
  }

  let stat;
  try {
    stat = statSync(path);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  if (!stat.isDirectory()) {
    return NextResponse.json({ error: `Not a directory: ${path}` }, { status: 400 });
  }

  const entries: Entry[] = [];
  try {
    for (const ent of readdirSync(path, { withFileTypes: true })) {
      // Skip hidden by default except .converge (informative)
      if (ent.name.startsWith('.') && ent.name !== '.converge') continue;
      if (!ent.isDirectory()) continue;
      const full = join(path, ent.name);
      const hasConverge = existsSync(join(full, '.converge'));
      entries.push({ name: ent.name, path: full, hasConverge });
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Cannot read directory: ${err.message}` }, { status: 403 });
  }

  // Sort: .converge folders first, then alphabetical
  entries.sort((a, b) => {
    if (a.hasConverge !== b.hasConverge) return a.hasConverge ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  const parent = dirname(path);
  const isRoot = parent === path;
  const hasConvergeHere = existsSync(join(path, '.converge'));

  return NextResponse.json({
    path,
    parent: isRoot ? null : parent,
    entries,
    hasConvergeHere,
  });
}
