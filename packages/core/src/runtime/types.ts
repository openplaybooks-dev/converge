/**
 * Runtime API Types
 *
 * Defines the runtime interfaces for task, epic, and project operations.
 */

import type { TaskConfig, TaskStatus } from "../storage/types.ts";
import type { ConvergenceConfig } from "../orchestrator/convergence.ts";
import type { ProjectOrchestrationResult } from "../orchestrator/project-orchestrator.ts";

/* ------------------------------------------------------------------ */
/*  Task Manager                                                      */
/* ------------------------------------------------------------------ */

/**
 * Task management interface
 */
export interface TaskManager {
  /** List all tasks (across all epics) */
  list(): TaskConfig[];

  /** Run a specific task */
  run(taskId: string): Promise<TaskStatus>;

  /** Get task by ID */
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
  /** Get project status */
  status(): {
    converged: boolean;
  };

  /** Get project name */
  getName(): string;
}

/* ------------------------------------------------------------------ */
/*  Runtime                                                           */
/* ------------------------------------------------------------------ */

/**
 * Main runtime interface
 */
export interface Runtime {
  /** Task operations */
  tasks: TaskManager;

  /** Project operations */
  project: ProjectManager;

  /**
   * Run full convergence (all epics)
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
