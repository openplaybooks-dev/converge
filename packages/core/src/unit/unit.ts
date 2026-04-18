/**
 * Universal Unit - Data-Driven Convergence Loop
 *
 * ONE class handles ALL levels (Project/Epic/Task/Subtask/...).
 * Unit EXTENDS TaskDefinition - inherits all task properties.
 *
 * Principles:
 * - Every unit extends TaskDefinition (id, title, inputs, outputs, vars, tags)
 * - Parent reference for nested context
 * - Children discovered dynamically from folder structure
 * - Convergence loop: while (hasGaps) { fixGaps }
 * - Leaf nodes use AI (GapFixer), parents delegate to children
 */

import type {
  TaskDefinition,
  LoopFn,
  ExecutorFn,
  ConvergeConfig,
  WbsFn,
  PlanConfig,
  CheckEntry,
  TaskContext as CallbackContext,
  Check,
} from "../config/task-definition.ts";
import type { TaskContext } from "./task-context.ts";
import type { UnitConfig } from "./types.ts";

// Delegated implementations
import { run as runImpl } from "./run.ts";
import {
  resolveChecks as resolveChecksImpl,
  resolvePrompt as resolvePromptImpl,
  resolveAgent as resolveAgentImpl,
  resolveSkill as resolveSkillImpl,
} from "./resolve.ts";
import { getProjectRoot as getProjectRootImpl } from "./helpers.ts";
import { fromPath as fromPathImpl } from "./factories.ts";
import { createTaskContext } from "./task-context.ts";

/* ------------------------------------------------------------------ */
/*  Universal Unit Class                                              */
/* ------------------------------------------------------------------ */

/**
 * Universal Unit class - handles ALL levels (Project/Epic/Task/Subtask/...).
 * Extends TaskDefinition to inherit all task properties (id, title, inputs, outputs, vars, tags).
 */
export class Unit implements TaskDefinition {
  // TaskDefinition properties (inherited)
  id: string;
  title?: string;
  description?: string;
  inputs?: string[];
  outputs?: string[];
  vars?: Record<string, unknown>;
  tags?: string[];
  blocking?: boolean;
  dependencies?: string[];

  // Sorting index extracted from folder name (e.g., "03-implement-app" -> [3], "003-001-asset" -> [3, 1])
  sortIndex: number[];

  // First-class configuration properties
  prompt?: string | ((ctx: CallbackContext) => string | Promise<string>);
  agent?: string;
  skill?: string | string[];
  checks?:
    | CheckEntry[]
    | ((ctx: CallbackContext) => CheckEntry[] | Promise<CheckEntry[]>);

  // Unit-specific properties
  parent: Unit | null;
  path: string;
  config: UnitConfig;
  children?: Unit[];
  planConfig?: PlanConfig;
  wbsFn?: WbsFn;
  loopFn?: LoopFn;
  executorFn?: ExecutorFn;
  convergeConfig?: ConvergeConfig;

  // Backlog scan definitions
  backlogs?: import("../scan/types.ts").BacklogDef[];

  // Execution modifiers
  isAsync?: boolean;
  backgroundConfig?: import("../process/types.ts").BackgroundConfig;
  scheduleConfig?: import("../schedule/types.ts").ScheduleConfig;
  sidecarHooks?: import("../sidecar/types.ts").SidecarHooks;

  // Task context with parent chain (enables native tree traversal)
  context?: TaskContext;

  constructor(config: {
    parent: Unit | null;
    path: string;
    taskDef: TaskDefinition;
    config: UnitConfig;
  }) {
    // Copy TaskDefinition properties
    this.id = config.taskDef.id;
    this.title = config.taskDef.title;
    this.description = config.taskDef.description;
    this.inputs = config.taskDef.inputs;
    this.outputs = config.taskDef.outputs;
    this.vars = config.taskDef.vars;
    this.tags = config.taskDef.tags;
    this.blocking = config.taskDef.blocking;
    this.dependencies = config.taskDef.dependencies;

    // Extract sort index from path (e.g., "03-app" -> [3], "003-001-asset" -> [3, 1])
    this.sortIndex = Unit.extractSortIndex(config.path);

    // Copy first-class configuration properties
    this.prompt = config.taskDef.prompt;
    this.agent = config.taskDef.agent;
    this.skill = config.taskDef.skill;
    this.checks = config.taskDef.checks;

    // Unit-specific properties
    this.parent = config.parent;
    this.path = config.path;
    this.config = config.config;
    this.planConfig = config.taskDef.planConfig;
    this.wbsFn = config.taskDef.wbsFn;
    this.loopFn = config.taskDef.loopFn;
    this.executorFn = config.taskDef.executorFn;
    this.convergeConfig = config.taskDef.convergeConfig;
    this.backlogs = config.taskDef.backlogs;

    // Copy execution modifiers
    this.isAsync = config.taskDef.isAsync;
    this.backgroundConfig = config.taskDef.backgroundConfig;
    this.scheduleConfig = config.taskDef.scheduleConfig;
    this.sidecarHooks = config.taskDef.sidecarHooks;

    // Create task context with parent chain
    // This enables native tree traversal via ctx.parent.parent...
    try {
      const parentContext = config.parent?.context;
      this.context = createTaskContext(config.path, parentContext);
    } catch (err) {
      // If path doesn't match expected format (e.g., virtual paths), skip context
      // Virtual tasks don't need context for ancestor propagation
      this.context = undefined;
    }
  }

