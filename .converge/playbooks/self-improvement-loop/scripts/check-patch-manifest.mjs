#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [projectDir, manifestPath] = process.argv.slice(2);
if (!projectDir || !manifestPath) {
  console.error('usage: check-patch-manifest.mjs <project-dir> <patch-manifest.json>');
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const declared = new Set(manifest.files_changed || []);
if (declared.size === 0) {
  console.error('patch manifest must declare at least one changed file');
  process.exit(1);
}

const sourceDiff = execFileSync('node', [`${projectDir}/.converge/playbooks/self-improvement-loop/scripts/list-nonartifact-diff.mjs`, projectDir], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const undeclared = sourceDiff.filter((file) => !declared.has(file));
if (undeclared.length) {
  console.error(`changed files missing from patch manifest: ${undeclared.join(', ')}`);
  process.exit(1);
}

const missing = [...declared].filter((file) => !sourceDiff.includes(file));
if (missing.length) {
  console.error(`patch manifest declares files not present in git diff: ${missing.join(', ')}`);
  process.exit(1);
}
