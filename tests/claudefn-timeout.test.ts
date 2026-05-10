import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { claudefn } from '../packages/claudefn/src/index';

describe('claudefn provider timeout handling', () => {
  it('fails when the CLI emits only startup/system output and no model activity', async () => {
    const root = await mkdtemp(join(tmpdir(), 'claudefn-timeout-'));
    const bin = join(root, 'bin');
    const logs = join(root, 'logs');
    const fakeClaude = join(bin, 'claude');

    try {
      await mkdir(bin, { recursive: true });
      await mkdir(logs, { recursive: true });
      await writeFile(fakeClaude, `#!/usr/bin/env node
process.stdout.write(JSON.stringify({ type: 'system', subtype: 'init' }) + '\\n');
setInterval(() => {}, 1000);
`);
      await import('node:fs/promises').then(({ chmod }) => chmod(fakeClaude, 0o755));

      const fn = claudefn({
        prompt: 'hello',
        cwd: root,
        logDir: logs,
        timeoutMs: 5_000,
        wallClockTimeoutMs: 10_000,
        meaningfulActivityTimeoutMs: 100,
        env: { PATH: `${bin}${delimiter}${process.env.PATH ?? ''}` },
      });

      await expect(fn()).rejects.toThrow(/no model activity/i);
      const logFile = (await import('node:fs/promises')).readdir(logs).then((files) => files.find((file) => file.endsWith('.log'))!);
      await expect(readFile(join(logs, await logFile), 'utf8')).resolves.toContain('no model activity');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
