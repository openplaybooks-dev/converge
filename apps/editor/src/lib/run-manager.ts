import "server-only";
import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { resolveProjectRoot } from "@/lib/core";

const LOG_BUFFER_LINES = 100;
const KILL_GRACE_MS = 5_000;
const STATE_KEY = "__convergeEditorRunManager_v1";

interface RunningProcess {
  child: ChildProcess;
  pid: number;
  startedAt: string;
  cliPath: string;
  exitedAt?: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  /** Most recent stdout+stderr lines, oldest first. Bounded by LOG_BUFFER_LINES. */
  log: string[];
  /** Set while a stop is in flight to debounce repeat clicks. */
  stopping: boolean;
}

interface ManagerState {
  byPlaybook: Map<string, RunningProcess>;
}

function getState(): ManagerState {
  const g = globalThis as unknown as Record<string, ManagerState | undefined>;
  let state = g[STATE_KEY];
  if (!state) {
    state = { byPlaybook: new Map() };
    g[STATE_KEY] = state;
  }
  return state;
}

export class RunManagerError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "already_running"
      | "not_running"
      | "cli_not_found"
      | "spawn_failed",
  ) {
    super(message);
  }
}

export function resolveCliPath(): string | null {
  const override = process.env.CONVERGE_BIN;
  if (override && existsSync(override)) return override;

  // Try to resolve through node module resolution from the editor app.
  try {
    const require = createRequire(import.meta.url);
    const resolved = require.resolve("@converge/cli/dist/index.js");
    if (existsSync(resolved)) return resolved;
  } catch {
    // fall through
  }

  // Fallback: <projectRoot>/packages/cli/dist/index.js — covers the case
  // where we're running inside the converge monorepo before the CLI has
  // been hoisted into node_modules.
  const root = resolveProjectRoot();
  const direct = join(root, "packages", "cli", "dist", "index.js");
  if (existsSync(direct)) return direct;

  return null;
}

function appendLog(buf: string[], chunk: string): void {
  // Split on newline boundaries; keep partial last line on next call. Keep
  // buf bounded — drop oldest lines once we exceed the cap.
  const lines = chunk.split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    buf.push(line.length > 500 ? `${line.slice(0, 497)}…` : line);
  }
  while (buf.length > LOG_BUFFER_LINES) buf.shift();
}

export interface RunStatus {
  running: boolean;
  startedAt?: string;
  exitedAt?: string;
  pid?: number;
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  cliPath?: string;
  recentLogLines?: string[];
  stopping?: boolean;
}

export function getRunStatus(playbookName: string): RunStatus {
  const proc = getState().byPlaybook.get(playbookName);
  if (!proc) return { running: false };
  return {
    running: proc.exitedAt === undefined,
    startedAt: proc.startedAt,
    exitedAt: proc.exitedAt,
    pid: proc.pid,
    exitCode: proc.exitCode,
    signal: proc.signal,
    cliPath: proc.cliPath,
    recentLogLines: proc.log.slice(-50),
    stopping: proc.stopping,
  };
}

export function startRun(playbookName: string): RunStatus {
  const state = getState();
  const existing = state.byPlaybook.get(playbookName);
  if (existing && existing.exitedAt === undefined) {
    throw new RunManagerError(
      `Playbook "${playbookName}" is already running (pid ${existing.pid})`,
      "already_running",
    );
  }

  const cliPath = resolveCliPath();
  if (!cliPath) {
    throw new RunManagerError(
      "Cannot find the converge CLI. Run `pnpm --filter @converge/cli build`, " +
        "or set CONVERGE_BIN to an absolute path.",
      "cli_not_found",
    );
  }

  const cwd = resolveProjectRoot();

  let child: ChildProcess;
  try {
    child = spawn(process.execPath, [cliPath, "run", playbookName], {
      cwd,
      // Inherit env so ANTHROPIC_API_KEY, PATH, etc. carry through. Always
      // override CONVERGE_PLAYBOOK so journal layout is unambiguous.
      env: { ...process.env, CONVERGE_PLAYBOOK: playbookName },
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
  } catch (err) {
    throw new RunManagerError(
      `Failed to spawn converge: ${err instanceof Error ? err.message : String(err)}`,
      "spawn_failed",
    );
  }

  if (!child.pid) {
    throw new RunManagerError(
      "Failed to spawn converge: no pid",
      "spawn_failed",
    );
  }

  const proc: RunningProcess = {
    child,
    pid: child.pid,
    startedAt: new Date().toISOString(),
    cliPath,
    exitCode: null,
    signal: null,
    log: [],
    stopping: false,
  };

  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => appendLog(proc.log, chunk));
  child.stderr?.on("data", (chunk: string) => appendLog(proc.log, chunk));

  child.on("exit", (code, signal) => {
    proc.exitedAt = new Date().toISOString();
    proc.exitCode = code;
    proc.signal = signal;
    proc.stopping = false;
  });

  child.on("error", (err) => {
    appendLog(proc.log, `[spawn error] ${err.message}`);
  });

  state.byPlaybook.set(playbookName, proc);
  return getRunStatus(playbookName);
}

export async function stopRun(playbookName: string): Promise<RunStatus> {
  const state = getState();
  const proc = state.byPlaybook.get(playbookName);
  if (!proc || proc.exitedAt !== undefined) {
    throw new RunManagerError(
      `Playbook "${playbookName}" is not currently running`,
      "not_running",
    );
  }

  proc.stopping = true;

  // Best-effort SIGTERM, then SIGKILL after a grace period if still alive.
  proc.child.kill("SIGTERM");

  const exited = await Promise.race([
    new Promise<true>((resolve) => proc.child.once("exit", () => resolve(true))),
    new Promise<false>((resolve) => setTimeout(() => resolve(false), KILL_GRACE_MS)),
  ]);

  if (!exited) {
    try {
      proc.child.kill("SIGKILL");
    } catch {
      // child may have exited between the check and the call
    }
  }

  return getRunStatus(playbookName);
}

/**
 * Best-effort cleanup on server shutdown — Next dev mode in particular can
 * orphan children when the parent process is killed abruptly.
 */
function registerShutdownHook() {
  if ((globalThis as Record<string, unknown>)["__convergeEditorRunManagerShutdownHooked"]) return;
  (globalThis as Record<string, unknown>)["__convergeEditorRunManagerShutdownHooked"] = true;
  const cleanup = () => {
    const state = getState();
    for (const proc of state.byPlaybook.values()) {
      if (proc.exitedAt === undefined) {
        try {
          proc.child.kill("SIGTERM");
        } catch {
          // ignore
        }
      }
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });
}

registerShutdownHook();
