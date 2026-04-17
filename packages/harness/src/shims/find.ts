#!/usr/bin/env node
/**
 * find shim — portable drop-in for find in harness check commands.
 *
 * Supports the subset used in TASK.md checks:
 *   find <dir...> [options] [tests]
 *
 * Options:
 *   -maxdepth N          descend at most N levels
 *   -mindepth N          skip first N levels
 *
 * Tests:
 *   -name <pattern>      match filename against shell glob (*, ?, [...])
 *   -iname <pattern>     case-insensitive -name
 *   -type f              regular files only
 *   -type d              directories only
 *   -type l              symlinks only
 *   -not <test>          negate the following test
 *   ! <test>             same as -not
 *   -path <pattern>      match full relative path against glob
 *   -ipath <pattern>     case-insensitive -path
 *
 * Output: one absolute path per match, printed to stdout.
 * Exit code: always 0 (like GNU find — does not exit 1 on no match).
 */

import { readdirSync, statSync, lstatSync } from 'node:fs';
import { join, basename, resolve, relative } from 'node:path';

/* ------------------------------------------------------------------ */
/*  Glob → RegExp                                                      */
/* ------------------------------------------------------------------ */

function globToRegex(pattern: string, flags = ''): RegExp {
  const src = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // escape regex specials (not * ?)
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${src}$`, flags);
}

/* ------------------------------------------------------------------ */
/*  Argument parsing                                                   */
/* ------------------------------------------------------------------ */

interface FindOpts {
  roots: string[];
  maxDepth: number;
  minDepth: number;
  tests: Test[];
}

type Test =
  | { kind: 'name';  pattern: string; ignoreCase: boolean }
  | { kind: 'type';  fileType: 'f' | 'd' | 'l' }
  | { kind: 'path';  pattern: string; ignoreCase: boolean }
  | { kind: 'not';   inner: Test };

const argv = process.argv.slice(2);

const opts: FindOpts = {
  roots: [],
  maxDepth: Infinity,
  minDepth: 0,
  tests: [],
};

let i = 0;
function peek(): string | undefined { return argv[i]; }
function consume(): string { return argv[i++]; }

function parseTest(negate = false): Test | null {
  const tok = consume();
  if (!tok) return null;

  if (tok === '!' || tok === '-not') {
    const inner = parseTest();
    if (!inner) return null;
    return { kind: 'not', inner };
  }

  if (tok === '-name' || tok === '-iname') {
    const pattern = consume();
    const t: Test = { kind: 'name', pattern, ignoreCase: tok === '-iname' };
    return negate ? { kind: 'not', inner: t } : t;
  }
  if (tok === '-path' || tok === '-ipath') {
    const pattern = consume();
    const t: Test = { kind: 'path', pattern, ignoreCase: tok === '-ipath' };
    return negate ? { kind: 'not', inner: t } : t;
  }
  if (tok === '-type') {
    const ft = consume() as 'f' | 'd' | 'l';
    const t: Test = { kind: 'type', fileType: ft };
    return negate ? { kind: 'not', inner: t } : t;
  }

  // Unknown — skip
  return null;
}

// Parse roots and options from argv
while (i < argv.length) {
  const tok = argv[i];

  if (tok === '-maxdepth') { i++; opts.maxDepth = parseInt(consume(), 10); continue; }
  if (tok === '-mindepth') { i++; opts.minDepth = parseInt(consume(), 10); continue; }

  // Tests start with - or !
  if (tok.startsWith('-') || tok === '!') {
    const t = parseTest();
    if (t) opts.tests.push(t);
    continue;
  }

  // Positional args before any flag are roots
  opts.roots.push(consume());
}

if (opts.roots.length === 0) opts.roots.push('.');

/* ------------------------------------------------------------------ */
/*  Test evaluation                                                    */
/* ------------------------------------------------------------------ */

function matchesTest(test: Test, absPath: string, name: string, isFile: boolean, isDir: boolean, isSymlink: boolean): boolean {
  switch (test.kind) {
    case 'name': {
      const flags = test.ignoreCase ? 'i' : '';
      return globToRegex(test.pattern, flags).test(name);
    }
    case 'path': {
      const flags = test.ignoreCase ? 'i' : '';
      return globToRegex(test.pattern, flags).test(absPath);
    }
    case 'type':
      if (test.fileType === 'f') return isFile;
      if (test.fileType === 'd') return isDir;
      if (test.fileType === 'l') return isSymlink;
      return false;
    case 'not':
      return !matchesTest(test.inner, absPath, name, isFile, isDir, isSymlink);
  }
}

function matchesAll(absPath: string, name: string, isFile: boolean, isDir: boolean, isSymlink: boolean): boolean {
  return opts.tests.every(t => matchesTest(t, absPath, name, isFile, isDir, isSymlink));
}

/* ------------------------------------------------------------------ */
/*  Walk                                                               */
/* ------------------------------------------------------------------ */

function walk(dir: string, depth: number) {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(fullPath);
    } catch {
      continue;
    }

    const isSymlink = stat.isSymbolicLink();
    let isFile = stat.isFile();
    let isDir = stat.isDirectory();

    // Follow symlinks for type detection
    if (isSymlink) {
      try {
        const real = statSync(fullPath);
        isFile = real.isFile();
        isDir = real.isDirectory();
      } catch { /* broken symlink */ }
    }

    if (depth >= opts.minDepth) {
      if (matchesAll(fullPath, entry, isFile, isDir, isSymlink)) {
        process.stdout.write(fullPath + '\n');
      }
    }

    if (isDir && depth < opts.maxDepth) {
      walk(fullPath, depth + 1);
    }
  }
}

for (const root of opts.roots) {
  const absRoot = resolve(root);
  // Check if root itself matches (depth 0)
  if (opts.minDepth === 0) {
    let stat: ReturnType<typeof lstatSync> | null = null;
    try { stat = lstatSync(absRoot); } catch { /* skip */ }
    if (stat) {
      const isSymlink = stat.isSymbolicLink();
      const isDir = stat.isDirectory();
      const isFile = stat.isFile();
      if (matchesAll(absRoot, basename(absRoot), isFile, isDir, isSymlink)) {
        process.stdout.write(absRoot + '\n');
      }
    }
  }
  walk(absRoot, 1);
}
