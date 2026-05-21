import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadPlaybookFromFolder, run } from '../packages/core/src/index';

describe('playbook run lock interruption recovery', () => {
  it('keeps stale run-lock state recoverable by replacing the interrupted lock file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'converge-run-lock-'));
    const lockPath = join(root, 'self-improvement-loop.run.lock');

    try {
      await writeFile(lockPath, JSON.stringify({ pid: 1, startedAt: 'interrupted' }), { flag: 'wx' });

      await rm(lockPath);
      await writeFile(lockPath, JSON.stringify({ pid: process.pid, recoveredFrom: 'interrupted' }), { flag: 'wx' });

      await expect(writeFile(lockPath, 'second concurrent run', { flag: 'wx' })).rejects.toMatchObject({ code: 'EEXIST' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not accept cached completion when a declared output is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'converge-output-cache-'));
    const playbookDir = join(root, '.converge', 'playbooks', 'default');
    const taskDir = join(playbookDir, 'tasks', 'write-output');
    const outputPath = join(root, 'out.txt');

    try {
      await mkdir(taskDir, { recursive: true });
      await mkdir(join(root, '.converge'), { recursive: true });
      await writeFile(join(root, '.converge', 'project.yaml'), 'name: output-cache-test\n');
      await writeFile(join(playbookDir, 'playbook.yml'), 'name: default\n');
      await writeFile(join(taskDir, 'TASK.md'), `---
id: write-output
outputs:
  - out.txt
checks:
  - id: output-exists
    cmd: test -s out.txt
    description: output exists
---

# Write output

Create out.txt with any non-empty content.
`);

      const playbook = await loadPlaybookFromFolder(playbookDir);
      await writeFile(outputPath, 'first-pass');
      await run(playbook, { projectDir: root, playbookDir, maxTaskAttempts: 1 });

      await rm(outputPath);
      await rm(join(root, '.converge', 'journal', 'default', 'runstate.json'));
      await run(playbook, { projectDir: root, playbookDir, maxTaskAttempts: 1, dry: true });

      expect(existsSync(outputPath)).toBe(false);
      const runstate = JSON.parse(await readFile(join(root, '.converge', 'journal', 'default', 'runstate.json'), 'utf8'));
      expect(runstate.dag.nodes['write-output'].status).toBe('pending');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
