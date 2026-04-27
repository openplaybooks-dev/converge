#!/usr/bin/env node
// Asserts the built landing page contains no placeholder strings — Lorem
// ipsum, "TBD", "FIXME", "TODO:", etc. Catches the "agent shipped a
// scaffolded section without filling in real copy" failure mode.
//
// Scans apps/landing/dist/ only (the built site that users see).
// Skips .map files (sourcemaps may legitimately contain these tokens).
//
// Exits 0 if clean, 1 if any placeholder is found.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const PATTERNS = [
  'Lorem ipsum',
  'lorem ipsum',
  '\\bTBD\\b',
  '\\bFIXME\\b',
  'TODO:',
  'placeholder content',
  'PLACEHOLDER',
  'XXX:',
  'Coming soon',
];

const TARGET = 'apps/landing/dist';
if (!existsSync(TARGET)) {
  console.error(
    `check-no-placeholders: ${TARGET} does not exist. Run a build first.`,
  );
  process.exit(1);
}

const pattern = PATTERNS.join('|');
const grep = spawnSync(
  'grep',
  [
    '-rIn',
    '-E',
    pattern,
    '--include=*.html',
    '--include=*.js',
    '--include=*.css',
    '--include=*.txt',
    '--include=*.xml',
    '--include=*.json',
    '--exclude=*.map',
    TARGET,
  ],
  { encoding: 'utf-8' },
);

if (grep.status === 0) {
  const lines = grep.stdout.trim().split('\n').filter(Boolean);
  console.error(
    `check-no-placeholders: found ${lines.length} placeholder string(s) in built site:`,
  );
  for (const line of lines.slice(0, 30)) console.error(`  ${line}`);
  if (lines.length > 30) console.error(`  …and ${lines.length - 30} more`);
  process.exit(1);
}

if (grep.status === 1) {
  console.log(`OK no placeholder strings in ${TARGET}`);
  process.exit(0);
}

console.error(
  `check-no-placeholders: grep failed (status ${grep.status}): ${grep.stderr}`,
);
process.exit(1);
