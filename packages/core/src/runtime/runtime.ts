/**
 * Runtime Implementation
 *
 * Main runtime interface that provides access to task, epic, and project operations.
 */

import type {
  Runtime,
  TaskManager,
  ProjectManager,
} from "./types.ts";
import type { ProjectConfig } from "../storage/types.ts";
import type { EpicDefinition } from "../task/checks/types.ts";
import type { ConvergenceConfig } from "../orchestrator/convergence.ts";
import type { ProjectOrchestrationResult } from "../orchestrator/project-orchestrator.ts";

import { TaskManagerImpl } from "./task-manager.ts";
import { ProjectManagerImpl } from "./project-manager.ts";

/* ------------------------------------------------------------------ */
/*  Runtime Implementation                                            */
/* ------------------------------------------------------------------ */

export class RuntimeImpl implements Runtime {
  tasks: TaskManager;
  project: ProjectManager;

  private config: ProjectConfig;
  private workspaceDir: string;

  constructor(
    config: ProjectConfig,
    epics: EpicDefinition[],
    workspaceDir: string,
  ) {
    this.config = config;
    this.workspaceDir = workspaceDir;

    this.tasks = new TaskManagerImpl(epics);
    this.project = new ProjectManagerImpl(config, epics);
  }

  /**
   * Run full convergence (all epics)
   */
  async run(
    config?: Partial<ConvergenceConfig>,
  ): Promise<ProjectOrchestrationResult> {
    // TODO: Implement full convergence orchestration
    // This would integrate with the ProjectOrchestratorV2
    throw new Error("Runtime.run() not yet fully implemented");
  }

  /**
   * Create checkpoint
   */
  async checkpoint(id?: string): Promise<void> {
    // TODO: Implement checkpointing
    throw new Error("Runtime.checkpoint() not yet implemented");
  }

  /**
   * Resume from checkpoint
   */
  async resume(checkpointId?: string): Promise<ProjectOrchestrationResult> {
    // TODO: Implement resume
    throw new Error("Runtime.resume() not yet implemented");
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
  workspaceDir: string,
): Runtime {
  return new RuntimeImpl(config, epics, workspaceDir);
}