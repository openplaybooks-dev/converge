/**
 * Runtime Implementation
 *
 * Main runtime interface that provides access to goal, task, epic, and project operations.
 */

import type { Runtime, GoalManager, TaskManager, EpicManager, ProjectManager } from './types.ts';
import type { ProjectConfig } from '../storage/types.ts';
import type { EpicDefinition } from '../functions/types.ts';
import type { ConvergenceConfig } from '../orchestrator/convergence.ts';
import type { ProjectOrchestrationResult } from '../orchestrator/project-orchestrator.ts';
import type { GoalEvaluationContext } from '../goal/types.ts';

import { GoalManagerImpl } from './goal-manager.ts';
import { TaskManagerImpl } from './task-manager.ts';
import { EpicManagerImpl } from './epic-manager.ts';
import { ProjectManagerImpl } from './project-manager.ts';

/* ------------------------------------------------------------------ */
/*  Runtime Implementation                                            */
/* ------------------------------------------------------------------ */

export class RuntimeImpl implements Runtime {
  goals: GoalManager;
  tasks: TaskManager;
  epics: EpicManager;
  project: ProjectManager;

  private config: ProjectConfig;
  private epicDefinitions: EpicDefinition[];
  private workspaceDir: string;

  constructor(
    config: ProjectConfig,
    epics: EpicDefinition[],
    workspaceDir: string,
    ctx: GoalEvaluationContext
  ) {
    this.config = config;
    this.epicDefinitions = epics;
    this.workspaceDir = workspaceDir;

    // Initialize managers
    this.goals = new GoalManagerImpl(epics, ctx);
    this.tasks = new TaskManagerImpl(epics);
    this.epics = new EpicManagerImpl(epics, ctx);
    this.project = new ProjectManagerImpl(config, epics, ctx);
  }

  /**
   * Run full convergence (all epics, all goals)
   */
  async run(config?: Partial<ConvergenceConfig>): Promise<ProjectOrchestrationResult> {
    // TODO: Implement full convergence orchestration
    // This would integrate with the ProjectOrchestratorV2
    throw new Error('Runtime.run() not yet fully implemented');
  }

  /**
   * Create checkpoint
   */
  async checkpoint(id?: string): Promise<void> {
    // TODO: Implement checkpointing
    throw new Error('Runtime.checkpoint() not yet implemented');
  }

  /**
   * Resume from checkpoint
   */
  async resume(checkpointId?: string): Promise<ProjectOrchestrationResult> {
    // TODO: Implement resume
    throw new Error('Runtime.resume() not yet implemented');
  }
}

/* ------------------------------------------------------------------ */
/*  Runtime Factory                                                   */
/* ------------------------------------------------------------------ */

/**
 * Create a runtime instance
 */
export function createRuntime(
  config: ProjectConfig,
  epics: EpicDefinition[],
  workspaceDir: string
): Runtime {
  // Create evaluation context
  const ctx: GoalEvaluationContext = {
    projectDir: workspaceDir,
    crewDir: `${workspaceDir}/.crew`,
    vars: config.variables || {},
    fs: {
      async read(path: string): Promise<string> {
        // TODO: Implement file read
        throw new Error('fs.read not implemented');
      },
      async exists(path: string): Promise<boolean> {
        // TODO: Implement file exists check
        throw new Error('fs.exists not implemented');
      },
      async list(path: string, pattern?: string): Promise<string[]> {
        // TODO: Implement file list
        throw new Error('fs.list not implemented');
      },
    },
    log: {
      debug(message: string, meta?: Record<string, unknown>): void {
        console.debug(message, meta);
      },
      info(message: string, meta?: Record<string, unknown>): void {
        console.info(message, meta);
      },
      warn(message: string, meta?: Record<string, unknown>): void {
        console.warn(message, meta);
      },
      error(message: string, meta?: Record<string, unknown>): void {
        console.error(message, meta);
      },
    },
  };

  return new RuntimeImpl(config, epics, workspaceDir, ctx);
}
