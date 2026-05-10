#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const [projectDir = process.cwd(), checkpointPath = '.converge/artifacts/self-improvement-loop/checkpoint.json'] = process.argv.slice(2);

function git(args, options = {}) {
  return execFileSync('git', ['-C', projectDir, ...args], { encoding: 'utf8', ...options });
}

const dirty = execFileSync('node', [`${projectDir}/.converge/playbooks/self-improvement-loop/scripts/list-nonartifact-diff.mjs`, projectDir], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .sort();

const checkpoint = {
  created_at: new Date().toISOString(),
  action: dirty.length ? 'commit' : 'none',
  files: dirty,
  commit: null,
};

if (dirty.length) {
  git(['add', '--', ...dirty], { stdio: 'pipe' });
  const message = 'chore: checkpoint before self improvement loop';
  git(['commit', '-m', message], { stdio: 'pipe' });
  checkpoint.commit = git(['rev-parse', 'HEAD']).trim();
  console.error(`self-improvement checkpoint committed ${dirty.length} dirty file(s): ${checkpoint.commit}`);
  for (const file of dirty) console.error(`- ${file}`);
}

mkdirSync(dirname(checkpointPath), { recursive: true });
writeFileSync(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
