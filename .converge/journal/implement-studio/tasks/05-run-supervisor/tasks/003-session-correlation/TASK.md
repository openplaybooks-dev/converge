---
id: 003-session-correlation
title: Correlate spawned runs to journal session directories
dependencies:
  - 001-supervisor-module
outputs:
  - packages/converge-studio/src/lib/session-correlator.ts
checks:
  - id: correlator-exists
    description: Correlator module exists
    cmd: "test -f packages/converge-studio/src/lib/session-correlator.ts"
  - id: typecheck
    description: Module typechecks
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: integrated
    description: run-supervisor wires the correlator
    cmd: "grep -q 'session-correlator\\|attachCorrelator' packages/converge-studio/src/lib/run-supervisor.ts"
---

After `startRun`, watch `.converge/journal/<playbook>/sessions/` for the next directory created. That directory's name is the session id; attach it to the `RunHandle`.

**`src/lib/session-correlator.ts`**:

```ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chokidar from 'chokidar';
import { sessionsDir } from './converge-adapter/index.js';

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
```

**Wire into `run-supervisor.ts`**: in `startRun`, immediately after the spawn, fire-and-forget:

```ts
attachCorrelator({
  playbook,
  startedAt: handle.startedAt,
  onDetect: (sessionId) => {
    handle.sessionId = sessionId;
    handle.emitter.emit('session-detected', { sessionId });
  },
}).catch(() => { /* ignore — orphan run still has stdout */ });
```

**Race risk**: if two runs of the same playbook start within the same millisecond, the "first new dir wins" assumption may attach the wrong session id to one of them. Mitigation:
- Hold a process-level mutex serializing same-playbook spawns with a 100ms gap, OR
- Match the new dir's name against the session-id timestamp prefix and `startedAt` to disambiguate.

For MVP, document the limitation in the README and add a TODO to add `--session-id` support to the CLI (preassign a UUID, eliminate the race).
