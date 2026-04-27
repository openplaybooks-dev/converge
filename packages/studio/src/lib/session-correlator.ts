import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chokidar from 'chokidar';
import { sessionsDir } from './converge-adapter/index';

export async function attachCorrelator(opts: {
  playbook: string;
  startedAt: Date;
  onDetect: (sessionId: string) => void;
  timeoutMs?: number;
}): Promise<void> {
  const dir = sessionsDir(opts.playbook);
  await fs.mkdir(dir, { recursive: true });
  const baseline = new Set(await fs.readdir(dir).catch(() => []));

  const watcher = chokidar.watch(dir, { ignoreInitial: true, depth: 0 });
  const timeout = setTimeout(() => watcher.close(), opts.timeoutMs ?? 60_000);

  watcher.on('addDir', (full) => {
    const name = path.basename(full);
    if (baseline.has(name)) return;
    clearTimeout(timeout);
    void watcher.close();
    opts.onDetect(name);
  });
}