/**
 * Converge Client
 *
 * SDK for external WBS scripts to interact with the converge framework.
 * Reads context from environment variables and provides methods for
 * spawning tasks, reading files, and executing commands.
 *
 * Usage from a WBS script:
 * ```javascript
 * const { createClient } = require('@converge/core/client');
 * const client = createClient();
 *
 * const screens = JSON.parse(client.readFile('.stitch/screens.json'));
 * for (const screen of screens) {
 *   client.spawn({
 *     id: `screen-${screen.id}`,
 *     title: screen.title,
 *     skills: ['stitch-generate'],
 *   });
 * }
 * // Tasks are auto-flushed to stdout on process exit
 * ```
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { globSync } from 'glob';
import type { ConvergeClientContext, SpawnedTask } from './types.ts';

export class ConvergeClient {
  private context: ConvergeClientContext;
  private tasks: SpawnedTask[] = [];
  private flushed = false;

  constructor() {
    this.context = this.readContext();

    // Auto-flush tasks to stdout on process exit
    process.on('beforeExit', () => {
      this.flush();
    });
  }

  /**
   * Get the converge context (project dir, vars, etc.)
   */
  getContext(): Readonly<ConvergeClientContext> {
    return this.context;
  }

  /**
   * Get the absolute project directory path.
   */
  get projectDir(): string {
    return this.context.projectDir;
  }

  /**
   * Get parent task variables.
   */
  get vars(): Readonly<Record<string, unknown>> {
    return this.context.vars;
  }

  /**
   * Register a task to be spawned.
   * Tasks are collected and flushed to stdout as a JSON array on exit.
   */
  spawn(task: SpawnedTask): void {
    if (!task.id) {
      throw new Error('SpawnedTask requires an id');
    }
    this.tasks.push(task);
  }

  /**
   * Flush all spawned tasks to stdout as a JSON array.
   * Called automatically on process beforeExit, but can be called manually.
   * Only flushes once.
   */
  flush(): void {
    if (this.flushed) return;
    this.flushed = true;

    if (this.tasks.length > 0) {
      console.log(JSON.stringify(this.tasks, null, 2));
    }
  }

  /**
   * Read a file relative to the project root.
   * Returns the file contents as a string.
   */
  readFile(relativePath: string): string {
    const absPath = resolve(this.context.projectDir, relativePath);
    return readFileSync(absPath, 'utf-8');
  }

  /**
   * Check if a file exists relative to the project root.
   */
  fileExists(relativePath: string): boolean {
    const absPath = resolve(this.context.projectDir, relativePath);
    return existsSync(absPath);
  }

  /**
   * Glob match files relative to the project root.
   * Returns an array of relative file paths.
   */
  glob(pattern: string): string[] {
    return globSync(pattern, {
      cwd: this.context.projectDir,
    });
  }

  /**
   * Execute a shell command in the project directory.
   * Returns stdout as a string.
   */
  exec(cmd: string): string {
    return execSync(cmd, {
      cwd: this.context.projectDir,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,  // 10MB
    });
  }

  /**
   * Log a message with the [WBS] prefix (filtered out by the script executor).
   */
  log(msg: string): void {
    console.log(`[WBS] ${msg}`);
  }

  /**
   * Read context from environment variables.
   */
  private readContext(): ConvergeClientContext {
    // Try CONVERGE_CONTEXT_JSON first (comprehensive context)
    const contextJson = process.env.CONVERGE_CONTEXT_JSON;
    if (contextJson) {
      try {
        const parsed = JSON.parse(contextJson) as Record<string, unknown>;
        return {
          projectDir: String(parsed.projectDir ?? process.cwd()),
          epicId: parsed.epicId ? String(parsed.epicId) : undefined,
          taskId: parsed.taskId ? String(parsed.taskId) : undefined,
          vars: (parsed.vars as Record<string, unknown>) ?? {},
        };
      } catch {
        // Fall through to individual env vars
      }
    }

    // Fall back to individual CONVERGE_VAR_* env vars
    const vars: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('CONVERGE_VAR_') && value !== undefined) {
        const varName = key.slice('CONVERGE_VAR_'.length).toLowerCase();
        vars[varName] = value;
      }
    }

    return {
      projectDir: process.env.CONVERGE_PROJECT_DIR ?? process.cwd(),
      epicId: process.env.CONVERGE_EPIC_ID,
      taskId: process.env.CONVERGE_TASK_ID,
      vars,
    };
  }
}
