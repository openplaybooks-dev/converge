/**
 * Goal Manager Implementation
 *
 * Provides goal-centric operations for the runtime.
 */

import type { GoalManager } from "./types.ts";
import type {
  Goal,
  GoalStatus,
  GoalHierarchy,
  GoalNode,
  GoalConvergenceConfig,
  GoalEvaluationContext,
} from "../task/goal/types.ts";
import type { EpicDefinition } from "../task/checks/types.ts";
import { GoalEvaluatorImpl, findGoalById } from "../task/goal/evaluator.ts";

/* ------------------------------------------------------------------ */
/*  Goal Manager Implementation                                       */
/* ------------------------------------------------------------------ */

export class GoalManagerImpl implements GoalManager {
  private epics: EpicDefinition[];
  private ctx: GoalEvaluationContext;
  private evaluator: GoalEvaluatorImpl;

  constructor(epics: EpicDefinition[], ctx: GoalEvaluationContext) {
    this.epics = epics;
    this.ctx = ctx;
    this.evaluator = new GoalEvaluatorImpl();
  }

  /**
   * List all goals in hierarchical view
   */
  list(): GoalHierarchy {
    const hierarchy: GoalHierarchy = {};

    for (const epic of this.epics) {
      hierarchy[epic.id] = epic.goals.map((goal) => this.toGoalNode(goal));
    }

    return hierarchy;
  }

  /**
   * Evaluate a specific goal
   */
  async evaluate(goalId: string): Promise<GoalStatus> {
    const goal = this.findGoal(goalId);

    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    return this.evaluator.evaluateHierarchy(goal, this.ctx);
  }

  /**
   * Satisfy a specific goal (run convergence for that goal)
   */
  async satisfy(
    goalId: string,
    config?: Partial<GoalConvergenceConfig>,
  ): Promise<GoalStatus> {
    const goal = this.findGoal(goalId);

    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // Run convergence loop for this goal
    const maxIterations = config?.maxIterations ?? 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      // Evaluate goal
      const status = await this.evaluator.evaluateHierarchy(goal, this.ctx);

      // Check if satisfied
      if (status.satisfied) {
        config?.onGoalSatisfied?.(goal, status);
        return status;
      }

      // Execute tasks for this goal
      if (goal.tasks && goal.tasks.length > 0) {
        this.ctx.log.info(`Executing tasks for goal: ${goalId}`, {
          tasksCount: goal.tasks.length,
        });

        // TODO: Actual task execution
        // For now, just log
        for (const task of goal.tasks) {
          this.ctx.log.debug(`Task: ${task.id}`, { title: task.title });
        }
      }

      // If goal has sub-goals, recurse
      if (goal.goals && goal.goals.length > 0) {
        for (const subgoal of goal.goals) {
          await this.satisfy(subgoal.id, config);
        }
      }

      iteration++;
    }

    // Return final status
    return this.evaluator.evaluateHierarchy(goal, this.ctx);
  }

  /**
   * Get goal by ID
   */
  get(goalId: string): Goal | undefined {
    return this.findGoal(goalId);
  }

  /**
   * Convert Goal to GoalNode for hierarchy view
   */
  private toGoalNode(goal: Goal): GoalNode {
    const node: GoalNode = {
      id: goal.id,
      description: goal.description,
      satisfied: false, // Default, will be updated by evaluation
      progress: 0,
    };

    if (goal.goals && goal.goals.length > 0) {
      node.children = goal.goals.map((g) => this.toGoalNode(g));
    }

    return node;
  }

  /**
   * Find a goal by ID across all epics
   */
  private findGoal(goalId: string): Goal | undefined {
    for (const epic of this.epics) {
      for (const goal of epic.goals) {
        const found = findGoalById(goal, goalId);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }
}
