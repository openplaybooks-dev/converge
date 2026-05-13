#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [rootRel, epochArg] = process.argv.slice(2);
if (!rootRel || !epochArg) {
  console.error('usage: check-epoch-complete.mjs <artifacts-root> <epoch-or-epoch-dir>');
  process.exit(2);
}

const paddedEpoch = /^\d+$/.test(epochArg) ? epochArg.padStart(3, '0') : epochArg;
const epochDir = epochArg.includes('/')
  ? epochArg
  : existsSync(join(rootRel, 'epochs', epochArg))
    ? join(rootRel, 'epochs', epochArg)
    : join(rootRel, 'epochs', paddedEpoch);
const epoch = epochArg.includes('/') ? epochDir.split('/').filter(Boolean).at(-1) : paddedEpoch;
const epochNumber = String(Number(epoch));
const acceptableEpochs = new Set([epoch, epochNumber]);
const required = [
  'mental-model/selection.json',
  'observe/report.md',
  'observe/findings.json',
  'analyze/correction-spec.json',
  'analyze/report.md',
  'test/test-result.json',
  'implement/patch-manifest.json',
  'verify/result.json',
  'verify/result.md',
  'epoch-summary.md',
];

for (const rel of required) {
  const path = join(epochDir, rel);
  if (!existsSync(path) || readFileSync(path, 'utf8').trim().length === 0) {
    console.error(`missing or empty: ${path}`);
    process.exit(1);
  }
}

const result = JSON.parse(readFileSync(join(epochDir, 'verify/result.json'), 'utf8'));
if (!acceptableEpochs.has(String(result.epoch))) {
  console.error(`verify/result.json epoch mismatch: expected ${epoch}, got ${result.epoch}`);
  process.exit(1);
}
if (result.result !== 'pass') {
  console.error(`verify result is not pass: ${result.result}`);
  process.exit(1);
}
if (!Array.isArray(result.commands) || result.commands.length === 0) {
  console.error('verify/result.json must include commands');
  process.exit(1);
}
const failed = result.commands.filter((command) => command.exit_code !== 0);
if (failed.length) {
  console.error(`verify/result.json contains failed commands: ${failed.map((c) => c.cmd).join('; ')}`);
  process.exit(1);
}

const metricsPath = join(rootRel, 'metrics.jsonl');
if (!existsSync(metricsPath)) {
  console.error(`missing metrics ledger: ${metricsPath}`);
  process.exit(1);
}
const hasMetric = readFileSync(metricsPath, 'utf8')
  .split('\n')
  .filter(Boolean)
  .some((line) => {
    try {
      return acceptableEpochs.has(String(JSON.parse(line).epoch));
    } catch {
      return false;
    }
  });
if (!hasMetric) {
  console.error(`metrics ledger does not contain epoch ${epoch}`);
  process.exit(1);
}
