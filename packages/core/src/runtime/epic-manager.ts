/**
 * Epic Manager Implementation
 */

import type { EpicManager } from './types.ts';
import type { GoalStatus, GoalEvaluationContext } from '../goal/types.ts';
import type { EpicDefinition } from '../functions/types.ts';
import type { ConvergenceConfig } from '../orchestrator/convergence.ts';
import { GoalEvaluatorImpl } from '../goal/evaluator.ts';

export class EpicManagerImpl implements EpicManager {
  private epics: EpicDefinition[];
  private ctx: GoalEvaluationContext;
  private evaluator: GoalEvaluatorImpl;

  constructor(epics: EpicDefinition[], ctx: GoalEvaluationContext) {
    this.epics = epics;
    this.ctx = ctx;
    this.evaluator = new GoalEvaluatorImpl();
  }

  /**
   * List all epics
   */
  list(): string[] {
    return this.epics.map((e) => e.id);
  }

  /**
   * Evaluate an epic (checks all goals in epic)
   */
  async evaluate(epicId: string): Promise<{
    epicId: string;
    goalStatuses: GoalStatus[];
    satisfied: boolean;
  }> {
    const epic = this.epics.find((e) => e.id === epicId);

    if (!epic) {
      throw new Error(`Epic not found: ${epicId}`);
    }

    const goalStatuses: GoalStatus[] = [];

    for (const goal of epic.goals) {
      const status = await this.evaluator.evaluateHierarchy(goal, this.ctx);
      goalStatuses.push(status);
    }

    const satisfied = goalStatuses.every((s) => s.satisfied);

    return {
      epicId,
      goalStatuses,
      satisfied,
    };
  }

  /**
   * Run epic convergence
   */
  async run(
    epicId: string,
    config?: Partial<ConvergenceConfig>
  ): Promise<{
    converged: boolean;
    goalsSatisfied: number;
    totalGoals: number;
  }> {
    const epic = this.epics.find((e) => e.id === epicId);

    if (!epic) {
      throw new Error(`Epic not found: ${epicId}`);
    }

    const maxIterations = config?.maxIterations ?? 20;
    let iteration = 0;

    while (iteration < maxIterations) {
      this.ctx.log.info(`Epic ${epicId} - Iteration ${iteration + 1}/${maxIterations}`);

      // Evaluate all goals
      const goalStatuses: GoalStatus[] = [];
      for (const goal of epic.goals) {
        const status = await this.evaluator.evaluateHierarchy(goal, this.ctx);
        goalStatuses.push(status);
      }

      // Check convergence
      const totalGoals = goalStatuses.length;
      const goalsSatisfied = goalStatuses.filter((s) => s.satisfied).length;

      if (goalsSatisfied === totalGoals) {
        this.ctx.log.info(`✅ Epic ${epicId} converged`, { goalsSatisfied, totalGoals });
        return { converged: true, goalsSatisfied, totalGoals };
      }

      // Execute tasks for unsatisfied goals
      for (const goal of epic.goals) {
        const status = goalStatuses.find((s) => s.goalId === goal.id);
        if (status && !status.satisfied && goal.tasks) {
          // TODO: Execute tasks
          this.ctx.log.debug(`Executing tasks for goal: ${goal.id}`);
        }
      }

      iteration++;
    }

    // Final evaluation
    const goalStatuses: GoalStatus[] = [];
    for (const goal of epic.goals) {
      const status = await this.evaluator.evaluateHierarchy(goal, this.ctx);
      goalStatuses.push(status);
    }

    const totalGoals = goalStatuses.length;
    const goalsSatisfied = goalStatuses.filter((s) => s.satisfied).length;

    return { converged: false, goalsSatisfied, totalGoals };
  }
}
