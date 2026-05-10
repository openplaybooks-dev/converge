#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const [specPath, metricsPath = '', touchedPath = ''] = process.argv.slice(2);
if (!specPath) {
  console.error('usage: check-selection-quality.mjs <improvement-spec.json> [metrics.jsonl] [touched-files.jsonl]');
  process.exit(2);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const selected = spec.selected || {};
const files = Array.isArray(selected.files) ? selected.files : [];
const priority = String(selected.priority_class || '').toLowerCase();
const dimension = String(selected.dimension || '').toLowerCase();
const id = String(selected.id || '').toLowerCase();
const why = String(selected.why_now || '').toLowerCase();
const testCommand = String(selected.test_command || '');
const acceptance = Array.isArray(selected.acceptance_checks) ? selected.acceptance_checks.map(String) : [];

const priorityRank = new Map([
  ['correctness', 1],
  ['safety', 1],
  ['determinism', 2],
  ['lifecycle', 3],
  ['production', 4],
  ['api', 5],
  ['dx', 6],
  ['documentation', 7],
  ['cosmetic', 8],
]);
const maintainerClasses = new Set(['correctness', 'determinism', 'lifecycle', 'production', 'api', 'safety']);
const lowValuePatterns = [/cosmetic/, /build.*warning/, /unused.*import/, /help.*regression/, /formatting/, /docs?\b/];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJsonl(path) {
  if (!path || !existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

if (priority === 'cosmetic' || lowValuePatterns.some((pattern) => pattern.test(id))) {
  fail(`low-value standalone selection is not allowed: ${selected.id || '<missing id>'}`);
}
if (!maintainerClasses.has(priority)) {
  fail(`priority_class must be maintainer-grade (${[...maintainerClasses].join(', ')}), got: ${priority || '<missing>'}`);
}
if (!why.includes('evidence')) {
  fail('selected.why_now must explicitly cite evidence');
}
if (!files.length) {
  fail('selected.files must list the exact bounded implementation/test files');
}

function requireMappedTest(fragment, reason) {
  if (!testCommand.includes(fragment) && !acceptance.some((cmd) => cmd.includes(fragment))) {
    fail(`${reason} must run mapped regression: ${fragment}`);
  }
}
if (files.some((file) => file.includes('packages/core/src/run') || /seed|runstate|loop/.test(file))) {
  requireMappedTest('tests/playbook-loop-seed.test.ts', 'runner/seed/runstate selection');
  requireMappedTest('tests/playbook-seeds.test.ts', 'runner/seed/runstate selection');
}
if (files.some((file) => file.includes('packages/core/src/playbook') || file.includes('packages/core/src/plan') || file.includes('packages/core/src/manifest') || file.includes('tests/playbook-compile.test.ts') || file.includes('tests/playbook-dag.test.ts'))) {
  requireMappedTest('tests/playbook-compile.test.ts', 'manifest/DAG selection');
  requireMappedTest('tests/playbook-dag.test.ts', 'manifest/DAG selection');
}
if (files.some((file) => file.includes('packages/cli/src/'))) {
  requireMappedTest('tests/cli-help.test.ts', 'CLI selection');
}

const recent = readJsonl(metricsPath).slice(-2);
const currentRank = priorityRank.get(priority) ?? 99;
if (recent.length >= 2) {
  const repeatedDimension = recent.every((item) => String(item.dimension || '').toLowerCase() === dimension);
  const repeatedPriority = recent.every((item) => String(item.priority_class || '').toLowerCase() === priority);
  const repeatedLowValue = recent.every((item) => /dx|documentation|cosmetic/.test(String(item.dimension || item.priority_class || '').toLowerCase()));
  const recentBestRank = Math.min(...recent.map((item) => priorityRank.get(String(item.priority_class || '').toLowerCase()) ?? 99));
  if (repeatedLowValue || (repeatedDimension && /dx|documentation|simplicity/.test(dimension))) {
    fail(`selection repeats recent low-value dimension: ${selected.dimension}`);
  }
  if (repeatedPriority && currentRank >= 5 && !String(selected.refactor_signal || selected.goal || '').toLowerCase().includes('root-cause')) {
    fail(`selection repeats recent lower-leverage priority_class without root-cause rationale: ${selected.priority_class}`);
  }
  if (currentRank > recentBestRank + 2 && !String(selected.why_now || '').toLowerCase().includes('higher priorities clean')) {
    fail('lower-priority selection must state that higher priorities are clean based on evidence');
  }
}

const touched = readJsonl(touchedPath);
const fileCounts = new Map();
for (const row of touched) fileCounts.set(row.file, (fileCounts.get(row.file) || 0) + 1);
const hotFiles = files.filter((file) => (fileCounts.get(file) || 0) >= 3);
if (hotFiles.length && !String(selected.goal || '').toLowerCase().includes('root-cause') && !String(selected.refactor_signal || '').toLowerCase().includes('root-cause')) {
  fail(`hot files touched in 3+ epochs need root-cause rationale: ${hotFiles.join(', ')}`);
}

const uniqueSourceRoots = new Set(files
  .filter((file) => !file.startsWith('tests/'))
  .map((file) => file.split('/').slice(0, 4).join('/')));
if (uniqueSourceRoots.size > 3 && !String(selected.risk || '').toLowerCase().includes('medium')) {
  fail('broad multi-area selections must declare at least medium risk and clear rollback');
}
