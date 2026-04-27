#!/usr/bin/env node
// Asserts no references to upstream Astro theme brand strings remain in the
// landing app. The v1 playbook used a fork-and-prune model that left ~385
// "ScrewFast" references on disk; v2 must produce a clean output with zero.
//
// Scans:
//   - apps/landing/src/   (source must not reference any forked theme)
//   - apps/landing/dist/  (built output must not render any forked-theme string)
//
// Excludes node_modules, lockfiles, and the playbook's own files (which
// legitimately mention these brand names in comments).
//
// Exits 0 if clean, 1 if any reference is found, with a list of file:line.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const BRANDS = ['ScrewFast', 'AstroWind', 'Foxi', 'AstroPaper', 'Astroship'];
const SCAN_DIRS = [
  'apps/landing/src',
  'apps/landing/dist',
  'apps/landing/public',
];

const targets = SCAN_DIRS.filter((d) => existsSync(d));
if (targets.length === 0) {
  console.error(
    'check-no-upstream-brand: no scan targets exist yet ' +
      `(checked ${SCAN_DIRS.join(', ')}). Run a build first.`,
  );
  process.exit(1);
}

const pattern = BRANDS.join('|');
const grep = spawnSync(
  'grep',
  [
    '-rIn',
    '-E',
    pattern,
    '--exclude-dir=node_modules',
    '--exclude=*.lock',
    '--exclude=*.lockfile',
    ...targets,
  ],
  { encoding: 'utf-8' },
);

// grep exits 0 if matches found, 1 if no matches, 2+ on error.
if (grep.status === 0) {
  const lines = grep.stdout.trim().split('\n').filter(Boolean);
  console.error(
    `check-no-upstream-brand: found ${lines.length} reference(s) to upstream theme brand(s) (${BRANDS.join(', ')}):`,
  );
  for (const line of lines.slice(0, 50)) console.error(`  ${line}`);
  if (lines.length > 50) console.error(`  …and ${lines.length - 50} more`);
  process.exit(1);
}

if (grep.status === 1) {
  console.log(
    `OK no upstream-theme brand references in ${targets.join(', ')}`,
  );
  process.exit(0);
}

console.error(
  `check-no-upstream-brand: grep failed (status ${grep.status}): ${grep.stderr}`,
);
process.exit(1);
