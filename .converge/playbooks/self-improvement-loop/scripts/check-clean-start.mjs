#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const [projectDir = process.cwd()] = process.argv.slice(2);
const dirty = execFileSync('node', [`${projectDir}/.converge/playbooks/self-improvement-loop/scripts/list-nonartifact-diff.mjs`, projectDir], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
if (dirty.length) {
  console.error('self-improvement loop requires a clean non-artifact working tree before starting:');
  for (const file of dirty) console.error(`- ${file}`);
  process.exit(1);
}