  /* ── Delegated methods ─────────────────────────────────────────── */

  /**
   * Universal run method - same for all levels.
   * Convergence loop: while (hasGaps) { fixGaps }
   */
  async run(): Promise<boolean> {
    return runImpl(this);
  }

  /**
   * Resolve checks (supports callbacks and backward compat).
   */
  async resolveChecks(): Promise<Check[]> {
    return resolveChecksImpl(this);
  }

  /**
   * Resolve prompt (supports callbacks and backward compat).
   */
  async resolvePrompt(): Promise<string | undefined> {
    return resolvePromptImpl(this);
  }

  /**
   * Resolve agent (backward compat with vars).
   */
  resolveAgent(): string | undefined {
    return resolveAgentImpl(this);
  }

  /**
   * Resolve skill (backward compat with vars).
   */
  resolveSkill(): string | string[] | undefined {
    return resolveSkillImpl(this);
  }

  /**
   * Get project root directory (workspace root).
   * Public so TaskExecutor can call it for virtual child Units.
   */
  getProjectRoot(): string {
    return getProjectRootImpl(this);
  }

  /**
   * Walk ancestor contexts (native tree traversal).
   * Yields parent contexts starting from immediate parent up to root.
   *
   * Example:
   *   for (const ancestorCtx of unit.walkAncestorContexts()) {
   *     console.log(ancestorCtx.taskId);
   *   }
   */
  *walkAncestorContexts(): Generator<TaskContext> {
    let current = this.context?.parent;
    while (current) {
      yield current;
      current = current.parent;
    }
  }

  /* ── Static factory methods ────────────────────────────────────── */

  /** @deprecated Use fromPath() instead */
  static async fromSkillMd(skillMdPath: string, parent?: Unit): Promise<Unit> {
    return fromPathImpl(skillMdPath, parent);
  }

  /**
   * Factory: Create a Unit from an in-memory TaskDefinition (no file I/O).
   */
  static fromDefinition(
    taskDef: TaskDefinition,
    parent: Unit,
    virtualPath?: string,
  ): Unit {
    return new Unit({
      parent,
      path: virtualPath ?? `<virtual:${taskDef.id}>`,
      taskDef,
      config: {
        maxIterations: (taskDef.vars?.maxIterations as number) || 100,
      },
    });
  }

  /**
   * Factory: Load unit from TypeScript task file path.
   */
  static async fromPath(taskFilePath: string, parent?: Unit): Promise<Unit> {
    return fromPathImpl(taskFilePath, parent);
  }

  /**
   * Extract sort index from path, including parent directory prefixes.
   *
   * Examples:
   *   "01-prepare-requirements/001-gather-idea" -> [1, 1]
   *   "02-prepare-designs/002-generate-design" -> [2, 2]
   *   "03-implement-app/001-implement-design" -> [3, 1]
   *   "02-prepare-designs/002-prompts/002-001-home" -> [2, 2, 1]
   *
   * This ensures tasks are sorted first by epic prefix, then by task prefix.
   */
  static extractSortIndex(filePath: string): number[] {
    const parts = filePath.split(/[/\\]/);
    const indices: number[] = [];

    // Extract numeric prefix from each path segment
    for (const part of parts) {
      // Match compound pattern like "003-001-" before single prefix
      const doubleMatch = part.match(/^(\d+)-(\d+)-/);
      if (doubleMatch) {
        indices.push(parseInt(doubleMatch[1], 10));
        indices.push(parseInt(doubleMatch[2], 10));
      } else {
        // Match single prefix like "01-", "002-"
        const match = part.match(/^(\d+)(-|$)/);
        if (match) {
          indices.push(parseInt(match[1], 10));
        }
      }
    }

    // If no indices found, use 999 as default (sorts to end)
    return indices.length > 0 ? indices : [999];
  }

  /**
   * Compare two units by sort index
   */
  static compareBySortIndex(a: Unit, b: Unit): number {
    for (let i = 0; i < Math.max(a.sortIndex.length, b.sortIndex.length); i++) {
      const aVal = a.sortIndex[i] || 0;
      const bVal = b.sortIndex[i] || 0;
      if (aVal !== bVal) return aVal - bVal;
    }
    return 0;
  }
}
