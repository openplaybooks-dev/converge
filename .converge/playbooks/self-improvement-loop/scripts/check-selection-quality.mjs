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

const lowValuePatterns = [/cosmetic/, /build.*warning/, /unused.*import/, /help.*regression/, /formatting/, /docs?\b/];
if (priority === 'cosmetic' || lowValuePatterns.some((pattern) => pattern.test(id))) {
  console.error(`low-value repeated selection is not allowed: ${selected.id || '<missing id>'}`);
  process.exit(1);
}

const highValueClasses = new Set(['correctness', 'determinism', 'lifecycle', 'production', 'api', 'safety']);
if (!highValueClasses.has(priority)) {
  console.error(`priority_class must be maintainer-grade (${[...highValueClasses].join(', ')}), got: ${priority || '<missing>'}`);
  process.exit(1);
}

if (!why.includes('evidence')) {
  console.error('selected.why_now must explicitly cite evidence');
  process.exit(1);
}

const requires = [];
if (files.some((file) => file.includes('packages/core/src/run') || /seed|runstate|loop/.test(file))) {
  requires.push('tests/playbook-loop-seed.test.ts', 'tests/playbook-seeds.test.ts');
}
if (files.some((file) => file.includes('packages/core/src/playbook') || file.includes('packages/core/src/plan') || file.includes('packages/core/src/manifest') || file.includes('tests/playbook-compile.test.ts') || file.includes('tests/playbook-dag.test.ts'))) {
  requires.push('tests/playbook-compile.test.ts', 'tests/playbook-dag.test.ts');
}
if (files.some((file) => file.includes('packages/cli/src/'))) {
  requires.push('tests/cli-help.test.ts');
}
for (const required of [...new Set(requires)]) {
  if (!testCommand.includes(required) && !(Array.isArray(selected.acceptance_checks) && selected.acceptance_checks.some((cmd) => String(cmd).includes(required)))) {
    console.error(`selection for changed area must run mapped regression: ${required}`);
    process.exit(1);
  }
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

const recent = readJsonl(metricsPath).slice(-2);
if (recent.length >= 2) {
  const repeatedDimension = recent.every((item) => String(item.dimension || '').toLowerCase() === dimension);
  const repeatedLowValue = recent.every((item) => /dx|documentation|cosmetic/.test(String(item.dimension || item.priority_class || '').toLowerCase()));
  if (repeatedLowValue || (repeatedDimension && /dx|documentation|simplicity/.test(dimension))) {
    console.error(`selection repeats recent low-value dimension: ${selected.dimension}`);
    process.exit(1);
  }
}

const touched = readJsonl(touchedPath);
const fileCounts = new Map();
for (const row of touched) fileCounts.set(row.file, (fileCounts.get(row.file) || 0) + 1);
const hotFiles = files.filter((file) => (fileCounts.get(file) || 0) >= 3);
if (hotFiles.length && !String(selected.goal || '').toLowerCase().includes('root-cause') && !String(selected.refactor_signal || '').toLowerCase().includes('root-cause')) {
  console.error(`hot files touched in 3+ epochs need root-cause rationale: ${hotFiles.join(', ')}`);
  process.exit(1);
}
