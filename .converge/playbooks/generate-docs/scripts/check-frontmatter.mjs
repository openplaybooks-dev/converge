#!/usr/bin/env node
// Validates that every docs/**/*.md page declares a required frontmatter key.
//
// Usage: node check-frontmatter.mjs <key>
//   key : title | sources | description
//
// Skips docs/_internal/** (archived) and docs/index.md (root landing).
//
// Exits 0 if every applicable page has the key; non-zero with a list of offenders.

import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const [, , key = 'title'] = process.argv;
const allowedKeys = new Set(['title', 'sources', 'description']);
if (!allowedKeys.has(key)) die(`unknown key "${key}" — pass title|sources|description`);

const offenders = [];
let total = 0;

for await (const path of glob('docs/**/*.md', { cwd: process.cwd() })) {
  if (path.startsWith('docs/_internal/')) continue;
  if (path === 'docs/index.md') continue;
  total += 1;

  const text = readFileSync(path, 'utf8');
  const fm = parseFrontmatter(text);
  if (!fm) {
    offenders.push(`${path} — no frontmatter`);
    continue;
  }
  if (!fm[key] || (Array.isArray(fm[key]) && fm[key].length === 0)) {
    offenders.push(`${path} — missing ${key}`);
  }
}

if (offenders.length) {
  console.error(`check-frontmatter[${key}]: ${offenders.length}/${total} offenders:`);
  for (const o of offenders) console.error(`  - ${o}`);
  process.exit(1);
}
console.log(`OK ${key} present in ${total} pages`);

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const block = text.slice(4, end);
  const out = {};
  let key = null;
  let listMode = false;
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (m) {
      key = m[1];
      const v = m[2].trim();
      if (v === '' || v === '|' || v === '>') {
        out[key] = '';
        listMode = false;
      } else if (v === '[]') {
        out[key] = [];
        listMode = false;
      } else {
        out[key] = unquote(v);
        listMode = false;
      }
      continue;
    }
    const li = line.match(/^\s+-\s+(.+)$/);
    if (li && key) {
      if (!Array.isArray(out[key])) out[key] = [];
      out[key].push(unquote(li[1].trim()));
      listMode = true;
    }
  }
  return out;
}

function unquote(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function die(msg) {
  console.error(`check-frontmatter: ${msg}`);
  process.exit(2);
}
