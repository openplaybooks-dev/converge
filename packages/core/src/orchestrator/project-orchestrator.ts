/**
 * Project Orchestrator V2
 *
 * Orchestrates convergence across a project.
 * Handles project-level convergence.
 */

import type { ProjectContext } from "../context/types.ts";
import {
  ConvergenceOrchestrator,
  ConvergenceConfig,
  ConvergenceResult,
  DEFAULT_CONVERGENCE_CONFIG,
} from "./convergence.ts";
import { FilesystemStorage } from "../storage/filesystem.ts";
import { StatusManager } from "../storage/status.ts";
import type { HookRegistry } from "../hooks/registry.ts";

/* ------------------------------------------------------------------ */
/*  Project Orchestration Result                                      */
/* ------------------------------------------------------------------ */

export interface ProjectOrchestrationResult {
  /** Whether project converged */
  converged: boolean;

  /** Project-level summary */
  summary: {
    totalIterations: number;
    totalGapsResolved: number;
    totalTasksExecuted: number;
    duration: number;
  };

  /** Termination reason */
  terminationReason: "converged" | "stalled" | "error";

  /** Error details if any */
  error?: {
    message: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Project Orchestrator V2                                           */
/* ------------------------------------------------------------------ */

export class ProjectOrchestratorV2 {
  private storage: FilesystemStorage;
  private statusManager: StatusManager;
  private convergenceOrch: ConvergenceOrchestrator;
  private hooks?: HookRegistry;

  constructor(
    storage: FilesystemStorage,
    statusManager: StatusManager,
    hooks?: HookRegistry,
  ) {
    this.storage = storage;
    this.statusManager = statusManager;
    this.hooks = hooks;
    this.convergenceOrch = new ConvergenceOrchestrator(
      storage,
      statusManager,
      hooks,
    );
  }

  /** Request graceful stop (passed through to convergence orchestrator) */
  stop(): void {
    this.convergenceOrch.stop();
  }

  /**
   * Run the entire project to convergence
   */
  async run(
    ctx: ProjectContext,
    config: ConvergenceConfig = DEFAULT_CONVERGENCE_CONFIG,
  ): Promise<ProjectOrchestrationResult> {
    ctx.log.info(`Starting project orchestration: ${ctx.config.name}`);
    await this.hooks?.fire("project:start", { ctx });

    throw new Error("ProjectOrchestratorV2.run() not yet implemented without epics");
  }

  /**
   * Resume from checkpoint
   */
  async resume(
    ctx: ProjectContext,
    config: ConvergenceConfig = DEFAULT_CONVERGENCE_CONFIG,
  ): Promise<ProjectOrchestrationResult> {
    ctx.log.info("Resuming from checkpoint...");
    throw new Error("ProjectOrchestratorV2.resume() not yet implemented without epics");
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Function                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create a new project orchestrator
 */
export function createProjectOrchestratorV2(
  storage: FilesystemStorage,
  statusManager: StatusManager,
  hooks?: HookRegistry,
): ProjectOrchestratorV2 {
  return new ProjectOrchestratorV2(storage, statusManager, hooks);
}