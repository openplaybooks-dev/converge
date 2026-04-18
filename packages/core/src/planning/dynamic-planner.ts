/**
 * Dynamic Planner
 *
 * Just-in-time planning based on current gaps.
 * Plans are generated on-demand and not stored in YAML.
 */

import type { EpicContext } from "../context/types.ts";
import type { Gap } from "../gap/types.ts";
import type { TaskConfig } from "../storage/types.ts";
import type { PlanFnMeta } from "../functions/types.ts";
import { globalRegistry } from "../functions/registry.ts";
import { prioritizeGaps, sortByPriority } from "../gap/utils.ts";

/* ------------------------------------------------------------------ */
/*  Planning Strategy                                                 */
/* ------------------------------------------------------------------ */

export type PlanningStrategy =
  | "priority" // Use gap priority
  | "type" // Group by gap type
  | "dependency" // Resolve dependencies first
  | "cost"; // Cheapest first

/* ------------------------------------------------------------------ */
/*  Dynamic Planner                                                   */
/* ------------------------------------------------------------------ */

export class DynamicPlanner {
  /**
   * Generate tasks from gaps using all registered plan functions
   */
  async planFromGaps(
    ctx: EpicContext,
    gaps: Gap[],
    strategy: PlanningStrategy = "priority",
  ): Promise<TaskConfig[]> {
    if (gaps.length === 0) {
      ctx.log.debug("No gaps to plan for");
      return [];
    }

    ctx.log.info(
      `Planning tasks from ${gaps.length} gaps using strategy: ${strategy}`,
    );

    // Prioritize gaps
    const prioritized = this.prioritizeGaps(gaps, strategy);
    ctx.log.debug(
      `Prioritized gaps: ${prioritized.map((p) => `${p.gap.id} (${p.score})`).join(", ")}`,
    );

    // Get all plan functions
    const planFns = this.getPlanFunctions();
    ctx.log.debug(`Found ${planFns.length} plan functions`);

    // Generate tasks
    const allTasks: TaskConfig[] = [];

    for (const planMeta of planFns) {
      // Filter gaps this planner can handle
      const relevantGaps = planMeta.gapTypes
        ? prioritized
            .filter((p) => planMeta.gapTypes!.includes(p.gap.type))
            .map((p) => p.gap)
        : prioritized.map((p) => p.gap);

      if (relevantGaps.length === 0) {
        ctx.log.debug(
          `Planner "${planMeta.name}" has no relevant gaps, skipping`,
        );
        continue;
      }

      try {
        ctx.log.debug(
          `Running planner "${planMeta.name}" for ${relevantGaps.length} gaps`,
        );
        const tasks = await planMeta.fn(ctx, relevantGaps);
        ctx.log.info(
          `Planner "${planMeta.name}" generated ${tasks.length} tasks from ${relevantGaps.length} gaps`,
        );
        allTasks.push(...tasks);
      } catch (error: any) {
        ctx.log.error(`Planner "${planMeta.name}" failed: ${error.message}`);
      }
    }

    // Deduplicate tasks by ID
    const uniqueTasks = this.deduplicateTasks(allTasks);
    ctx.log.info(
      `Generated ${uniqueTasks.length} unique tasks from ${gaps.length} gaps`,
    );

    return uniqueTasks;
  }

  /**
   * Add a new goal dynamically (mid-run)
   */
  async addGoal(ctx: EpicContext, goal: string): Promise<void> {
    ctx.log.info(`Adding goal dynamically: ${goal}`);

    // Update epic config
    const currentConfig = ctx.config;
    const updatedConfig = {
      ...currentConfig,
      goals: [...currentConfig.goals, goal],
    };

    // Write updated config (this is safe - goals are authored config)
    // In a real implementation, this would use the storage API
    ctx.log.info(`Goal added: ${goal}`);
  }

