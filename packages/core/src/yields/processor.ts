/**
 * Yields Processor
 *
 * Processes different types of yields configurations:
 * - String references (backward compatibility)
 * - Declarative objects (AI-driven)
 * - Programmatic functions (context-driven or return-driven)
 * - Static templates
 *
 * Updated to support context-driven spawning like loop API.
 */

import type {
  YieldsConfig,
  YieldsDeclarative,
  YieldsFn,
  YieldsStatic,
  YieldsContext,
  YieldsSpawnTarget,
  YieldsSpawnOptions,
} from "./types.ts";
import type { TaskConfig } from "../storage/types.ts";
import type { TaskContext, EpicContext } from "../context/types.ts";
import type { TaskDefinition } from "../config/task-definition.ts";
import type { TaskResult } from "../functions/types.ts";

/* ------------------------------------------------------------------ */
/*  Yields Processor                                                  */
/* ------------------------------------------------------------------ */

export class YieldsProcessor {
  /**
   * Process yields configuration and generate tasks
   */
  async processs(
    config: YieldsConfig,
    ctx: TaskContext | EpicContext,
    result: TaskResult,
  ): Promise<TaskConfig[]> {
    // Determine type of yields config
    if (typeof config === "string") {
      return this.processStringReference(config, ctx, result);
    } else if (typeof config === "function") {
      return this.processProgrammaticFunction(config, ctx, result);
    } else if (this.isDeclarative(config)) {
      return this.processDeclarative(config, ctx, result);
    } else if (this.isStatic(config)) {
      return this.processStatic(config);
    } else {
      throw new Error(`Unknown yields config type: ${typeof config}`);
    }
  }

  /**
   * Process string reference (backward compatible)
   */
  private async processStringReference(
    fnName: string,
    ctx: TaskContext | EpicContext,
    result: TaskResult,
  ): Promise<TaskConfig[]> {
    // In real impl, would look up function by name and execute
    console.log(`[YieldsProcessor] Processing string reference: ${fnName}`);
    return [];
  }

  /**
   * Process programmatic function with context-driven spawn support
   */
  private async processProgrammaticFunction(
    fn: YieldsFn,
    ctx: TaskContext | EpicContext,
    result: TaskResult,
  ): Promise<TaskConfig[]> {
    console.log(`[YieldsProcessor] Processing programmatic function`);

    // Track spawned tasks
    const spawnedTasks: TaskConfig[] = [];

    // Create yields context with spawn capability
    // Cast to any to add spawn method dynamically
    const yieldsCtx = {
      ...ctx,

      // Spawn method - adds task to internal array
      spawn: async (
        target: YieldsSpawnTarget,
        opts?: YieldsSpawnOptions,
      ): Promise<void> => {
        const taskConfig = this.resolveSpawnTarget(target);

        // Apply options
        if (opts?.writeToPath) {
          // Store path in metadata filePath field
          taskConfig.metadata = {
            ...taskConfig.metadata,
            filePath: opts.writeToPath,
          };
        }

        spawnedTasks.push(taskConfig);

        if (opts?.label) {
          console.log(`[YieldsContext] Spawned: ${opts.label}`);
        }
      },

      // Read-only access to spawned tasks
      get spawnedTasks(): ReadonlyArray<TaskConfig> {
        return spawnedTasks;
      },
    } as YieldsContext;

    // Execute yields function
    const returnValue = await fn(yieldsCtx, result);

    // Support both patterns:
    // 1. Context-driven: fn calls ctx.spawn(), returns void → use spawnedTasks
    // 2. Return-driven: fn returns TaskConfig[] → use return value
    if (returnValue && Array.isArray(returnValue)) {
      // Return-driven pattern (backward compatible)
      return returnValue;
    } else {
      // Context-driven pattern (new)
      return spawnedTasks;
    }
  }

