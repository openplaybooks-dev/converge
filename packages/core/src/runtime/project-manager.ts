/**
 * Project Manager Implementation
 */

import type { ProjectManager } from "./types.ts";
import type { GoalStatus, GoalEvaluationContext } from "../goal/types.ts";
import type { ProjectConfig } from "../storage/types.ts";
import type { EpicDefinition } from "../functions/types.ts";
import { GoalEvaluatorImpl } from "../goal/evaluator.ts";

export class ProjectManagerImpl implements ProjectManager {
  private config: ProjectConfig;
  private epics: EpicDefinition[];
  private ctx: GoalEvaluationContext;
  private evaluator: GoalEvaluatorImpl;

  constructor(
    config: ProjectConfig,
    epics: EpicDefinition[],
    ctx: GoalEvaluationContext,
  ) {
    this.config = config;
    this.epics = epics;
    this.ctx = ctx;
    this.evaluator = new GoalEvaluatorImpl();
  }

  /**
   * Get project status
   */
  status(): {
    goalsSatisfied: number;
    totalGoals: number;
    converged: boolean;
    goalStatuses: GoalStatus[];
  } {
    // Synchronous version - would need async for full evaluation
    // For now, return placeholder
    const totalGoals = this.countTotalGoals();

    return {
      goalsSatisfied: 0,
      totalGoals,
      converged: false,
      goalStatuses: [],
    };
  }

  /**
   * Get project name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get project goals (high-level)
   */
  getGoals(): string[] {
    return [...this.config.goals];
  }

  /**
   * Count total goals across all epics
   */
  private countTotalGoals(): number {
    let count = 0;

    for (const epic of this.epics) {
      count += this.countGoalsInEpic(epic);
    }

    return count;
  }

  /**
   * Count goals in an epic (including sub-goals)
   */
  private countGoalsInEpic(epic: EpicDefinition): number {
    let count = 0;

    for (const goal of epic.goals) {
      count += this.countGoalsRecursive(goal);
    }

    return count;
  }

  /**
   * Recursively count goals
   */
  private countGoalsRecursive(goal: import("../goal/types.ts").Goal): number {
    let count = 1; // This goal

    if (goal.goals) {
      for (const subgoal of goal.goals) {
        count += this.countGoalsRecursive(subgoal);
      }
    }

    return count;
  }
}
