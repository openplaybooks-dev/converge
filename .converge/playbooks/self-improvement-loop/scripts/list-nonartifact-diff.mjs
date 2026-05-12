#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

process.stdout.on('error', (error) => {
  if (error.code === 'EPIPE') process.exit(0);
  throw error;
});

const [projectDir = process.cwd()] = process.argv.slice(2);
const tracked = execFileSync('git', ['-C', projectDir, 'diff', '--name-only'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const staged = execFileSync('git', ['-C', projectDir, 'diff', '--cached', '--name-only'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const untracked = execFileSync('git', ['-C', projectDir, 'ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const committed = execFileSync('git', ['-C', projectDir, 'diff', 'HEAD~1', '--name-only'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const all = [...new Set([...tracked, ...staged, ...untracked, ...committed])]
  .filter((file) => !file.startsWith('.converge/artifacts/'))
  .filter((file) => !file.startsWith('.converge/journal/'))
  .filter((file) => !file.startsWith('.converge/locks/'))
  .sort();
process.stdout.write(all.join('\n'));
if (all.length) process.stdout.write('\n');
