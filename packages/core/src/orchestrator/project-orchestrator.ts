/**
 * Project Orchestrator V2
 *
 * Orchestrates convergence across multiple epics in a project.
 * Handles epic sequencing, dependency resolution, and project-level convergence.
 */

import type { ProjectContext } from '../context/types.ts';
import type { EpicConfig, EpicStatus } from '../storage/types.ts';
import type { Gap } from '../gap/types.ts';
import {
  ConvergenceOrchestrator,
  ConvergenceConfig,
  ConvergenceResult,
  DEFAULT_CONVERGENCE_CONFIG,
} from './convergence.ts';
import { FilesystemStorage } from '../storage/filesystem.ts';
import { StatusManager } from '../storage/status.ts';
import { createEpicContext } from '../context/epic-context.ts';
import type { HookRegistry } from '../hooks/registry.ts';

/* ------------------------------------------------------------------ */
/*  Project Orchestration Result                                      */
/* ------------------------------------------------------------------ */

export interface ProjectOrchestrationResult {
  /** Whether project converged */
  converged: boolean;

  /** Epic results */
  epicResults: Map<string, ConvergenceResult>;

  /** Project-level summary */
  summary: {
    totalEpics: number;
    completedEpics: number;
    failedEpics: number;
    totalIterations: number;
    totalGapsResolved: number;
    totalTasksExecuted: number;
    duration: number;
  };

  /** Termination reason */
  terminationReason: 'converged' | 'epic-failed' | 'stalled' | 'error';

