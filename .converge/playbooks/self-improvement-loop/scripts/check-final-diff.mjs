#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [projectDir, manifestPath] = process.argv.slice(2);
if (!projectDir || !manifestPath) {
  console.error('usage: check-final-diff.mjs <project-dir> <patch-manifest.json>');
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const declared = [...new Set(manifest.files_changed || [])].sort();
const actual = execFileSync('node', [`${projectDir}/.converge/playbooks/self-improvement-loop/scripts/list-nonartifact-diff.mjs`, projectDir], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .sort();

const undeclared = actual.filter((file) => !declared.includes(file));
const missing = declared.filter((file) => !actual.includes(file));
if (undeclared.length || missing.length) {
  if (undeclared.length) console.error(`final diff has undeclared files: ${undeclared.join(', ')}`);
  if (missing.length) console.error(`manifest files absent from final diff: ${missing.join(', ')}`);
  process.exit(1);
}
