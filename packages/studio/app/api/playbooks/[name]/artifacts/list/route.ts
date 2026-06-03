import { NextResponse } from 'next/server';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveProjectDir } from '../../../../../../src/lib/project-dir';
import { globToRegex, toPosix, expandPattern } from '../../../../../../src/lib/artifact-glob';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/*  Collect output patterns from runstate.json                         */
/* ------------------------------------------------------------------ */

function collectOutputPatterns(projectDir: string, playbookName: string): string[] {
  const runstatePath = join(projectDir, '.converge', 'journal', playbookName, 'runstate.json');
  if (!existsSync(runstatePath)) return [];
  try {
    const rs = JSON.parse(readFileSync(runstatePath, 'utf-8'));
    const nodes = rs?.dag?.nodes ?? {};
    const patterns = new Set<string>();
    for (const node of Object.values(nodes) as any[]) {
      for (const out of (node?.outputs ?? []) as string[]) {
        if (typeof out === 'string' && out.trim()) patterns.add(out.trim());
      }
    }
    return Array.from(patterns);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Load the optional `artifacts:` block from playbook.yml             */
/* ------------------------------------------------------------------ */

interface ArtifactSpec { group: string; glob: string }

function unquote(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/**
 * Minimal parser for the optional `artifacts:` block in playbook.yml.
 *
 * Supported shapes (top-level, 2-space indent, no nesting):
 *
 *   artifacts:
 *     - { group: "X", glob: "Y" }
 *     - { group: X,   glob: Y }
 *     - group: X
 *       glob: Y
 *
 * Anything more elaborate falls outside the spec — authors with
 * complex yaml needs can adopt a full parser later.
 */
function loadArtifactSpecs(projectDir: string, playbookName: string): ArtifactSpec[] {
  const ymlPath = join(projectDir, '.converge', 'playbooks', playbookName, 'playbook.yml');
  if (!existsSync(ymlPath)) return [];
  let raw: string;
  try { raw = readFileSync(ymlPath, 'utf-8'); } catch { return []; }
  const lines = raw.split(/\r?\n/);
  const startIdx = lines.findIndex(l => /^artifacts\s*:\s*$/.test(l));
  if (startIdx < 0) return [];

  const specs: ArtifactSpec[] = [];
  let cur: Partial<ArtifactSpec> | null = null;
  const flush = () => {
    if (cur && cur.group && cur.glob) specs.push({ group: cur.group, glob: cur.glob });
    cur = null;
  };

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (/^\S/.test(line)) break; // end of artifacts block
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Inline form: - { group: "X", glob: "Y" }
    const inline = trimmed.match(/^-\s*\{(.+)\}\s*$/);
    if (inline) {
      flush();
      const body = inline[1]!;
      const obj: Record<string, string> = {};
      // tolerate "X" or X, comma-separated key:value pairs
      for (const pair of body.split(',')) {
        const m = pair.match(/^\s*(\w+)\s*:\s*(.+?)\s*$/);
        if (m) obj[m[1]!] = unquote(m[2]!);
      }
      if (obj.group && obj.glob) specs.push({ group: obj.group, glob: obj.glob });
      continue;
    }

    // Block form first key: - group: X  /  - glob: Y
    const dashKv = trimmed.match(/^-\s*(\w+)\s*:\s*(.+)$/);
    if (dashKv) {
      flush();
      cur = { [dashKv[1]!]: unquote(dashKv[2]!) } as Partial<ArtifactSpec>;
      continue;
    }

    // Block form continuation key
    const kv = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
    if (kv && cur) {
      (cur as any)[kv[1]!] = unquote(kv[2]!);
      continue;
    }
  }
  flush();
  return specs;
}

/* ------------------------------------------------------------------ */
/*  Route                                                              */
/* ------------------------------------------------------------------ */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const projectDir = resolveProjectDir(request);
  if (!projectDir) {
    return NextResponse.json({ error: 'CONVERGE_PROJECT_DIR not set' }, { status: 500 });
  }

  const patterns = collectOutputPatterns(projectDir, name);
  const allFilesSet = new Set<string>();
  for (const pat of patterns) {
    for (const f of expandPattern(projectDir, pat)) allFilesSet.add(f);
  }
  const allFiles = Array.from(allFilesSet).sort();

  const files = allFiles.map(path => {
    let size: number | undefined;
    try { size = statSync(join(projectDir, path)).size; } catch {}
    const name = path.split('/').pop() ?? path;
    return { path, name, size };
  });

  const specs = loadArtifactSpecs(projectDir, name);

  let groups: { id: string; label: string; files: typeof files }[];
  if (specs.length === 0) {
    groups = files.length === 0 ? [] : [{ id: 'all', label: 'All Outputs', files }];
  } else {
    const buckets = new Map<string, typeof files>();
    const order: string[] = [];
    for (const spec of specs) {
      if (!buckets.has(spec.group)) {
        buckets.set(spec.group, []);
        order.push(spec.group);
      }
    }
    const specRegexes = specs.map(s => ({ group: s.group, regex: globToRegex(toPosix(s.glob)) }));
    const other: typeof files = [];
    for (const f of files) {
      const hit = specRegexes.find(s => s.regex.test(f.path));
      if (hit) buckets.get(hit.group)!.push(f);
      else other.push(f);
    }
    groups = order
      .map(g => ({ id: `group-${g}`, label: g, files: buckets.get(g) ?? [] }))
      .filter(g => g.files.length > 0);
    if (other.length > 0) {
      groups.push({ id: 'group-other', label: 'Other', files: other });
    }
  }

  return NextResponse.json({
    patternCount: patterns.length,
    fileCount: files.length,
    groups,
  });
}
