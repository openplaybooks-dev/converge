import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { resolveProjectRoot } from './converge-adapter/index';
import { RingBuffer } from './ring-buffer';
import { attachCorrelator } from './session-correlator';

export interface RunHandle {
  runId: string;
  pid: number;
  playbook: string;
  startedAt: Date;
  sessionId?: string;
  stdout: RingBuffer;
  stderr: RingBuffer;
  status: 'running' | 'exited';
  exitCode?: number;
  emitter: EventEmitter;
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
    setTimeout(() => handles.delete(runId), 10 * 60 * 1000);
  });

  void attachCorrelator({
    playbook,
    startedAt: handle.startedAt,
    onDetect: (sessionId) => {
      handle.sessionId = sessionId;
      handle.emitter.emit('session-detected', { sessionId });
    },
  }).catch(() => { /* ignore — orphan run still has stdout */ });

  return handle;
}

export function getRun(runId: string): RunHandle | undefined { return handles.get(runId); }
export function listRuns(): RunHandle[] { return Array.from(handles.values()); }