/**
 * Process Manager
 *
 * Internal manager for background processes (dev servers, etc.).
 * Handles spawn, ready detection, health checks, restart-on-crash, and cleanup.
 *
 * Task authors interact via ctx.bg(id) — this class is not exposed directly.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import type {
  BackgroundConfig,
  BgHandle,
  BgStatus,
  BgStatusFile,
  ManagedProcess,
  OutputLine,
  ErrorLine,
  HealthCheckConfig,
} from './types.ts';

const OUTPUT_BUFFER_SIZE = 1000;

export class ProcessManager {
  private processes = new Map<string, ManagedProcessEntry>();
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /* ---------------------------------------------------------------- */
  /*  Spawn                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Spawn a background process.
   *
   * @param id      - Task ID (used for filesystem state and ctx.bg(id))
   * @param command - Shell command to run (from .execute())
   * @param config  - Background config (readyWhen, healthCheck, etc.)
   */
  async start(
    id: string,
    command: string,
    args: string[] = [],
    config: BackgroundConfig
  ): Promise<BgHandle> {
    if (this.processes.has(id)) {
      throw new Error(`Background process '${id}' already running`);
    }

    const entry = this.spawnProcess(id, command, args, config);
    this.processes.set(id, entry);

    // Wait for ready
    await this.waitForReadyInternal(entry, config.readyTimeout ?? 30_000);

    // Start health checks if configured
    if (config.healthCheck) {
      this.startHealthCheck(entry, config.healthCheck);
    }

    return this.createHandle(entry);
  }

  /* ---------------------------------------------------------------- */
  /*  Access                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Get a handle for a running background process.
   */
  get(id: string): BgHandle | undefined {
    const entry = this.processes.get(id);
    if (!entry) return undefined;
    return this.createHandle(entry);
  }

  /**
   * List all managed process IDs.
   */
  list(): string[] {
    return Array.from(this.processes.keys());
  }

  /* ---------------------------------------------------------------- */
  /*  Stop                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Stop a specific background process.
   */
  async stop(id: string): Promise<void> {
    const entry = this.processes.get(id);
    if (!entry) return;

    this.cleanup(entry);
    this.processes.delete(id);
  }

  /**
   * Stop all managed processes. Called on epic completion/failure.
   */
  async stopAll(): Promise<void> {
    for (const [id, entry] of this.processes) {
      this.cleanup(entry);
    }
    this.processes.clear();
  }

  /* ---------------------------------------------------------------- */
  /*  Internal: Spawn                                                 */
  /* ---------------------------------------------------------------- */

  private spawnProcess(
    id: string,
    command: string,
    args: string[],
    config: BackgroundConfig
  ): ManagedProcessEntry {
    const child = spawn(command, args, {
      cwd: this.projectDir,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    const state: ManagedProcess = {
      id,
      pid: child.pid ?? null,
      status: 'starting',
      startedAt: Date.now(),
      readyAt: null,
      config,
      outputBuffer: [],
      errors: [],
      restartCount: 0,
    };

    const emitter = new EventEmitter();
    const entry: ManagedProcessEntry = { state, child, emitter, healthTimer: null };

    // Pipe stdout
    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        this.onOutput(entry, 'stdout', line);
      }
    });

    // Pipe stderr
    child.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        this.onOutput(entry, 'stderr', line);
      }
    });

    // Handle exit
    child.on('exit', (code, signal) => {
      if (state.status === 'stopped') return; // intentional stop

      if (config.restartOnCrash && state.restartCount < (config.maxRestarts ?? 3)) {
        state.restartCount++;
        state.status = 'starting';
        console.warn(`[ProcessManager] Process '${id}' crashed (code=${code}), restarting (attempt ${state.restartCount})...`);

        // Re-spawn
        const newEntry = this.spawnProcess(id, command, args, config);
        newEntry.state.restartCount = state.restartCount;
        this.processes.set(id, newEntry);

        // Re-detect ready
        this.waitForReadyInternal(newEntry, config.readyTimeout ?? 30_000).catch(() => {
          newEntry.state.status = 'crashed';
          this.writeStatusFile(newEntry);
        });
      } else {
        state.status = 'crashed';
        this.writeStatusFile(entry);
        emitter.emit('crashed', { code, signal });
      }
    });

    // Write initial status
    this.writeStatusFile(entry);

    return entry;
  }

  /* ---------------------------------------------------------------- */
  /*  Internal: Output handling                                       */
  /* ---------------------------------------------------------------- */

  private onOutput(entry: ManagedProcessEntry, stream: 'stdout' | 'stderr', text: string) {
    const line: OutputLine = { timestamp: Date.now(), stream, text };

    // Ring buffer
    entry.state.outputBuffer.push(line);
    if (entry.state.outputBuffer.length > OUTPUT_BUFFER_SIZE) {
      entry.state.outputBuffer.shift();
    }

    // Track errors (stderr lines or error patterns)
    if (stream === 'stderr' || /\berror\b/i.test(text)) {
      entry.state.errors.push({ timestamp: line.timestamp, text });
    }

    // Emit for async iterables
    entry.emitter.emit('output', text);

    // Write to log file
    const logDir = this.stateDir(entry.state.id);
    try {
      appendFileSync(join(logDir, 'output.log'), `[${stream}] ${text}\n`);
    } catch {
      // Ignore write failures
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Internal: Ready detection                                       */
  /* ---------------------------------------------------------------- */

  private waitForReadyInternal(entry: ManagedProcessEntry, timeout: number): Promise<void> {
    const { config } = entry.state;
    const pattern = typeof config.readyWhen === 'string'
      ? new RegExp(config.readyWhen)
      : config.readyWhen;

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        entry.state.status = 'crashed';
        this.writeStatusFile(entry);
        reject(new Error(`Background process '${entry.state.id}' did not become ready within ${timeout}ms`));
      }, timeout);

      const onOutput = (text: string) => {
        if (pattern.test(text)) {
          cleanup();
          entry.state.status = 'ready';
          entry.state.readyAt = Date.now();
          this.writeStatusFile(entry);
          resolve();
        }
      };

      const onCrashed = () => {
        cleanup();
        reject(new Error(`Background process '${entry.state.id}' crashed before becoming ready`));
      };

      const cleanup = () => {
        clearTimeout(timer);
        entry.emitter.off('output', onOutput);
        entry.emitter.off('crashed', onCrashed);
      };

      entry.emitter.on('output', onOutput);
      entry.emitter.on('crashed', onCrashed);

      // Check existing output buffer for ready pattern
      for (const line of entry.state.outputBuffer) {
        if (pattern.test(line.text)) {
          cleanup();
          entry.state.status = 'ready';
          entry.state.readyAt = Date.now();
          this.writeStatusFile(entry);
          resolve();
          return;
        }
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Internal: Health checks                                         */
  /* ---------------------------------------------------------------- */

  private startHealthCheck(entry: ManagedProcessEntry, config: string | HealthCheckConfig) {
    const hc: HealthCheckConfig = typeof config === 'string'
      ? { url: config, interval: 5_000, failureThreshold: 3 }
      : { interval: 5_000, failureThreshold: 3, ...config };

    let consecutiveFailures = 0;

    entry.healthTimer = setInterval(async () => {
      try {
        const res = await fetch(hc.url);
        if (res.ok) {
          consecutiveFailures = 0;
          if (entry.state.status === 'degraded') {
            entry.state.status = 'ready';
            this.writeStatusFile(entry);
            entry.emitter.emit('recovered');
          }
        } else {
          consecutiveFailures++;
        }
      } catch {
        consecutiveFailures++;
      }

      if (consecutiveFailures >= (hc.failureThreshold ?? 3) && entry.state.status === 'ready') {
        entry.state.status = 'degraded';
        this.writeStatusFile(entry);
        entry.emitter.emit('degraded');
      }
    }, hc.interval ?? 5_000);
  }

  /* ---------------------------------------------------------------- */
  /*  Internal: Handle factory                                        */
  /* ---------------------------------------------------------------- */

  private createHandle(entry: ManagedProcessEntry): BgHandle {
    return {
      get status() { return entry.state.status; },

      waitForReady: (timeout?: number) => {
        if (entry.state.status === 'ready' || entry.state.status === 'degraded') {
          return Promise.resolve();
        }
        return this.waitForReadyInternal(entry, timeout ?? 30_000);
      },

      waitForIdle: (timeout = 5_000) => {
        // Wait for no new output for a settling period (1s)
        return new Promise<void>((resolve) => {
          let idleTimer = setTimeout(resolve, 1_000);
          const onOutput = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
              entry.emitter.off('output', onOutput);
              resolve();
            }, 1_000);
          };
          entry.emitter.on('output', onOutput);

          // Overall timeout
          setTimeout(() => {
            entry.emitter.off('output', onOutput);
            clearTimeout(idleTimer);
            resolve();
          }, timeout);
        });
      },

      errorsSince: (time: number) => {
        return entry.state.errors
          .filter(e => e.timestamp >= time)
          .map(e => e.text);
      },

      output: {
        [Symbol.asyncIterator]() {
          const buffer: string[] = [];
          let resolve: ((value: IteratorResult<string>) => void) | null = null;
          let done = false;

          const onOutput = (text: string) => {
            if (resolve) {
              const r = resolve;
              resolve = null;
              r({ value: text, done: false });
            } else {
              buffer.push(text);
            }
          };

          entry.emitter.on('output', onOutput);
          entry.child.on('exit', () => {
            done = true;
            entry.emitter.off('output', onOutput);
            if (resolve) {
              resolve({ value: undefined as any, done: true });
            }
          });

          return {
            next(): Promise<IteratorResult<string>> {
              if (buffer.length > 0) {
                return Promise.resolve({ value: buffer.shift()!, done: false });
              }
              if (done) {
                return Promise.resolve({ value: undefined as any, done: true });
              }
              return new Promise<IteratorResult<string>>(r => { resolve = r; });
            },
            return(): Promise<IteratorResult<string>> {
              done = true;
              entry.emitter.off('output', onOutput);
              return Promise.resolve({ value: undefined as any, done: true });
            },
          };
        },
      },

      stop: () => this.stop(entry.state.id),
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Internal: Cleanup                                               */
  /* ---------------------------------------------------------------- */

  private cleanup(entry: ManagedProcessEntry) {
    entry.state.status = 'stopped';

    if (entry.healthTimer) {
      clearInterval(entry.healthTimer);
      entry.healthTimer = null;
    }

    if (entry.child && !entry.child.killed) {
      entry.child.kill('SIGTERM');
      // Force kill after 5s
      setTimeout(() => {
        if (!entry.child.killed) {
          entry.child.kill('SIGKILL');
        }
      }, 5_000);
    }

    this.writeStatusFile(entry);
  }

  /* ---------------------------------------------------------------- */
  /*  Internal: Filesystem state                                      */
  /* ---------------------------------------------------------------- */

  private stateDir(id: string): string {
    const dir = join(this.projectDir, '.harness', 'runtime', 'bg', id);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  private writeStatusFile(entry: ManagedProcessEntry) {
    const dir = this.stateDir(entry.state.id);
    const status: BgStatusFile = {
      status: entry.state.status,
      pid: entry.state.pid,
      startedAt: new Date(entry.state.startedAt).toISOString(),
      readyAt: entry.state.readyAt ? new Date(entry.state.readyAt).toISOString() : null,
      restartCount: entry.state.restartCount,
      lastError: entry.state.errors.length > 0
        ? entry.state.errors[entry.state.errors.length - 1].text
        : null,
    };
    try {
      writeFileSync(join(dir, 'status.json'), JSON.stringify(status, null, 2));
    } catch {
      // Ignore write failures
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Internal Entry Type                                               */
/* ------------------------------------------------------------------ */

interface ManagedProcessEntry {
  state: ManagedProcess;
  child: ChildProcess;
  emitter: EventEmitter;
  healthTimer: ReturnType<typeof setInterval> | null;
}
