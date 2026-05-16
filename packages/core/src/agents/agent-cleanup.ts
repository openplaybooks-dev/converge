import { AgentManager } from "./agent-manager.js";

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Surface rejections from a Promise.allSettled fan-out so that failed
 * kills don't vanish. Pre-fix, agent cleanup used `await
 * Promise.allSettled(...)` and discarded the result — if 3 of 8
 * SIGTERMs failed (permission, ESRCH, etc.), the operator had no idea.
 * Now: aggregate rejection reasons and print a single warning that
 * names every survivor's PID and the failure cause.
 */
function reportKillFailures<P extends { pid: number }>(
  phase: string,
  processes: P[],
  results: PromiseSettledResult<unknown>[],
): void {
  const failures = results
    .map((r, i) => ({ result: r, proc: processes[i] }))
    .filter((x) => x.result.status === "rejected") as Array<{
    result: PromiseRejectedResult;
    proc: P;
  }>;
  if (failures.length === 0) return;
  console.warn(
    `  ⚠️  ${phase}: ${failures.length}/${processes.length} kill(s) failed:`,
  );
  for (const f of failures) {
    const reason = f.result.reason;
    const msg =
      reason instanceof Error ? reason.message : String(reason ?? "unknown");
    console.warn(`     PID=${f.proc.pid}: ${msg}`);
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/** Set by the CLI to signal graceful abort instead of process.exit(). */
export let globalAbortController: AbortController | null = null;

export class AgentCleanup {
  // Graceful shutdown
  static async shutdownAll(timeoutMs = 5000): Promise<void> {
    const manager = AgentManager.getInstance();
    const processes = manager
      .getAllProcesses()
      .filter((p) => p.status !== "dead");

    if (processes.length === 0) {
      console.log("✅ No active agents to shutdown");
      return;
    }

    console.log(`🔄 Shutting down ${processes.length} active agents...`);

    // Phase 1: SIGTERM (graceful)
    console.log("  Phase 1: Sending SIGTERM...");
    const sigTermResults = await Promise.allSettled(
      processes.map((p) => manager.killProcess(p.pid, "SIGTERM")),
    );
    reportKillFailures("SIGTERM", processes, sigTermResults);

    // Phase 2: Wait up to timeoutMs
    console.log(
      `  Phase 2: Waiting up to ${timeoutMs}ms for graceful shutdown...`,
    );
    const waitStart = Date.now();
    while (Date.now() - waitStart < timeoutMs) {
      const aliveCount = manager
        .getAllProcesses()
        .filter((p) => p.status !== "dead").length;
      if (aliveCount === 0) {
        console.log("  ✅ All agents shut down gracefully");
        return;
      }
      await sleepMs(500);
    }

    // Phase 3: SIGKILL (force)
    const survivors = manager
      .getAllProcesses()
      .filter((p) => p.status !== "dead");
    if (survivors.length > 0) {
      console.log(
        `  Phase 3: Force killing ${survivors.length} remaining agents...`,
      );
      const sigKillResults = await Promise.allSettled(
        survivors.map((p) => manager.killProcess(p.pid, "SIGKILL")),
      );
      reportKillFailures("SIGKILL", survivors, sigKillResults);
    }

    // Final cleanup
    manager.cleanupDeadProcesses();
    console.log("✅ Shutdown complete");
  }

  // Orphan cleanup
  static async cleanupOrphans(): Promise<number> {
    const manager = AgentManager.getInstance();
    const leaked = manager.getLeakedProcesses();

    if (leaked.length === 0) {
      return 0;
    }

    console.log(`🗑️  Found ${leaked.length} orphaned agents:`);

    for (const proc of leaked) {
      const uptime = formatDuration(Date.now() - proc.startedAt);
      console.log(
        `  - PID=${proc.pid} sessionId=${proc.sessionId} (running for ${uptime})`,
      );
      await manager.killProcess(proc.pid, "SIGKILL");
    }

    manager.cleanupDeadProcesses();

    return leaked.length;
  }

  // Session cleanup
  static async cleanupSession(sessionId: string): Promise<void> {
    const manager = AgentManager.getInstance();
    const procs = manager
      .getAllProcesses()
      .filter((p) => p.sessionId === sessionId);

    if (procs.length === 0) {
      console.log(`✅ No agents found for sessionId=${sessionId}`);
      return;
    }

    console.log(
      `🗑️  Cleaning up ${procs.length} agents for sessionId=${sessionId}`,
    );
    const results = await Promise.allSettled(
      procs.map((p) => manager.killProcess(p.pid)),
    );
    reportKillFailures("session-cleanup", procs, results);
    manager.cleanupDeadProcesses();
  }

  // Task cleanup
  static async cleanupTask(taskId: string): Promise<void> {
    const manager = AgentManager.getInstance();
    await manager.cleanupTask(taskId);
    manager.cleanupDeadProcesses();
  }

  // Epic cleanup
  static async cleanupEpic(epicId: string): Promise<void> {
    const manager = AgentManager.getInstance();
    await manager.cleanupEpic(epicId);
    manager.cleanupDeadProcesses();
  }

  // Hung process cleanup
  static async cleanupHungProcesses(): Promise<number> {
    const manager = AgentManager.getInstance();
    const hung = manager.getHungProcesses();

    if (hung.length === 0) {
      return 0;
    }

    console.log(`⚠️  Found ${hung.length} hung agents:`);

    for (const proc of hung) {
      const idleDuration = formatDuration(Date.now() - proc.lastActivityAt);
      console.log(
        `  - PID=${proc.pid} sessionId=${proc.sessionId} (idle for ${idleDuration})`,
      );
      await manager.killProcess(proc.pid, "SIGKILL");
    }

    manager.cleanupDeadProcesses();

    return hung.length;
  }

  // Full cleanup (orphans + hung + dead)
  static async fullCleanup(): Promise<{
    orphans: number;
    hung: number;
    dead: number;
  }> {
    console.log("🔄 Running full agent cleanup...");

    const orphansCount = await this.cleanupOrphans();
    const hungCount = await this.cleanupHungProcesses();

    const manager = AgentManager.getInstance();
    const deadBefore = manager
      .getAllProcesses()
      .filter((p) => p.status === "dead").length;
    manager.cleanupDeadProcesses();
    const deadAfter = manager
      .getAllProcesses()
      .filter((p) => p.status === "dead").length;
    const deadCount = deadBefore - deadAfter;

    console.log(
      `✅ Cleanup complete: ${orphansCount} orphans, ${hungCount} hung, ${deadCount} dead`,
    );

    return {
      orphans: orphansCount,
      hung: hungCount,
      dead: deadCount,
    };
  }
}

// Global cleanup handler registration
let cleanupHandlersRegistered = false;

export function registerCleanupHandlers(): void {
  if (cleanupHandlersRegistered) {
    return;
  }

  process.on("SIGINT", async () => {
    await AgentCleanup.shutdownAll();
  });

  process.on("SIGTERM", async () => {
    await AgentCleanup.shutdownAll();
  });

  process.on("beforeExit", async () => {
    console.log("\n⚠️  Process exiting, cleaning up agents...");
    await AgentCleanup.cleanupOrphans();
  });

  // Uncaught exception handler — log and let the run loop handle abort.
  // We must NOT call process.exit() here: doing so kills the runner
  // mid-execution, losing all progress. Instead, signal the abort
  // controller so the run loop can finish gracefully.
  process.on("uncaughtException", async (error) => {
    console.error("\n❌ Uncaught exception:", error);
    await AgentCleanup.shutdownAll(2000);
    if (globalAbortController) {
      globalAbortController.abort(error);
    }
    process.exitCode = 1;
  });

  // Unhandled rejection handler — same: log + signal, don't kill.
  process.on("unhandledRejection", async (reason, promise) => {
    console.error("\n❌ Unhandled rejection at:", promise, "reason:", reason);
    await AgentCleanup.shutdownAll(2000);
    if (globalAbortController) {
      globalAbortController.abort(reason instanceof Error ? reason : new Error(String(reason)));
    }
    process.exitCode = 1;
  });

  cleanupHandlersRegistered = true;
  // Iter-32: emit to stderr, not stdout. This is a startup-telemetry
  // banner — operators want to see it in their terminal, but it MUST
  // NOT pollute stdout because read-only commands (doctor, goals list,
  // skills list, playbook validate) use stdout for their structured
  // (often JSON) output. Pre-iter-32, `converge doctor --json | jq`
  // failed because the banner was interleaved before the JSON object.
  console.error("✅ Agent cleanup handlers registered");
}
