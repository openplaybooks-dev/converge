#!/usr/bin/env node
// Scan skills/converge-control/troubleshooting/playbook.md and emit a
// JSON manifest of symptom sections.
//
// Usage:
//   node scan-troubleshooting.mjs <output-path>
//
// Output shape:
// [
//   {
//     "number": 1,
//     "title": "Iteration cap reached",
//     "slug": "iteration-cap-reached",
//     "anchor": "1-iteration-cap-reached",
//     "sourceLine": 25
//   },
//   ...
// ]
//
// Detection rule: lines matching `^## (\d+)\. (.+)$` in the source file.
// "When NONE of these match" is excluded (it's not a symptom).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , outArg] = process.argv;
if (!outArg) {
  console.error('usage: scan-troubleshooting.mjs <output-path>');
  process.exit(2);
}

const SRC = 'skills/converge-control/troubleshooting/playbook.md';
const text = readFileSync(SRC, 'utf8');
const lines = text.split('\n');

const symptoms = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^##\s+(\d+)\.\s+(.+?)\s*$/);
  if (!m) continue;
  const number = Number(m[1]);
  const title = m[2].trim();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  symptoms.push({
    number,
    title,
    slug,
    anchor: `${number}-${slug}`,
    sourceLine: i + 1,
  });
}

if (symptoms.length === 0) {
  console.error(
    `scan-troubleshooting: no symptom sections found in ${SRC}. ` +
      'Expected lines matching `## N. Title`.',
  );
  process.exit(1);
}

writeFileSync(resolve(outArg), JSON.stringify(symptoms, null, 2) + '\n');
console.log(`scan-troubleshooting: wrote ${symptoms.length} symptoms to ${outArg}`);
