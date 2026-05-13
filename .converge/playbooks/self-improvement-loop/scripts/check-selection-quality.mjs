#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const [specPath, metricsPath = '', touchedPath = ''] = process.argv.slice(2);
if (!specPath) {
  console.error('usage: check-selection-quality.mjs <correction-spec.json> [metrics.jsonl] [touched-files.jsonl]');
  process.exit(2);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const mentalModel = String(spec.mental_model || '');
const findingId = String(spec.finding_id || '').toLowerCase();
const filesToChange = Array.isArray(spec.files_to_change) ? spec.files_to_change : [];
const why = String(spec.why_this_correction || '').toLowerCase();

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

if (!mentalModel) {
  fail('correction-spec.json must specify mental_model');
}
if (!findingId) {
  fail('correction-spec.json must specify finding_id');
}
if (!filesToChange.length) {
  fail('correction-spec.json must list files_to_change');
}
if (!why.includes('evidence')) {
  fail('why_this_correction must explicitly cite evidence from the observe phase');
}

// Check that we target at least one framework file
const frameworkFiles = filesToChange.filter((f) => f.startsWith('packages/'));
if (frameworkFiles.length === 0) {
  fail('files_to_change must include at least one file under packages/');
}
if (frameworkFiles.length > 1) {
  fail('files_to_change must target exactly one framework file');
}

// Anti-repeat: check recent metrics for same mental model
const recent = readJsonl(metricsPath).slice(-3);
if (recent.length >= 2) {
  const recentModels = recent.map((item) => String(item.mental_model || ''));
  if (recentModels.slice(-2).every((m) => m === mentalModel)) {
    fail(`mental model "${mentalModel}" was audited in the last 2 epochs — skip it`);
  }
  const recentIds = new Set(recent.map((item) => String(item.finding_id || item.selected_id || '').toLowerCase()));
  if (recentIds.has(findingId)) {
    fail(`finding "${findingId}" was already addressed in a recent epoch`);
  }
}

// Anti-repeat: check touched files for hot files
const touched = readJsonl(touchedPath);
const fileCounts = new Map();
for (const row of touched) fileCounts.set(row.file, (fileCounts.get(row.file) || 0) + 1);
const hotFiles = filesToChange.filter((file) => (fileCounts.get(file) || 0) >= 3);
if (hotFiles.length) {
  fail(`hot files touched in 3+ epochs need root-cause rationale: ${hotFiles.join(', ')}`);
}

// Validate test file is specified
const testFile = String(spec.test_file || '');
if (!testFile || !testFile.startsWith('tests/')) {
  fail('correction-spec.json must specify a test_file under tests/');
}

console.log(`OK: mental model "${mentalModel}", finding "${findingId}", test "${testFile}"`);
