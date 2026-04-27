#!/usr/bin/env node
// Best-effort extraction of CLI commands from packages/cli/src/main.ts.
//
// The CLI uses ad-hoc parsing (no commander/citty/oclif), so this script
// produces a *seed* list of commands by pattern-matching on the switch
// statement. The agent in 06-reference uses this as a starting point and
// fills in details (flags, descriptions, examples) by reading the actual
// command handler files.
//
// Output: docs/_cli-commands.json
//   [
//     { "name": "run", "handler": "commands-run.ts", "line": 557 },
//     ...
//   ]
//
// Usage: node scan-cli-commands.mjs [output-path]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const MAIN_TS = 'packages/cli/src/main.ts';
const OUT = process.argv[2] || 'docs/_cli-commands.json';

if (!existsSync(MAIN_TS)) die(`missing ${MAIN_TS}`);

const src = readFileSync(MAIN_TS, 'utf8');
const lines = src.split('\n');

const commands = [];
const caseRe = /^\s*case\s+["']([^"']+)["']\s*:/;

for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(caseRe);
  if (!m) continue;
  const name = m[1];
  // Heuristic: look ahead up to 30 lines for the next handler import or
  // function call ending in "Command(" — that's typically the dispatch.
  let handler = null;
  for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
    const h = lines[j].match(/(\w+Command|\w+Cmd)\s*\(/);
    if (h) { handler = h[1]; break; }
    if (/^\s*case\s+/.test(lines[j])) break;
    if (/^\s*break\s*;/.test(lines[j])) break;
  }
  commands.push({ name, line: i + 1, handler });
}

// Resolve handler imports to file paths
const importRe = /import\s+\{[^}]*\b(\w+(?:Command|Cmd))\b[^}]*\}\s+from\s+["']([^"']+)["']/g;
const handlerToFile = new Map();
for (const m of src.matchAll(importRe)) {
  const fns = m[0].match(/\{([^}]+)\}/)[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
  for (const fn of fns) {
    if (/Command$|Cmd$/.test(fn)) handlerToFile.set(fn, m[2]);
  }
}

for (const c of commands) {
  if (c.handler) c.handlerFile = handlerToFile.get(c.handler) ?? null;
}

// Dedupe: the switch may have multiple `case "alias":` falling through
// to the same handler. Keep first occurrence.
const seen = new Set();
const unique = commands.filter(c => {
  if (seen.has(c.name)) return false;
  seen.add(c.name);
  return true;
});

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(unique, null, 2) + '\n');
console.log(`scan-cli-commands: ${unique.length} commands → ${OUT}`);

function die(msg) {
  console.error(`scan-cli-commands: ${msg}`);
  process.exit(1);
}
