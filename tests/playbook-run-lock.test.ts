import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
});
