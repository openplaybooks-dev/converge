/**
 * Yields Types - Context-Driven Spawning API
 *
 * Defines types for the yields system that supports both:
 * 1. Context-driven pattern: ctx.spawn() (recommended, like loop API)
 * 2. Return-driven pattern: return TaskConfig[] (backward compatible)
 */

import type { TaskConfig } from "../storage/types.ts";
import type { TaskContext, EpicContext } from "../context/types.ts";
import type { TaskDefinition } from "../config/task-definition.ts";
import type { TaskResult } from "../functions/types.ts";

/* ------------------------------------------------------------------ */
/*  Spawn Target Types                                                */
/* ------------------------------------------------------------------ */

/**
 * Valid spawn targets for ctx.spawn()
 * Supports multiple input formats for flexibility
 */
export type YieldsSpawnTarget =
  | TaskConfig // Plain config object
  | TaskDefinition // Built task definition
  | TaskDefinitionBuilder // Builder (will be built automatically)
  | (() => TaskDefinition); // Factory function

/**
 * Task definition builder interface (minimal)
 * Full interface defined in config/task-definition.ts
 */
interface TaskDefinitionBuilder {
  build(): TaskDefinition;
}

/* ------------------------------------------------------------------ */
/*  Spawn Options                                                     */
/* ------------------------------------------------------------------ */

/**
 * Options for spawning tasks in yields context
 */
export interface YieldsSpawnOptions {
  /** Optional label for logging */
  label?: string;

  /** Write task to disk at this path (for discovery) */
  writeToPath?: string;

  /** Target epic for task placement */
  target?: "current-epic" | "next-epic";
}

/* ------------------------------------------------------------------ */
/*  Yields Context                                                    */
/* ------------------------------------------------------------------ */

/**
 * Context provided to yields functions
 * Enhanced with spawn() method like loop context
 */
export interface YieldsContext extends TaskContext {
  /**
   * Spawn a child task
   * Like ctx.loop.spawn() but for yields context
   */
  spawn(target: YieldsSpawnTarget, opts?: YieldsSpawnOptions): Promise<void>;

  /**
   * Spawned tasks (read-only)
   * Useful for inspecting what was spawned
   */
  readonly spawnedTasks: ReadonlyArray<TaskConfig>;
}

/* ------------------------------------------------------------------ */
/*  Yields Function Signature                                         */
/* ------------------------------------------------------------------ */

/**
 * Yields function signature
 * Now supports both return-driven and context-driven patterns
 *
 * Context-driven (recommended):
 * ```ts
 * .yields(async (ctx) => {
 *   await ctx.spawn({ id: 'task-1', title: 'Task 1' });
 *   await ctx.spawn({ id: 'task-2', title: 'Task 2' });
 * })
 * ```
 *
 * Return-driven (backward compatible):
 * ```ts
 * .yields(async (ctx, result) => {
 *   return [
 *     { id: 'task-1', title: 'Task 1' },
 *     { id: 'task-2', title: 'Task 2' },
 *   ];
 * })
 * ```
 */
export type YieldsFn = (
  ctx: YieldsContext,
  result?: TaskResult,
) => Promise<TaskConfig[] | void> | TaskConfig[] | void;

/* ------------------------------------------------------------------ */
/*  Declarative Yields Config                                         */
/* ------------------------------------------------------------------ */

/**
 * Declarative yields configuration
 */
export interface YieldsDeclarative {
  /** Natural language plan describing what to yield */
  plan: string;

  /** Directory where generated task files are written */
  outputDir?: string;

  /** Path of the task template file to instantiate */
  template?: string;

  /** Conditional execution predicate */
  when?: (result: TaskResult) => boolean | Promise<boolean>;

  /** Maximum tasks to spawn */
  maxTasks?: number;

  /** Where to spawn tasks */
  target?: "current-epic" | "next-epic" | "new-epic";

  /** Default task type for spawned tasks */
  taskType?: string;

  /** Default checks for spawned tasks */
  checks?: string[];

  /** Approval mode */
  approval?: "immediate" | "review";
}

/* ------------------------------------------------------------------ */
/*  Static Yields Config                                              */
/* ------------------------------------------------------------------ */

/**
 * Static template yields
 */
export interface YieldsStatic {
  tasks: Array<Partial<TaskConfig>>;
}

/* ------------------------------------------------------------------ */
/*  Union Type                                                        */
/* ------------------------------------------------------------------ */

/**
 * Union type for yields configuration
 */
export type YieldsConfig = string | YieldsDeclarative | YieldsFn | YieldsStatic;
