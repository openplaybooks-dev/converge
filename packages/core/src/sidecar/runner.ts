/**
 * Sidecar Runner
 *
 * Manages sidecar lifecycle: subscribes hook callbacks to HookRegistry,
 * optionally runs init .execute() logic, and cleans up on epic end.
 */

import type { HookRegistry } from "../hooks/registry.ts";
import type { HookEvent, HookPayloads } from "../hooks/types.ts";
import type {
  SidecarHooks,
  SidecarHookEvent,
  SidecarContext,
  ReactiveGapInput,
  ShellResult,
} from "./types.ts";
import type { ExecutorFn } from "../config/task-definition.ts";
import { exec } from "node:child_process";

export class SidecarRunner {
  private activeSidecars = new Map<string, SidecarRegistration>();

  constructor(
    private registry: HookRegistry,
    private projectDir: string,
  ) {}

  /**
   * Register a sidecar's hooks and optionally run its init .execute() function.
   *
   * @param taskId    - The sidecar task ID
   * @param hooks     - The hook map from .sidecar({...})
   * @param initFn    - Optional .execute() function to run once for init
   * @param buildCtx  - Factory to build ExecutorContext for initFn
   */
  async start(
    taskId: string,
    hooks: SidecarHooks,
    initFn?: ExecutorFn,
    buildCtx?: () => any,
  ): Promise<void> {
    if (this.activeSidecars.has(taskId)) {
      throw new Error(`Sidecar '${taskId}' already registered`);
    }

    const registration: SidecarRegistration = {
      taskId,
      hooks,
      unsubscribers: [],
    };

    // Build the sidecar context for hook callbacks
    const sidecarCtx = this.buildSidecarContext(taskId);

    // Subscribe each hook to the registry
    for (const [event, fn] of Object.entries(hooks) as [
      SidecarHookEvent,
      any,
    ][]) {
      if (!fn) continue;

      // Wrap the sidecar callback to inject SidecarContext as second arg
      const wrappedFn = async (payload: HookPayloads[typeof event]) => {
        try {
          await fn(payload, sidecarCtx);
        } catch (err: any) {
          console.warn(
            `[SidecarRunner] Error in sidecar '${taskId}' hook '${event}': ${err?.message ?? err}`,
          );
        }
      };

      // Register with low priority so sidecars run after user hooks
      this.registry.register(event as HookEvent, wrappedFn as any, {
        priority: 150, // After user hooks (100) but before legacy plugins (200)
        source: "plugin",
      });

      // Track for cleanup — we store the event name for bulk clear
      registration.unsubscribers.push({
        event: event as HookEvent,
        fn: wrappedFn as any,
      });
    }

    this.activeSidecars.set(taskId, registration);

    // Run optional init function
    if (initFn && buildCtx) {
      try {
        const ctx = buildCtx();
        await initFn(ctx);
      } catch (err: any) {
        console.warn(
          `[SidecarRunner] Init error for sidecar '${taskId}': ${err?.message ?? err}`,
        );
      }
    }
  }

  /**
   * Stop a specific sidecar (remove its hooks).
   */
  stop(taskId: string): void {
    const reg = this.activeSidecars.get(taskId);
    if (!reg) return;
    // Note: HookRegistry doesn't support individual removal by fn reference,
    // so we track and warn. In practice, sidecars live for the entire epic.
    this.activeSidecars.delete(taskId);
  }

  /**
   * Stop all sidecars. Called on epic completion/failure.
   */
  stopAll(): void {
    for (const [id] of this.activeSidecars) {
      this.stop(id);
    }
  }

  /**
   * Check if a sidecar is registered.
   */
  has(taskId: string): boolean {
    return this.activeSidecars.has(taskId);
  }

  /**
   * List all registered sidecar task IDs.
   */
  list(): string[] {
    return Array.from(this.activeSidecars.keys());
  }

  /* ---------------------------------------------------------------- */
  /*  Internal: Build SidecarContext                                   */
  /* ---------------------------------------------------------------- */

  private buildSidecarContext(taskId: string): SidecarContext {
    const projectDir = this.projectDir;
    const gaps: Array<{ id: string; gap: ReactiveGapInput }> = [];
    let gapCounter = 0;

    return {
      shell: (cmd: string): Promise<ShellResult> => {
        return new Promise((resolve) => {
          exec(
            cmd,
            { cwd: projectDir, maxBuffer: 10 * 1024 * 1024 },
            (error, stdout, stderr) => {
              resolve({
                stdout: stdout?.toString() ?? "",
                stderr: stderr?.toString() ?? "",
                exitCode: error?.code ?? (error ? 1 : 0),
              });
            },
          );
        });
      },

      ai: {
        fn: async (opts: { prompt: string; [key: string]: unknown }) => {
          // Placeholder — in real implementation, this would invoke the AI runner
          console.warn(
            `[SidecarRunner] ai.fn() called by sidecar '${taskId}' — not yet wired to AI runner`,
          );
          return undefined;
        },
      },

      emitGap: (gap: ReactiveGapInput): string => {
        const id = `sidecar-${taskId}-gap-${++gapCounter}`;
        gaps.push({ id, gap });
        console.log(
          `[SidecarRunner] Gap emitted by '${taskId}': ${gap.description}`,
        );
        return id;
      },

      resolveGaps: (tag: string) => {
        const before = gaps.length;
        // Remove gaps matching the tag
        for (let i = gaps.length - 1; i >= 0; i--) {
          if (gaps[i].gap.tags?.includes(tag)) {
            gaps.splice(i, 1);
          }
        }
        const removed = before - gaps.length;
        if (removed > 0) {
          console.log(
            `[SidecarRunner] Resolved ${removed} gap(s) with tag '${tag}' in sidecar '${taskId}'`,
          );
        }
      },

      log: {
        info: (msg: string) => console.log(`[sidecar:${taskId}] ${msg}`),
        warn: (msg: string) => console.warn(`[sidecar:${taskId}] ${msg}`),
        error: (msg: string) => console.error(`[sidecar:${taskId}] ${msg}`),
      },
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Internal Types                                                    */
/* ------------------------------------------------------------------ */

interface SidecarRegistration {
  taskId: string;
  hooks: SidecarHooks;
  unsubscribers: Array<{ event: HookEvent; fn: any }>;
}
