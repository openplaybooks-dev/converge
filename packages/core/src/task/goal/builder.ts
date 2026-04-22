/**
 * Goal Builder API
 *
 * Fluent API for creating goals with checks, tasks, and sub-goals.
 */

import type { Goal, GoalBuilder } from "./types.ts";
import type { CheckFnMeta } from "../../functions/types.ts";
import type { TaskConfig } from "../../storage/types.ts";

/* ------------------------------------------------------------------ */
/*  Goal Builder Implementation                                       */
/* ------------------------------------------------------------------ */

class GoalBuilderImpl implements GoalBuilder {
  private _id?: string;
  private _description?: string;
  private _checks: CheckFnMeta[] = [];
  private _tasks: TaskConfig[] = [];
  private _goals: Goal[] = [];
  private _metadata: Record<string, unknown> = {};

  id(id: string): this {
    this._id = id;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  check(check: CheckFnMeta): this {
    this._checks.push(check);
    return this;
  }

  checks(checks: CheckFnMeta[]): this {
    this._checks.push(...checks);
    return this;
  }

  task(task: TaskConfig): this {
    this._tasks.push(task);
    return this;
  }

  tasks(tasks: TaskConfig[]): this {
    this._tasks.push(...tasks);
    return this;
  }

  goal(goal: Goal): this {
    this._goals.push(goal);
    return this;
  }

  goals(goals: Goal[]): this {
    this._goals.push(...goals);
    return this;
  }

  metadata(metadata: Record<string, unknown>): this {
    this._metadata = { ...this._metadata, ...metadata };
    return this;
  }

  build(): Goal {
    if (!this._id) {
      throw new Error("Goal ID is required");
    }

    if (!this._description) {
      throw new Error("Goal description is required");
    }

    const goal: Goal = {
      id: this._id,
      description: this._description,
      checks: this._checks,
    };

    if (this._tasks.length > 0) {
      goal.tasks = this._tasks;
    }

    if (this._goals.length > 0) {
      goal.goals = this._goals;
    }

    if (Object.keys(this._metadata).length > 0) {
      goal.metadata = this._metadata;
    }

    return goal;
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Create a new goal builder
 */
export function goal(): GoalBuilder {
  return new GoalBuilderImpl();
}

/**
 * Define a goal (shorthand for builder pattern)
 */
export function defineGoal(config: {
  id: string;
  description: string;
  checks?: CheckFnMeta[];
  tasks?: TaskConfig[];
  goals?: Goal[];
  metadata?: Record<string, unknown>;
}): Goal {
  const builder = goal().id(config.id).description(config.description);

  if (config.checks) {
    builder.checks(config.checks);
  }

  if (config.tasks) {
    builder.tasks(config.tasks);
  }

  if (config.goals) {
    builder.goals(config.goals);
  }

  if (config.metadata) {
    builder.metadata(config.metadata);
  }

  return builder.build();
}
