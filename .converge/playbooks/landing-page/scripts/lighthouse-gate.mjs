#!/usr/bin/env node
// Lighthouse score gate. Runs lighthouse against the local preview, parses the
// JSON report, and exits 0 if the requested category meets the threshold.
//
// Usage: node lighthouse-gate.mjs <category> <minScore>
//   category : performance | accessibility | best-practices | seo
//   minScore : 0..100
//
// Requires: lighthouse on PATH (installed via apps/landing devDependency in 07-polish).

import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [, , category = 'performance', minStr = '95'] = process.argv;
const min = Number(minStr);
if (!Number.isFinite(min)) die(`min must be numeric, got ${minStr}`);

const URL = process.env.LH_URL || 'http://localhost:4321/';
const tmp = mkdtempSync(join(tmpdir(), 'lh-'));
const out = join(tmp, 'report.json');

try {
  const lh = spawnSync(
    'pnpm',
    [
      '--filter', '@converge/landing', 'exec', 'lighthouse',
      URL,
      '--quiet',
      '--chrome-flags=--headless=new --no-sandbox',
      '--output=json',
      `--output-path=${out}`,
      `--only-categories=${category}`,
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] },
  );
  if (lh.status !== 0) die(`lighthouse exited with status ${lh.status}`);

  const report = JSON.parse(readFileSync(out, 'utf8'));
  const cat = report.categories?.[category];
  if (!cat) die(`category "${category}" not in report`);

  const score = Math.round((cat.score ?? 0) * 100);
  if (score < min) die(`${category}: ${score} < ${min}`);

  console.log(`OK ${category}=${score} (>=${min})`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

function die(msg) {
  console.error(`lighthouse-gate: ${msg}`);
  process.exit(1);
}
