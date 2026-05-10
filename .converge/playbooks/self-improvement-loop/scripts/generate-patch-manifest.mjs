#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const [projectDir = process.cwd(), manifestPath, specPath = ''] = process.argv.slice(2);
if (!manifestPath) {
  console.error('usage: generate-patch-manifest.mjs <project-dir> <patch-manifest.json> [improvement-spec.json]');
  process.exit(2);
}

function readJson(path, fallback) {
  if (!path || !existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

const changed = execFileSync('node', [`${projectDir}/.converge/playbooks/self-improvement-loop/scripts/list-nonartifact-diff.mjs`, projectDir], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .sort();

if (changed.length === 0) {
  console.error('no non-artifact git diff found; refusing to generate empty patch manifest');
  process.exit(1);
}

const spec = readJson(specPath, {});
const selected = spec.selected || {};
const existing = readJson(manifestPath, {});
const generated = {
  epoch: existing.epoch || spec.epoch || '',
  selected_id: existing.selected_id || selected.id || '',
  files_changed: changed,
  change_summary: existing.change_summary || selected.goal || '',
  regression_added: existing.regression_added ?? null,
  test_command: existing.test_command || selected.test_command || '',
  commands_to_verify: Array.isArray(existing.commands_to_verify) && existing.commands_to_verify.length
    ? existing.commands_to_verify
    : Array.isArray(selected.acceptance_checks)
      ? selected.acceptance_checks
      : [],
  deferred_backlog_items: Array.isArray(existing.deferred_backlog_items) ? existing.deferred_backlog_items : [],
  generated_by: 'generate-patch-manifest.mjs',
};

mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify(generated, null, 2)}\n`);
