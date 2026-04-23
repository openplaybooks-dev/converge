/**
 * Goal Evaluator Implementation
 *
 * Evaluates goals by running checks and aggregating results.
 * Supports hierarchical evaluation (goal + sub-goals).
 */

import type {
  Goal,
  GoalStatus,
  GoalEvaluator,
  GoalEvaluationContext,
} from "./types.ts";
import type { Gap, CheckResult } from "../../task/gap/types.ts";
import type { CheckFnMeta } from "../../functions/types.ts";

/* ------------------------------------------------------------------ */
/*  Goal Evaluator Implementation                                     */
/* ------------------------------------------------------------------ */

export class GoalEvaluatorImpl implements GoalEvaluator {
  /**
   * Evaluate a single goal by running its checks
   */
  async evaluate(goal: Goal, ctx: GoalEvaluationContext): Promise<GoalStatus> {
    ctx.log.debug(`Evaluating goal: ${goal.id}`, {
      description: goal.description,
    });

    // Run all checks for this goal
    const checkResults: CheckResult[] = [];
    const gaps: Gap[] = [];

    for (const check of goal.checks) {
      try {
        // Execute check function
        const result = await this.executeCheck(check, ctx);
        checkResults.push(result);

        // Collect gaps from failed checks
        if (!result.passed) {
          gaps.push(...result.gaps);
        }
      } catch (error) {
        ctx.log.error(`Check failed: ${check.name}`, { error });

        // Create a gap for check execution failure
        const failureGap: Gap = {
          id: `check-failure-${check.name}`,
          type: "quality",
          level: "epic", // Goals are typically epic-level
          scope: goal.id,
          description: `Check "${check.name}" failed to execute: ${error}`,
          detected: new Date().toISOString(),
          resolved: false,
          checks: [check.name],
        };

        gaps.push(failureGap);
        checkResults.push({
          check: check.name,
          passed: false,
          gaps: [failureGap],
          message: `Check execution failed: ${error}`,
        });
      }
    }

    // Calculate satisfaction: all checks pass = satisfied
    const satisfied = checkResults.every((r) => r.passed);

    // Calculate progress: (passed checks / total checks)
    const progress =
      goal.checks.length > 0
        ? checkResults.filter((r) => r.passed).length / goal.checks.length
        : 1.0;

    const status: GoalStatus = {
      goalId: goal.id,
      description: goal.description,
      satisfied,
      progress,
      gaps,
      checkResults,
      timestamp: new Date().toISOString(),
    };

    ctx.log.info(
      satisfied
        ? `✅ Goal satisfied: ${goal.id}`
        : `❌ Goal unsatisfied: ${goal.id}`,
      { progress, gapsCount: gaps.length },
    );

    return status;
  }

  /**
   * Evaluate goal hierarchy (goal + all sub-goals recursively)
   */
  async evaluateHierarchy(
    goal: Goal,
    ctx: GoalEvaluationContext,
  ): Promise<GoalStatus> {
    ctx.log.debug(`Evaluating goal hierarchy: ${goal.id}`);

    // Evaluate this goal
    const status = await this.evaluate(goal, ctx);

    // If goal has sub-goals, evaluate them recursively
    if (goal.goals && goal.goals.length > 0) {
      const subgoalStatuses: GoalStatus[] = [];

      for (const subgoal of goal.goals) {
        const subgoalStatus = await this.evaluateHierarchy(subgoal, ctx);
        subgoalStatuses.push(subgoalStatus);
      }

      status.subgoals = subgoalStatuses;

      // Parent goal is satisfied only if:
      // 1. Its own checks pass
      // 2. ALL sub-goals are satisfied
      const allSubgoalsSatisfied = subgoalStatuses.every((s) => s.satisfied);
      status.satisfied = status.satisfied && allSubgoalsSatisfied;

      // Recalculate progress including sub-goals
      // Progress = (this goal progress + average sub-goal progress) / 2
      const avgSubgoalProgress =
        subgoalStatuses.reduce((sum, s) => sum + s.progress, 0) /
        subgoalStatuses.length;
      status.progress = (status.progress + avgSubgoalProgress) / 2;

      // Aggregate gaps from sub-goals
      const subgoalGaps = subgoalStatuses.flatMap((s) => s.gaps);
      status.gaps = [...status.gaps, ...subgoalGaps];
    }

    return status;
  }

  /**
   * Check if goal is satisfied (all checks pass)
   */
  async isSatisfied(goal: Goal, ctx: GoalEvaluationContext): Promise<boolean> {
    const status = await this.evaluate(goal, ctx);
    return status.satisfied;
  }

  /**
   * Execute a single check function
   */
  private async executeCheck(
    check: CheckFnMeta,
    ctx: GoalEvaluationContext,
  ): Promise<CheckResult> {
    // Map GoalEvaluationContext to a context the check function can use
    const checkCtx = {
      projectDir: ctx.projectDir,
      convergeDir: ctx.convergeDir,
      vars: ctx.vars,
      fs: ctx.fs,
      log: ctx.log,
    };

    const result = await check.fn(checkCtx as any);
    return result;
  }
}

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                  */
/* ------------------------------------------------------------------ */

/**
 * Extract tasks from unsatisfied goals
 */
export function extractTasksFromUnsatisfiedGoals(
  goalStatuses: GoalStatus[],
): any[] {
  const tasks: any[] = [];

  for (const status of goalStatuses) {
    if (!status.satisfied) {
      // Goal has tasks defined - extract them
      // Note: Tasks are stored in the Goal definition, not in GoalStatus
      // This is a placeholder - actual implementation needs access to Goal objects
      // TODO: Pass Goal objects along with GoalStatus in convergence loop
    }

    // Recursively extract tasks from unsatisfied sub-goals
    if (status.subgoals) {
      tasks.push(...extractTasksFromUnsatisfiedGoals(status.subgoals));
    }
  }

  return tasks;
}

/**
 * Extract all goals from a goal hierarchy (flattened)
 */
export function flattenGoalHierarchy(goal: Goal): Goal[] {
  const goals: Goal[] = [goal];

  if (goal.goals && goal.goals.length > 0) {
    for (const subgoal of goal.goals) {
      goals.push(...flattenGoalHierarchy(subgoal));
    }
  }

  return goals;
}

/**
 * Count total goals in hierarchy
 */
export function countGoals(goal: Goal): number {
  let count = 1;

  if (goal.goals && goal.goals.length > 0) {
    for (const subgoal of goal.goals) {
      count += countGoals(subgoal);
    }
  }

  return count;
}

/**
 * Find a goal by ID in hierarchy
 */
export function findGoalById(goal: Goal, goalId: string): Goal | undefined {
  if (goal.id === goalId) {
    return goal;
  }

  if (goal.goals && goal.goals.length > 0) {
    for (const subgoal of goal.goals) {
      const found = findGoalById(subgoal, goalId);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}
