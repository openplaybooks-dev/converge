/**
 * Discovery Watcher
 *
 * Wraps `chokidar` to watch configured discovery patterns for file changes
 * and trigger re-scanning in watch mode (`discovery.watch: true`).
 *
 * `chokidar` is an optional peer dependency. If not installed, the watcher
 * degrades gracefully with a helpful install instruction. The rest of the
 * framework continues to work — watch mode is simply disabled.
 *
 * Install watch mode support:
 *   npm install --save-dev chokidar
 *   pnpm add -D chokidar
 */

import type { HookRegistry } from "../../hooks/registry.ts";
import type { DiscoveryChangeEvent, DiscoveredFileType } from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Optional Chokidar Import                                          */
/* ------------------------------------------------------------------ */

async function tryLoadChokidar(): Promise<typeof import("chokidar") | null> {
  try {
    return await import("chokidar");
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Watcher                                                            */
/* ------------------------------------------------------------------ */

export class DiscoveryWatcher {
  private watcher: any = null;
  private hooks?: HookRegistry;

  constructor(hooks?: HookRegistry) {
    this.hooks = hooks;
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  Lifecycle                                                       */
  /* ──────────────────────────────────────────────────────────────── */

  /**
   * Start watching patterns for changes.
   *
   * @param patterns    - Glob patterns to watch (from `DiscoveryConfig`)
   * @param projectDir  - Resolve patterns relative to this directory
   * @param onChange    - Called with a `DiscoveryChangeEvent` on any change
   * @returns `true` if watcher started, `false` if chokidar is unavailable
   *
   * @example
   * const started = await watcher.start(
   *   ['.converge/tasks/**\/*.ts'],
   *   '/my-project',
   *   (event) => rescanner.scanFile(event.file)
   * );
   */
  async start(
    patterns: string[],
    projectDir: string,
    onChange: (event: DiscoveryChangeEvent) => void | Promise<void>,
  ): Promise<boolean> {
    const chokidar = await tryLoadChokidar();

    if (!chokidar) {
      console.warn(
        "\n[DiscoveryWatcher] Watch mode is unavailable — chokidar is not installed.\n" +
          "  To enable watch mode, install it as a dev dependency:\n" +
          "    npm install --save-dev chokidar\n" +
          "    pnpm add -D chokidar\n",
      );
      return false;
    }

    this.watcher = chokidar.watch(patterns, {
      cwd: projectDir,
      ignoreInitial: true, // Don't fire events for files found at startup
      ignored: ["**/node_modules/**", "**/*.d.ts", "**/*.js"],
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 150, // Wait 150ms after last write before firing
        pollInterval: 50,
      },
    });

    const emit = async (type: DiscoveryChangeEvent["type"], file: string) => {
      const event: DiscoveryChangeEvent = {
        type,
        file: file.startsWith("/") ? file : `${projectDir}/${file}`,
        discoveryType: inferDiscoveryType(file),
      };

      // Notify onChange handler
      try {
        await onChange(event);
      } catch (err: any) {
        console.warn(`[DiscoveryWatcher] onChange error: ${err?.message}`);
      }

      // Fire discovery:changed hook
      if (this.hooks) {
        const payload = {
          added: type === "added" ? [event.file] : [],
          removed: type === "removed" ? [event.file] : [],
          modified: type === "modified" ? [event.file] : [],
        };
        await this.hooks.fire("discovery:changed", payload);
      }
    };

    this.watcher.on("add", (file: string) => emit("added", file));
    this.watcher.on("change", (file: string) => emit("modified", file));
    this.watcher.on("unlink", (file: string) => emit("removed", file));

    this.watcher.on("error", (err: any) => {
      console.warn(`[DiscoveryWatcher] Watcher error: ${err?.message}`);
    });

    return true;
  }

  /**
   * Stop watching and release all resources.
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /** Whether the watcher is currently active */
  get active(): boolean {
    return this.watcher !== null;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function inferDiscoveryType(file: string): DiscoveredFileType {
  if (file.includes("/tasks/") || file.endsWith(".task.ts")) return "task";
  if (file.includes("/epics/") || file.endsWith(".epic.ts")) return "epic";
  if (file.includes("/checks/") || file.endsWith(".check.ts")) return "check";
  if (file.includes("/plans/") || file.endsWith(".plan.ts")) return "plan";
  return "task"; // fallback
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

export function createDiscoveryWatcher(hooks?: HookRegistry): DiscoveryWatcher {
  return new DiscoveryWatcher(hooks);
}