  /**
   * Resolve spawn target to TaskConfig
   */
  private resolveSpawnTarget(target: YieldsSpawnTarget): TaskConfig {
    // Handle different target types
    if (typeof target === "function") {
      // Factory function
      const taskDef = target();
      return this.taskDefToConfig(taskDef);
    } else if ("build" in target && typeof target.build === "function") {
      // TaskDefinitionBuilder
      const taskDef = target.build();
      return this.taskDefToConfig(taskDef);
    } else if ("id" in target && "title" in target) {
      // TaskDefinition or TaskConfig
      if ("inputs" in target || "outputs" in target || "vars" in target) {
        // Likely TaskDefinition
        return this.taskDefToConfig(target as TaskDefinition);
      } else {
        // TaskConfig (already in right format)
        return target as TaskConfig;
      }
    } else {
      throw new Error(`Unknown spawn target type: ${typeof target}`);
    }
  }

  /**
   * Convert TaskDefinition to TaskConfig
   */
  private taskDefToConfig(taskDef: TaskDefinition): TaskConfig {
    const now = new Date().toISOString();
    return {
      id: taskDef.id,
      title: taskDef.title || "",
      description: taskDef.description,
      type: "spawned",
      deps: [],
      checks:
        (taskDef.vars?.inlineChecks as any[])?.map((c: any) => c.id) || [],
      inputs: taskDef.inputs,
      outputs: taskDef.outputs,
      vars: taskDef.vars,
      metadata: {
        created: now,
        updated: now,
      },
    };
  }

  /**
   * Process declarative config (AI-driven)
   */
  private async processDeclarative(
    config: YieldsDeclarative,
    ctx: TaskContext | EpicContext,
    result: TaskResult,
  ): Promise<TaskConfig[]> {
    console.log(`[YieldsProcessor] Processing declarative: ${config.plan}`);

    // Check conditional
    if (config.when) {
      const shouldExecute = await config.when(result);
      if (!shouldExecute) {
        console.log("[YieldsProcessor] Condition not met, skipping");
        return [];
      }
    }

    // In real impl, would use LLM to interpret the plan and generate tasks
    // For now, return mock tasks
    const tasks: TaskConfig[] = [];

    // Generate tasks based on plan (mock)
    const count = Math.min(config.maxTasks || 10, 3);

    for (let i = 1; i <= count; i++) {
      const now = new Date().toISOString();
      tasks.push({
        id: `spawned-task-${i}`,
        title: `Spawned Task ${i}`,
        description: `Generated from plan: ${config.plan}`,
        type: config.taskType || "spawned",
        deps: [],
        checks: config.checks,
        metadata: {
          created: now,
          updated: now,
        },
      });
    }

    // Apply max tasks limit
    return tasks.slice(0, config.maxTasks);
  }

  /**
   * Process static template
   */
  private processStatic(config: YieldsStatic): TaskConfig[] {
    console.log(
      `[YieldsProcessor] Processing static template (${config.tasks.length} tasks)`,
    );

    const now = new Date().toISOString();
    return config.tasks.map((partial, index) => ({
      id: partial.id || `static-task-${index}`,
      title: partial.title || `Static Task ${index}`,
      description: partial.description,
      type: partial.type,
      deps: partial.deps || [],
      checks: partial.checks,
      inputs: partial.inputs,
      outputs: partial.outputs,
      metadata: {
        created: partial.metadata?.created || now,
        updated: partial.metadata?.updated || now,
      },
    }));
  }

  /**
   * Type guard for declarative config
   */
  private isDeclarative(config: any): config is YieldsDeclarative {
    return config && typeof config === "object" && "plan" in config;
  }

  /**
   * Type guard for static config
   */
  private isStatic(config: any): config is YieldsStatic {
    return (
      config &&
      typeof config === "object" &&
      "tasks" in config &&
      Array.isArray(config.tasks)
    );
  }
}

/**
 * Create a new yields processor
 */
export function createYieldsProcessor(): YieldsProcessor {
  return new YieldsProcessor();
}