  /** Error details if any */
  error?: {
    message: string;
    epicId: string;
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
    hooks?: HookRegistry
  ) {
    this.storage = storage;
    this.statusManager = statusManager;
    this.hooks = hooks;
    this.convergenceOrch = new ConvergenceOrchestrator(storage, statusManager, hooks);
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
    config: ConvergenceConfig = DEFAULT_CONVERGENCE_CONFIG
  ): Promise<ProjectOrchestrationResult> {
    const startTime = Date.now();
    const epicResults = new Map<string, ConvergenceResult>();

    ctx.log.info(`Starting project orchestration: ${ctx.config.name}`);

    // Fire project:start hook
    await this.hooks?.fire('project:start', { ctx });

    let totalIterations = 0;
    let totalGapsResolved = 0;
    let totalTasksExecuted = 0;
    let completedEpics = 0;
    let failedEpics = 0;

    try {
      // Get epic execution order (respecting dependencies)
      const epicOrder = this.resolveEpicOrder(ctx);
      ctx.log.info(`Epic execution order: ${epicOrder.join(' → ')}`);

      // Execute epics in order
      for (const epicId of epicOrder) {
        ctx.log.info(`\n${'='.repeat(60)}`);
        ctx.log.info(`Starting epic: ${epicId}`);
        ctx.log.info(`${'='.repeat(60)}\n`);

        // Load epic config and status
        const epicConfig = this.storage.readEpicConfig(epicId);
        const epicStatus = this.statusManager.getEpicStatus(epicId);

        // Skip if already completed
        if (epicStatus.status === 'completed') {
          ctx.log.info(`Epic ${epicId} already completed, skipping`);
          completedEpics++;
          const epicCtxForSkip = createEpicContext(epicId, epicConfig, epicStatus, ctx, this.storage);
          await this.hooks?.fire('epic:skip', { ctx: epicCtxForSkip, reason: 'already completed' });
          continue;
        }

        // Create epic context
        const epicCtx = createEpicContext(epicId, epicConfig, epicStatus, ctx, this.storage);

        // Run epic convergence
        const result = await this.convergenceOrch.runEpicConvergence(epicCtx, config);
        epicResults.set(epicId, result);

        // Update counters
        totalIterations += result.iterations;
        totalGapsResolved += result.summary.totalGapsResolved;
        totalTasksExecuted += result.summary.totalTasksExecuted;

        if (result.converged) {
          completedEpics++;
          ctx.log.info(`✅ Epic ${epicId} converged successfully`);
        } else {
          failedEpics++;
          ctx.log.error(
            `❌ Epic ${epicId} failed to converge: ${result.terminationReason}`
          );

          // Decide whether to continue or stop
          if (epicConfig.constraints?.sequential !== false) {
            // Sequential mode: stop on first failure
            ctx.log.error(`Stopping project due to epic failure (sequential mode)`);
            return {
              converged: false,
              epicResults,
              summary: {
                totalEpics: epicOrder.length,
                completedEpics,
                failedEpics,
                totalIterations,
                totalGapsResolved,
                totalTasksExecuted,
                duration: Date.now() - startTime,
              },
              terminationReason: 'epic-failed',
              error: {
                message: `Epic ${epicId} failed to converge`,
                epicId,
              },
            };
          } else {
            // Parallel mode: continue with next epic
            ctx.log.warn(`Continuing with next epic despite failure`);
          }
        }
      }

      // Check overall convergence
      const projectConverged = failedEpics === 0;

      ctx.log.info(`\n${'='.repeat(60)}`);
      ctx.log.info(`Project Orchestration Complete`);
      ctx.log.info(`${'='.repeat(60)}`);
      ctx.log.info(`Total Epics: ${epicOrder.length}`);
      ctx.log.info(`Completed: ${completedEpics}`);
      ctx.log.info(`Failed: ${failedEpics}`);
      ctx.log.info(`Total Iterations: ${totalIterations}`);
      ctx.log.info(`Total Gaps Resolved: ${totalGapsResolved}`);
      ctx.log.info(`Total Tasks Executed: ${totalTasksExecuted}`);
      ctx.log.info(`Duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
      ctx.log.info(`${'='.repeat(60)}\n`);

      const projectResult: ProjectOrchestrationResult = {
        converged: projectConverged,
        epicResults,
        summary: {
          totalEpics: epicOrder.length,
          completedEpics,
          failedEpics,
          totalIterations,
          totalGapsResolved,
          totalTasksExecuted,
          duration: Date.now() - startTime,
        },
        terminationReason: projectConverged ? 'converged' : 'epic-failed',
      };

      if (projectConverged) {
        await this.hooks?.fire('project:complete', { ctx, result: projectResult });
      } else {
        await this.hooks?.fire('project:fail', {
          ctx,
          error: new Error(`${failedEpics} epic(s) failed to converge`),
        });
      }

      return projectResult;
    } catch (error: any) {
      ctx.log.error(`Project orchestration error: ${error.message}`);

      const errorResult: ProjectOrchestrationResult = {
        converged: false,
        epicResults,
        summary: {
          totalEpics: ctx.config.epics.length,
          completedEpics,
          failedEpics,
          totalIterations,
          totalGapsResolved,
          totalTasksExecuted,
          duration: Date.now() - startTime,
        },
        terminationReason: 'error',
        error: {
          message: error.message,
          epicId: 'unknown',
        },
      };

      await this.hooks?.fire('project:fail', { ctx, error });

      return errorResult;
    }
  }

  /**
   * Resolve epic execution order based on dependencies
   */
  private resolveEpicOrder(ctx: ProjectContext): string[] {
    const epicIds = ctx.config.epics;
    const epicConfigs = new Map<string, EpicConfig>();

    // Load all epic configs
    for (const epicId of epicIds) {
      const config = this.storage.readEpicConfig(epicId);
      epicConfigs.set(epicId, config);
    }

    // Build dependency graph
    const graph = new Map<string, string[]>();
    for (const [epicId, config] of epicConfigs) {
      graph.set(epicId, config.constraints?.blockedBy || []);
    }

    // Topological sort
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (epicId: string, path: string[]): void => {
      if (visited.has(epicId)) return;

      if (visiting.has(epicId)) {
        throw new Error(
          `Circular epic dependency detected: ${[...path, epicId].join(' → ')}`
        );
      }

      visiting.add(epicId);

      const deps = graph.get(epicId) || [];
      for (const dep of deps) {
        if (!epicConfigs.has(dep)) {
          throw new Error(`Epic "${epicId}" depends on unknown epic "${dep}"`);
        }
        visit(dep, [...path, epicId]);
      }

      visiting.delete(epicId);
      visited.add(epicId);
      sorted.push(epicId);
    };

    for (const epicId of epicIds) {
      visit(epicId, []);
    }

    return sorted;
  }

  /**
   * Resume from checkpoint
   */
  async resume(
    ctx: ProjectContext,
    config: ConvergenceConfig = DEFAULT_CONVERGENCE_CONFIG
  ): Promise<ProjectOrchestrationResult> {
    ctx.log.info('Resuming from checkpoint...');

    // Load latest checkpoint
    const checkpoint = this.storage.readLatestCheckpoint();
    if (!checkpoint) {
      ctx.log.warn('No checkpoint found, starting fresh');
      return this.run(ctx, config);
    }

    ctx.log.info(
      `Resuming from checkpoint: iteration ${checkpoint.iteration ?? 0}, ` +
        `epic ${checkpoint.state?.currentEpic || 'unknown'}`
    );

    await this.hooks?.fire('checkpoint:restored', {
      checkpointId: checkpoint.id,
      iteration: checkpoint.iteration ?? 0,
    });

    // Re-evaluate gaps (trust codebase, not stale status)
    if (checkpoint.state?.currentEpic) {
      const epicConfig = this.storage.readEpicConfig(checkpoint.state.currentEpic);
      const epicStatus = this.statusManager.getEpicStatus(checkpoint.state.currentEpic);
      const epicCtx = createEpicContext(
        checkpoint.state.currentEpic,
        epicConfig,
        epicStatus,
        ctx,
        this.storage
      );

      ctx.log.info('Re-evaluating gaps from checkpoint...');
      const freshGaps = await this.convergenceOrch['detector'].detectEpicGaps(epicCtx);
      ctx.log.info(
        `Fresh evaluation: ${freshGaps.gaps.length} gaps ` +
          `(checkpoint had ${checkpoint.gaps?.length ?? 0})`
      );
    }

    // Continue execution from current state
    return this.run(ctx, config);
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
  hooks?: HookRegistry
): ProjectOrchestratorV2 {
  return new ProjectOrchestratorV2(storage, statusManager, hooks);
}