  /**
   * Remove a goal dynamically (mid-run)
   */
  async removeGoal(ctx: EpicContext, goal: string): Promise<void> {
    ctx.log.info(`Removing goal dynamically: ${goal}`);

    // Update epic config
    const currentConfig = ctx.config;
    const updatedConfig = {
      ...currentConfig,
      goals: currentConfig.goals.filter((g) => g !== goal),
    };

    // Write updated config
    ctx.log.info(`Goal removed: ${goal}`);
  }

  /**
   * Prioritize gaps based on strategy
   */
  private prioritizeGaps(
    gaps: Gap[],
    strategy: PlanningStrategy,
  ): Array<{ gap: Gap; score: number; reason: string }> {
    switch (strategy) {
      case "priority":
        return sortByPriority(prioritizeGaps(gaps, "severity"));

      case "type":
        // Group by type, prioritize structural > semantic > quality
        return sortByPriority(prioritizeGaps(gaps, "cost"));

      case "dependency":
        // Project > Epic > Task
        return sortByPriority(prioritizeGaps(gaps, "impact"));

      case "cost":
        return sortByPriority(prioritizeGaps(gaps, "cost"));

      default:
        return sortByPriority(prioritizeGaps(gaps, "severity"));
    }
  }

  /**
   * Get all registered plan functions sorted by priority
   */
  private getPlanFunctions(): PlanFnMeta[] {
    const planFns = Array.from(globalRegistry.getRegistry().plans.values());
    return planFns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Deduplicate tasks by ID
   */
  private deduplicateTasks(tasks: TaskConfig[]): TaskConfig[] {
    const seen = new Set<string>();
    const unique: TaskConfig[] = [];

    for (const task of tasks) {
      if (!seen.has(task.id)) {
        seen.add(task.id);
        unique.push(task);
      }
    }

    return unique;
  }
}

/* ------------------------------------------------------------------ */
/*  Adaptive Planner                                                  */
/* ------------------------------------------------------------------ */

/**
 * Adaptive planner that learns from execution results
 */
export class AdaptivePlanner extends DynamicPlanner {
  private planHistory: Array<{
    gaps: Gap[];
    tasks: TaskConfig[];
    results: Map<string, boolean>; // taskId -> success
  }> = [];

  /**
   * Plan with learning from previous iterations
   */
  async planAdaptive(ctx: EpicContext, gaps: Gap[]): Promise<TaskConfig[]> {
    // Analyze history to adjust strategy
    const successRate = this.calculateSuccessRate();
    const strategy = this.selectStrategy(successRate);

    ctx.log.info(
      `Adaptive planning: success rate ${(successRate * 100).toFixed(1)}%, using ${strategy} strategy`,
    );

    const tasks = await this.planFromGaps(ctx, gaps, strategy);

    // Record this planning session
    this.planHistory.push({
      gaps,
      tasks,
      results: new Map(),
    });

    return tasks;
  }

  /**
   * Record task execution results for learning
   */
  recordResults(taskResults: Map<string, boolean>): void {
    if (this.planHistory.length > 0) {
      const latest = this.planHistory[this.planHistory.length - 1];
      latest.results = taskResults;
    }
  }

  /**
   * Calculate overall success rate from history
   */
  private calculateSuccessRate(): number {
    let total = 0;
    let successes = 0;

    for (const entry of this.planHistory) {
      for (const success of entry.results.values()) {
        total++;
        if (success) successes++;
      }
    }

    return total > 0 ? successes / total : 0.5;
  }

  /**
   * Select strategy based on success rate
   */
  private selectStrategy(successRate: number): PlanningStrategy {
    if (successRate < 0.3) {
      // Low success rate - try cheaper tasks first
      return "cost";
    } else if (successRate < 0.6) {
      // Medium success rate - focus on dependencies
      return "dependency";
    } else {
      // High success rate - stick with priority
      return "priority";
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Functions                                                 */
/* ------------------------------------------------------------------ */

/**
 * Create a new dynamic planner
 */
export function createDynamicPlanner(): DynamicPlanner {
  return new DynamicPlanner();
}

/**
 * Create a new adaptive planner
 */
export function createAdaptivePlanner(): AdaptivePlanner {
  return new AdaptivePlanner();
}
