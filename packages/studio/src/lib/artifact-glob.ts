import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/* ------------------------------------------------------------------ */
/*  Minimal glob → regex                                              */
/*  Supports:                                                          */
/*    *   any chars except `/`                                         */
/*    **  any chars including `/`                                      */
/*    ?   one char except `/`                                          */
/*  Anything else is a literal. Posix-style paths only.                */
/* ------------------------------------------------------------------ */

export function globToRegex(glob: string): RegExp {
  const posix = glob.replace(/\\/g, '/');
  let out = '^';
  for (let i = 0; i < posix.length; i++) {
    const c = posix[i]!;
    if (c === '*') {
      if (posix[i + 1] === '*') { out += '.*'; i++; }
      else { out += '[^/]*'; }
    } else if (c === '?') {
      out += '[^/]';
    } else if ('.+^$|()[]{}\\'.includes(c)) {
      out += '\\' + c;
    } else {
      out += c;
    }
  }
  return new RegExp(out + '$');
}

export function toPosix(p: string): string {
  return p.split(sep).join('/');
}

/* ------------------------------------------------------------------ */
/*  Expand a pattern against the project filesystem                   */
/* ------------------------------------------------------------------ */

export function expandPattern(projectDir: string, pattern: string): string[] {
  const posix = toPosix(pattern);
  if (posix.includes('..')) return [];
  const hasGlob = /[*?]/.test(posix);

  if (!hasGlob) {
    const abs = join(projectDir, posix);
    return existsSync(abs) && statSync(abs).isFile() ? [posix] : [];
  }

  // Find the longest non-glob prefix to bound the walk.
  const segments = posix.split('/');
  const litSegs: string[] = [];
  for (const s of segments) {
    if (/[*?]/.test(s)) break;
    litSegs.push(s);
  }
  // If the literal prefix points at a file, it's not a glob root.
  const rootRel = litSegs.length === segments.length
    ? segments.slice(0, -1).join('/')
    : litSegs.join('/');
  const root = rootRel ? join(projectDir, rootRel) : projectDir;
  if (!existsSync(root) || !statSync(root).isDirectory()) return [];

  const regex = globToRegex(posix);
  const matches: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(root, { recursive: true }) as string[];
  } catch {
    return [];
  }
  for (const entry of entries) {
    const rel = toPosix(rootRel ? `${rootRel}/${toPosix(entry)}` : toPosix(entry));
    const abs = join(projectDir, rel);
    try {
      if (!statSync(abs).isFile()) continue;
    } catch { continue; }
    if (regex.test(rel)) matches.push(rel);
  }
  return matches;
}
