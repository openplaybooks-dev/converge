/**
 * Runtime API Types
 *
 * Defines the runtime interfaces for goal-centric operations.
 */

import type {
  Goal,
  GoalStatus,
  GoalHierarchy,
  GoalConvergenceConfig,
  GoalConvergenceResult,
} from "../task/goal/types.ts";
import type { TaskConfig, TaskStatus } from "../storage/types.ts";
import type { ConvergenceConfig } from "../orchestrator/convergence.ts";
import type { ProjectOrchestrationResult } from "../orchestrator/project-orchestrator.ts";

/* ------------------------------------------------------------------ */
/*  Goal Manager                                                      */
/* ------------------------------------------------------------------ */

/**
 * Goal management interface
 */
export interface GoalManager {
  /**
   * List all goals in hierarchical view
   */
  list(): GoalHierarchy;

  /**
   * Evaluate a specific goal
   */
  evaluate(goalId: string): Promise<GoalStatus>;

  /**
   * Satisfy a specific goal (run convergence for that goal)
   */
  satisfy(
    goalId: string,
    config?: Partial<GoalConvergenceConfig>,
  ): Promise<GoalStatus>;

  /**
   * Get goal by ID
   */
  get(goalId: string): Goal | undefined;
}

/* ------------------------------------------------------------------ */
/*  Task Manager                                                      */
/* ------------------------------------------------------------------ */

/**
 * Task management interface
 */
export interface TaskManager {
  /**
   * List all tasks (across all goals/epics)
   */
  list(): TaskConfig[];

  /**
   * Run a specific task
   */
  run(taskId: string): Promise<TaskStatus>;

  /**
   * Get task by ID
   */
  get(taskId: string): TaskConfig | undefined;
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  Project Manager                                                   */
/* ------------------------------------------------------------------ */

/**
 * Project management interface
 */
export interface ProjectManager {
  /**
   * Get project status
   */
  status(): {
    goalsSatisfied: number;
    totalGoals: number;
    converged: boolean;
    goalStatuses: GoalStatus[];
  };

  /**
   * Get project name
   */
  getName(): string;

  /**
   * Get project goals (high-level)
   */
  getGoals(): string[];
}

/* ------------------------------------------------------------------ */
/*  Runtime                                                           */
/* ------------------------------------------------------------------ */

/**
 * Main runtime interface
 */
export interface Runtime {
  /** Goal operations */
  goals: GoalManager;

  /** Task operations */
  tasks: TaskManager;

  /** Project operations */
  project: ProjectManager;

  /**
   * Run full convergence (all epics, all goals)
   */
  run(config?: Partial<ConvergenceConfig>): Promise<ProjectOrchestrationResult>;

  /**
   * Create checkpoint
   */
  checkpoint(id?: string): Promise<void>;

  /**
   * Resume from checkpoint
   */
  resume(checkpointId?: string): Promise<ProjectOrchestrationResult>;
}
