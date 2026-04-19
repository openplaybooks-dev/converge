#!/usr/bin/env node
// Scan all .dart files in lib/screens/ and lib/widgets/ for empty handlers.
// Exits 0 if all handlers have real logic. Exits 1 if any are empty.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const HANDLER_TYPES = [
  'onPressed',
  'onTap',
  'onDestinationSelected',
  'onChanged',
  'onSelected',
  'onLongPress',
  'onDoubleTap',
  'onSubmitted',
];

const DIRS = ['lib/screens', 'lib/widgets'];

function collectDartFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full, { throwIfNoEntry: false });
    if (!stat) continue;
    if (stat.isDirectory()) {
      results.push(...collectDartFiles(full));
    } else if (extname(entry) === '.dart') {
      results.push(full);
    }
  }
  return results;
}

function isHandlerEmpty(lines, startLine) {
  const line = lines[startLine];

  // Check for null handler
  if (/:\s*null\s*[,;)}\]]/.test(line)) return true;

  // Arrow function — check for => null or => {}
  if (/=>\s*null\s*[,;)}]/.test(line)) return true;
  if (/=>\s*\{\s*\}\s*[,;)}]/.test(line)) return true;
  // Real arrow function
  if (/=>\s*\S/.test(line)) return false;

  // Single-line empty: () {},
  if (/\(\s*[^)]*\)\s*\{\s*\}\s*[,;)}\]]/.test(line)) return true;

  // Multi-line — extract body between { and matching }
  const braceIdx = line.indexOf('{');
  if (braceIdx === -1) {
    // Method reference like onTap: _handleTap — not empty
    return false;
  }

  let depth = 0;
  let bodyLines = [];
  let started = false;

  for (let i = startLine; i < lines.length; i++) {
    const l = lines[i];
    for (let c = 0; c < l.length; c++) {
      if (l[c] === '{') {
        if (!started) started = true;
        depth++;
      } else if (l[c] === '}') {
        depth--;
        if (started && depth === 0) {
          const body = bodyLines.join('\n').trim();
          const stripped = body
            .replace(/\/\/[^\n]*/g, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .trim();
          return stripped === '';
        }
      }
    }
    if (started && i > startLine) {
      bodyLines.push(l);
    }
  }

  return false;
}

let failures = [];

for (const dir of DIRS) {
  const files = collectDartFiles(dir);
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      for (const handler of HANDLER_TYPES) {
        const pattern = `${handler}:`;
        const idx = lines[i].indexOf(pattern);
        if (idx === -1) continue;

        // Make sure it's the handler assignment, not inside a string or comment
        const before = lines[i].slice(0, idx).trim();
        if (before.startsWith('//') || before.startsWith('*')) continue;

        if (isHandlerEmpty(lines, i)) {
          failures.push(`${file}:${i + 1} — ${handler} is empty`);
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} empty handler(s) found:\n`);
  for (const f of failures) {
    console.error(`  ${f}`);
  }
  process.exit(1);
} else {
  console.log('PASS: All handlers have real logic');
  process.exit(0);
}
