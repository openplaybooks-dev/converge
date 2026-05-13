#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const [specPath, manifestPath, resultPath] = process.argv.slice(2);
if (!specPath || !manifestPath || !resultPath) {
  console.error('usage: check-verification-strength.mjs <correction-spec.json> <patch-manifest.json> <result.json>');
  process.exit(2);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const result = JSON.parse(readFileSync(resultPath, 'utf8'));
const commands = Array.isArray(result.commands) ? result.commands.map((command) => String(command.cmd || '')) : [];
const files = Array.isArray(manifest.files_changed) ? manifest.files_changed : [];
// Support both old (selected.acceptance_checks) and new (top-level acceptance_checks) schemas
const acceptance = Array.isArray(spec.acceptance_checks) ? spec.acceptance_checks.map(String)
  : Array.isArray(spec.selected?.acceptance_checks) ? spec.selected.acceptance_checks.map(String) : [];

function requireCommand(fragment) {
  if (!commands.some((cmd) => cmd.includes(fragment))) {
    console.error(`verification did not run required command containing: ${fragment}`);
    process.exit(1);
  }
}

requireCommand('pnpm --filter @converge/cli build');
requireCommand('pnpm --filter @converge/core build');
for (const check of acceptance) {
  if (check.startsWith('pnpm vitest run tests/')) requireCommand(check);
}

const changedSource = files.some((file) => file.startsWith('packages/') && /\.(ts|tsx)$/.test(file));
if (changedSource && !commands.some((cmd) => cmd.startsWith('pnpm vitest run tests/'))) {
  console.error('source changes require at least one focused tests/ Vitest command');
  process.exit(1);
}

if (files.some((file) => file.includes('packages/core/src/run') || /seed|runstate|loop/.test(file))) {
  requireCommand('tests/playbook-loop-seed.test.ts');
  requireCommand('tests/playbook-seeds.test.ts');
}
if (files.some((file) => file.includes('packages/core/src/playbook') || file.includes('packages/core/src/plan') || file.includes('packages/core/src/manifest') || file.includes('tests/playbook-compile.test.ts') || file.includes('tests/playbook-dag.test.ts'))) {
  requireCommand('tests/playbook-compile.test.ts');
  requireCommand('tests/playbook-dag.test.ts');
}
if (files.some((file) => file.includes('packages/cli/src/'))) {
  requireCommand('tests/cli-help.test.ts');
}

if (result.result === 'pass' && result.regression_added === false && !result.regression_exception) {
  console.error('passing verification without a new regression requires regression_exception');
  process.exit(1);
}
