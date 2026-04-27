# Task: 05-run-supervisor/001-supervisor-module

Build the in-process run supervisor that spawns `converge run <playbook>` and exposes streamable handles.

**`src/lib/ring-buffer.ts`**:

```ts
export class RingBuffer {
  constructor(capacityBytes: number);
  push(chunk: Buffer): void;          // overwrites oldest when full
  read(): Buffer;                     // current contents, oldest-first
  size(): number;
}
```

Cap defaults to 256 KB. Used for stdout and stderr replay to late SSE subscribers.

**`src/lib/run-supervisor.ts`**:

```ts
import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { resolveProjectRoot } from './converge-adapter/index.js';
import { RingBuffer } from './ring-buffer.js';

export interface RunHandle {
  runId: string;
  pid: number;
  playbook: string;
  startedAt: Date;
  sessionId?: string;            // set by 003-session-correlation
  stdout: RingBuffer;
  stderr: RingBuffer;
  status: 'running' | 'exited';
  exitCode?: number;
  emitter: EventEmitter;         // 'stdout-chunk' | 'stderr-chunk' | 'exit' | 'session-detected'
}

const handles = new Map<string, RunHandle>();
const MAX_CONCURRENT = 3;

export function startRun(playbook: string, inputs?: Record<string, unknown>): RunHandle {
  if (Array.from(handles.values()).filter(h => h.status === 'running').length >= MAX_CONCURRENT) {
    throw new Error(`Too many concurrent runs (cap ${MAX_CONCURRENT}). Stop one first.`);
  }
  const runId = randomUUID();
  const root = resolveProjectRoot();
  const cliBin = path.join(root, 'packages/cli/dist/index.js');

  // Verify input flag shape by reading packages/cli/src/commands-run.ts during implementation.
  // Placeholder: pass --input key=value pairs.
  const args = ['run', playbook];
  for (const [k, v] of Object.entries(inputs ?? {})) {
    args.push('--input', `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`);
  }

  const child = spawn(process.execPath, [cliBin, ...args], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const handle: RunHandle = {
    runId, pid: child.pid!, playbook, startedAt: new Date(),
    stdout: new RingBuffer(256 * 1024),
    stderr: new RingBuffer(256 * 1024),
    status: 'running',
    emitter: new EventEmitter(),
  };
  handle.emitter.setMaxListeners(50);
  handles.set(runId, handle);

  child.stdout.on('data', (c: Buffer) => { handle.stdout.push(c); handle.emitter.emit('stdout-chunk', c); });
  child.stderr.on('data', (c: Buffer) => { handle.stderr.push(c); handle.emitter.emit('stderr-chunk', c); });
  child.on('exit', (code) => {
    handle.status = 'exited';
    handle.exitCode = code ?? -1;
    handle.emitter.emit('exit', { code: handle.exitCode });
    setTimeout(() => handles.delete(runId), 10 * 60 * 1000);  // GC after 10 min
  });

  return handle;
}

export function getRun(runId: string): RunHandle | undefined { return handles.get(runId); }
export function listRuns(): RunHandle[] { return Array.from(handles.values()); }
```

**Notes**:

- Verify the CLI input-flag shape against `packages/cli/src/commands-run.ts` before finalizing the args array. The placeholder here may need to change.
- If `packages/cli/dist/index.js` is missing (dev environment without a build), fall back to `node --experimental-strip-types packages/cli/src/main.ts` or `pnpm exec converge`.
- The handles map dies on studio restart — Phase 05 task 003 documents this; orphan runs continue writing to their journal and remain inspectable via the runs list.