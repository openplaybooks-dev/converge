#!/usr/bin/env node
/**
 * verify-markers.js
 *
 * Walks lib/ looking for @converge:element markers and confirms each one has
 * a bound handler in the immediately following handler body (not a TODO, not
 * an empty closure, not a noop).
 *
 * Exit 0 = all markers bound. Exit 1 = at least one unbound marker; prints
 * file:line for each.
 *
 * Heuristic for "bound":
 *   - A marker line looks like:  // @converge:element {handlerId}
 *   - The next non-blank, non-comment line must contain an invocation of
 *     something that is either:
 *       - a Riverpod provider method call (ref.read(...).someMethod(...))
 *       - a method on `notifier` / `controller` / `bloc`
 *       - GoRouter.of(context).push / context.push / context.go
 *       - A handler function defined in the same file (heuristic:
 *         `_handle<Id>` or `on<Id>`)
 *   - A marker followed by `() {}`, `() {},`, `null`, `null,`, or a single
 *     TODO comment is considered unbound.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const LIB_DIR = join(process.cwd(), 'lib');
const MARKER_RE = /\/\/\s*@converge:element\s+([\w\-.:]+)/;
const UNBOUND_PATTERNS = [
  /^\s*\(\s*\)\s*\{\s*\}\s*,?\s*$/,
  /^\s*null\s*,?\s*$/,
  /^\s*\/\/\s*TODO/i,
];
const BOUND_PATTERNS = [
  /ref\.(read|watch|listen)\(/,
  /\.(notifier|controller|bloc)\./,
  /context\.(push|go|pop|replace)\b/,
  /GoRouter\.of\(/,
  /\b(_handle|on)[A-Z]\w*\s*\(/,
  /Navigator\.of\(/,
  /\bshowDialog\s*\(/,
  /\bshowModalBottomSheet\s*\(/,
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (entry.endsWith('.dart')) out.push(full);
  }
  return out;
}

function existsSync(p) {
  try { statSync(p); return true; } catch { return false; }
}

const files = walk(LIB_DIR);
const unbound = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf-8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(MARKER_RE);
    if (!m) continue;
    const markerId = m[1];
    let j = i + 1;
    while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('//'))) {
      if (lines[j].trim().startsWith('//') && /TODO/i.test(lines[j])) break;
      j++;
    }
    if (j >= lines.length) {
      unbound.push({ file, line: i + 1, markerId, reason: 'EOF after marker' });
      continue;
    }
    const next = lines[j];
    if (UNBOUND_PATTERNS.some(p => p.test(next))) {
      unbound.push({ file, line: i + 1, markerId, reason: `unbound: ${next.trim()}` });
      continue;
    }
    const windowText = lines.slice(j, Math.min(j + 8, lines.length)).join('\n');
    if (!BOUND_PATTERNS.some(p => p.test(windowText))) {
      unbound.push({ file, line: i + 1, markerId, reason: `no bound call detected near ${next.trim()}` });
    }
  }
}

if (unbound.length > 0) {
  console.error(`FAIL: ${unbound.length} unbound @converge:element markers:`);
  for (const u of unbound) {
    console.error(`  ${u.file.replace(process.cwd() + '/', '')}:${u.line}  [${u.markerId}]  ${u.reason}`);
  }
  process.exit(1);
}

console.log(`OK: scanned ${files.length} files, all markers bound.`);
