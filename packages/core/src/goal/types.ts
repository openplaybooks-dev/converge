/**
 * Goal-Centric Types
 *
 * Goals are first-class entities that drive the gap-driven framework.
 * Goals have checks, tasks, and can contain sub-goals (hierarchical).
 *
 * Hierarchy: Epic → Goal → Sub-goal (3 levels)
 * Satisfaction: All checks pass = goal satisfied
 */

import type { Gap, CheckResult } from '../gap/types.ts';
import type { CheckFnMeta } from '../functions/types.ts';
import type { TaskConfig } from '../storage/types.ts';

/* ------------------------------------------------------------------ */
/*  Goal Definition                                                   */
/* ------------------------------------------------------------------ */

/**
 * A goal represents a desired outcome with satisfaction criteria.
 * Goals are satisfied when all checks pass.
 */
export interface Goal {
  /** Unique goal identifier */
  id: string;

  /** Human-readable description of goal */
  description: string;

  /** Checks that verify this goal is satisfied */
  checks: CheckFnMeta[];

  /** Tasks that work toward this goal (optional) */
  tasks?: TaskConfig[];

  /** Sub-goals (hierarchical, max 3 levels deep) */
  goals?: Goal[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Goal Status                                                       */
/* ------------------------------------------------------------------ */

/**
 * Runtime status of a goal
 */
export interface GoalStatus {
  /** Goal ID */
  goalId: string;

  /** Goal description */
  description: string;

  /** Whether goal is satisfied (all checks pass) */
  satisfied: boolean;

  /** Progress toward satisfaction (0.0 to 1.0) */
  progress: number;

  /** Gaps detected (unsatisfied checks) */
  gaps: Gap[];

  /** Check results */
  checkResults: CheckResult[];

  /** Sub-goal statuses (if goal has sub-goals) */
  subgoals?: GoalStatus[];

  /** When status was evaluated */
  timestamp: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Goal Hierarchy                                                    */
/* ------------------------------------------------------------------ */

/**
 * Hierarchical view of all goals in a project
 */
export interface GoalHierarchy {
  /** Goals organized by epic ID */
  [epicId: string]: GoalNode[];
}

/**
 * A node in the goal hierarchy
 */
export interface GoalNode {
  /** Goal ID */
  id: string;

  /** Goal description */
  description: string;

  /** Whether goal is satisfied */
  satisfied: boolean;

  /** Progress toward satisfaction */
  progress: number;

  /** Child goals */
  children?: GoalNode[];
}

/* ------------------------------------------------------------------ */
/*  Goal Evaluator                                                    */
/* ------------------------------------------------------------------ */

/**
 * Goal evaluator interface
 */
export interface GoalEvaluator {
  /**
   * Evaluate a single goal by running its checks
   */
  evaluate(goal: Goal, ctx: GoalEvaluationContext): Promise<GoalStatus>;

  /**
   * Evaluate goal hierarchy (goal + all sub-goals recursively)
   */
  evaluateHierarchy(goal: Goal, ctx: GoalEvaluationContext): Promise<GoalStatus>;

  /**
   * Check if goal is satisfied (all checks pass)
   */
  isSatisfied(goal: Goal, ctx: GoalEvaluationContext): Promise<boolean>;
}

/**
 * Context for goal evaluation
 */
export interface GoalEvaluationContext {
  /** Project root directory */
  projectDir: string;

  /** .converge/ directory */
  crewDir: string;

  /** Variables */
  vars: Record<string, unknown>;

  /** Filesystem API */
  fs: {
    read(path: string): Promise<string>;
    exists(path: string): Promise<boolean>;
    list(path: string, pattern?: string): Promise<string[]>;
  };

  /** Logger */
  log: {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
  };
}

/* ------------------------------------------------------------------ */
/*  Goal Builder                                                      */
/* ------------------------------------------------------------------ */

/**
 * Fluent builder for creating goals
 */
export interface GoalBuilder {
  /** Set goal ID */
  id(id: string): this;

  /** Set goal description */
  description(description: string): this;

  /** Add a check function */
  check(check: CheckFnMeta): this;

  /** Add multiple checks */
  checks(checks: CheckFnMeta[]): this;

  /** Add a task */
  task(task: TaskConfig): this;

  /** Add multiple tasks */
  tasks(tasks: TaskConfig[]): this;

  /** Add a sub-goal */
  goal(goal: Goal): this;

  /** Add multiple sub-goals */
  goals(goals: Goal[]): this;

  /** Set metadata */
  metadata(metadata: Record<string, unknown>): this;

  /** Build the goal */
  build(): Goal;
}

/* ------------------------------------------------------------------ */
/*  Goal Satisfaction Strategy                                        */
/* ------------------------------------------------------------------ */

/**
 * Strategy for satisfying a goal
 */
export interface GoalSatisfactionStrategy {
  /**
   * Determine how to satisfy a goal based on current gaps
   * Returns either tasks to execute or sub-goals to pursue
   */
  plan(
    goal: Goal,
    status: GoalStatus,
    ctx: GoalEvaluationContext
  ): Promise<GoalSatisfactionPlan>;
}

/**
 * Plan for satisfying a goal
 */
export interface GoalSatisfactionPlan {
  /** Goal being satisfied */
  goalId: string;

  /** Tasks to execute (if task-driven approach) */
  tasks?: TaskConfig[];

  /** Sub-goals to pursue (if goal-driven approach) */
  subgoals?: Goal[];

  /** Explanation of strategy */
  strategy: string;
}

/* ------------------------------------------------------------------ */
/*  Goal Convergence                                                  */
/* ------------------------------------------------------------------ */

/**
 * Convergence config for goal satisfaction
 */
export interface GoalConvergenceConfig {
  /** Maximum iterations */
  maxIterations: number;

  /** Callback when goal is satisfied */
  onGoalSatisfied?(goal: Goal, status: GoalStatus): void | Promise<void>;

  /** Callback on progress update */
  onProgress?(update: GoalProgressUpdate): void | Promise<void>;

  /** Whether to run tasks in parallel */
  parallel?: boolean;

  /** Timeout per iteration (ms) */
  timeout?: number;
}

/**
 * Progress update during goal convergence
 */
export interface GoalProgressUpdate {
  /** Current iteration */
  iteration: number;

  /** Total goals */
  totalGoals: number;

  /** Goals satisfied */
  goalsSatisfied: number;

  /** Goals in progress */
  goalsInProgress: number;

  /** Goals not started */
  goalsNotStarted: number;

  /** Current goal being worked on */
  currentGoal?: string;

  /** Gaps remaining */
  gapsRemaining: number;
}

/**
 * Result of goal convergence
 */
export interface GoalConvergenceResult {
  /** Whether all goals converged (satisfied) */
  converged: boolean;

  /** Whether convergence stalled */
  stalled: boolean;

  /** Goals satisfied */
  goalsSatisfied: number;

  /** Total goals */
  totalGoals: number;

  /** Final goal statuses */
  goalStatuses: GoalStatus[];

  /** Iterations performed */
  iterations: number;

  /** Summary */
  summary: {
    satisfiedGoals: string[];
    unsatisfiedGoals: string[];
    gapsRemaining: number;
  };
}
