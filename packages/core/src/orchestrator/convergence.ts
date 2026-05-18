/**
 * Convergence Loop Orchestrator
 *
 * Implements the core gap-driven convergence loop:
 * evaluate → plan → execute → checkpoint → repeat until complete or stalled
 */

import type { ProjectContext } from "../context/types.ts";
import type { Gap, ConvergenceState } from "../task/gap/types.ts";
import type {
  TaskConfig,
  TaskStatus,
  Checkpoint,
  Cursor,
} from "../storage/types.ts";
import type { TaskResult } from "../task/checks/types.ts";
import type { GoalStatus, GoalEvaluationContext } from "../task/goal/types.ts";
import { GapDetector, ConvergenceAnalyzer } from "../task/gap/detector.ts";
import { FilesystemStorage } from "../storage/filesystem.ts";
import { StatusManager } from "../storage/status.ts";
import { createTaskContext } from "../context/task-context.ts";
import { globalRegistry } from "../task/checks/registry.ts";
import type { HookRegistry } from "../hooks/registry.ts";

/* ------------------------------------------------------------------ */
/*  Convergence Configuration                                         */
/* ------------------------------------------------------------------ */

export interface ConvergenceConfig {
  /** Maximum iterations before stopping */
  maxIterations?: number;

  /** Maximum consecutive stalls before stopping */
  maxStallCount: number;

  /** Enable checkpoint creation after each iteration */
  enableCheckpoints: boolean;

  /** Run tasks in parallel when possible */
  parallelExecution: boolean;

  /** Maximum parallel tasks */
  maxParallelTasks: number;
}

const DEFAULT_MAX_ITERATIONS = 1_000_000;

export const DEFAULT_CONVERGENCE_CONFIG: ConvergenceConfig = {
  maxStallCount: 3,
  enableCheckpoints: true,
  parallelExecution: true,
  maxParallelTasks: 5,
};

/* ------------------------------------------------------------------ */
/*  Convergence Result                                                */
/* ------------------------------------------------------------------ */

export interface ConvergenceResult {
  /** Whether convergence was achieved */
  converged: boolean;

  /** Whether convergence stalled */
  stalled: boolean;

  /** Number of iterations performed */
  iterations: number;

  /** Final convergence state */
  finalState: ConvergenceState;

  /** Reason for termination */
  terminationReason: "converged" | "stalled" | "max-iterations" | "error";

  /** Error details if terminated due to error */
  error?: {
    message: string;
    iteration: number;
    phase: "evaluate" | "plan" | "execute" | "checkpoint";
  };

  /** Goal-centric metrics (if goals are present) */
  goalsSatisfied?: number;
  totalGoals?: number;
  goalStatuses?: import("../task/goal/types.ts").GoalStatus[];

  /** Execution summary */
  summary: {
    totalGapsDetected: number;
    totalGapsResolved: number;
    totalTasksExecuted: number;
    totalTasksSucceeded: number;
    totalTasksFailed: number;
    duration: number; // milliseconds
  };
}

/* ------------------------------------------------------------------ */
/*  Convergence Loop Orchestrator                                     */
/* ------------------------------------------------------------------ */

export class ConvergenceOrchestrator {
  private detector: GapDetector;
  private analyzer: ConvergenceAnalyzer;
  private storage: FilesystemStorage;
  private statusManager: StatusManager;
  private hooks?: HookRegistry;
  /** Set to true via stop() to request a graceful halt after the current task */
  private _stopRequested = false;

  constructor(
    storage: FilesystemStorage,
    statusManager: StatusManager,
    hooks?: HookRegistry,
  ) {
    this.storage = storage;
    this.statusManager = statusManager;
    this.hooks = hooks;
    this.detector = new GapDetector();
    this.analyzer = new ConvergenceAnalyzer();
  }

  /** Request a graceful stop after the current task completes */
  stop(): void {
    this._stopRequested = true;
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Epic-Level Convergence Loop                                  */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Run convergence loop for an epic until gaps are resolved or stalled
   */
  async runEpicConvergence(
    ctx: ProjectContext,
    config: ConvergenceConfig = DEFAULT_CONVERGENCE_CONFIG,
  ): Promise<ConvergenceResult> {
    const startTime = Date.now();
    let iteration = 0;
    let previousGaps: Gap[] = [];
    let consecutiveStalls = 0;
    let totalTasksExecuted = 0;
    let totalTasksSucceeded = 0;
    let totalTasksFailed = 0;
    const allGapsDetected = new Set<string>();

    ctx.log.info(`Starting convergence loop for epic: ${ctx.epicId}`);

    // Transition epic to active
    this.statusManager.transitionPlaybook(
      ctx.epicId,
      "active",
      "Starting convergence loop",
    );

    while (iteration < DEFAULT_MAX_ITERATIONS && !this._stopRequested) {
      iteration++;
      ctx.log.info(`Iteration ${iteration}: Evaluating gaps...`);

      try {
        // ─────────── PHASE 1: EVALUATE ─────────────
        const evalResult = await this.detector.detectEpicGaps(ctx);
        const currentGaps = evalResult.gaps;

        // Track all gaps ever detected
        currentGaps.forEach((g) => allGapsDetected.add(g.id));

        ctx.log.info(
          `Iteration ${iteration}: Detected ${currentGaps.length} gaps ` +
            `(${evalResult.summary.total} total, ${currentGaps.filter((g) => !g.resolved).length} unresolved)`,
        );

        // Fire gap:detected hook when there are unresolved gaps
        if (currentGaps.filter((g) => !g.resolved).length > 0) {
          await this.hooks?.fire("gap:detected", {
            gaps: currentGaps.filter((g) => !g.resolved),
            epicId: ctx.epicId,
            iteration,
          });
        }

        // Record gaps in status
        this.statusManager.recordPlaybookGaps(
          ctx.epicId,
          currentGaps.map((g) => g.id),
        );

        // ─────────── ANALYZE CONVERGENCE ─────────────
        const convergenceState = this.analyzer.analyzeConvergence(
          iteration,
          previousGaps,
          currentGaps,
          config.maxStallCount,
        );

        ctx.log.info(this.analyzer.generateReport(convergenceState));

        // Check for convergence
        if (this.analyzer.hasConverged(convergenceState)) {
          ctx.log.info(`✅ Convergence achieved! All gaps resolved.`);
          this.statusManager.transitionPlaybook(
            ctx.epicId,
            "completed",
            "All gaps resolved",
          );

          const convResult: ConvergenceResult = {
            converged: true,
            stalled: false,
            iterations: iteration,
            finalState: convergenceState,
            terminationReason: "converged",
            summary: {
              totalGapsDetected: allGapsDetected.size,
              totalGapsResolved: allGapsDetected.size,
              totalTasksExecuted,
              totalTasksSucceeded,
              totalTasksFailed,
              duration: Date.now() - startTime,
            },
          };

          await this.hooks?.fire("convergence:achieved", {
            epicId: ctx.epicId,
            iterations: iteration,
            gapsResolved: allGapsDetected.size,
          });

          return convResult;
        }

        // Check for stall
        if (convergenceState.stalled) {
          consecutiveStalls++;
          ctx.log.warn(
            `⚠️  Stall detected (${consecutiveStalls}/${config.maxStallCount}): ${convergenceState.stallReason}`,
          );

          if (consecutiveStalls >= config.maxStallCount) {
            ctx.log.error(
              `❌ Convergence stalled after ${consecutiveStalls} consecutive stalls`,
            );
            this.statusManager.transitionPlaybook(
              ctx.epicId,
              "failed",
              `Stalled: ${convergenceState.stallReason}`,
            );

            const stallResult: ConvergenceResult = {
              converged: false,
              stalled: true,
              iterations: iteration,
              finalState: convergenceState,
              terminationReason: "stalled",
              summary: {
                totalGapsDetected: allGapsDetected.size,
                totalGapsResolved: allGapsDetected.size - currentGaps.length,
                totalTasksExecuted,
                totalTasksSucceeded,
                totalTasksFailed,
                duration: Date.now() - startTime,
              },
            };

            await this.hooks?.fire("convergence:stalled", {
              epicId: ctx.epicId,
              reason: convergenceState.stallReason ?? "unknown",
              stallCount: consecutiveStalls,
              gaps: currentGaps,
            });

            return stallResult;
          }
        } else {
          consecutiveStalls = 0; // Reset stall counter
        }

        // ─────────── PHASE 2: PLAN ─────────────
        ctx.log.info(`Iteration ${iteration}: Planning tasks from gaps...`);
        const tasks = await ctx.plan.generateTasks(currentGaps);
        ctx.log.info(`Iteration ${iteration}: Generated ${tasks.length} tasks`);

        if (tasks.length === 0) {
          ctx.log.warn(`No tasks generated from ${currentGaps.length} gaps`);
          previousGaps = currentGaps;
          continue;
        }

        // ─────────── PHASE 3: EXECUTE ─────────────
        ctx.log.info(
          `Iteration ${iteration}: Executing ${tasks.length} tasks...`,
        );

        const executionResults = await this.executeTasks(
          ctx,
          tasks,
          config.parallelExecution,
          config.maxParallelTasks,
        );

        totalTasksExecuted += executionResults.length;
        totalTasksSucceeded += executionResults.filter((r) => r.success).length;
        totalTasksFailed += executionResults.filter((r) => !r.success).length;

        ctx.log.info(
          `Iteration ${iteration}: Executed ${executionResults.length} tasks ` +
            `(${totalTasksSucceeded} succeeded, ${totalTasksFailed} failed)`,
        );

        // ─────────── PHASE 4: CHECKPOINT ─────────────
        if (config.enableCheckpoints) {
          const checkpointId = await this.createCheckpoint(
            ctx,
            iteration,
            currentGaps,
            convergenceState,
          );
          await this.hooks?.fire("checkpoint:created", {
            checkpointId,
            iteration,
            epicId: ctx.epicId,
          });
        }

        // Update for next iteration
        previousGaps = currentGaps;
      } catch (error: any) {
        ctx.log.error(`Error in iteration ${iteration}: ${error.message}`);
        this.statusManager.transitionPlaybook(ctx.epicId, "failed", error.message);

        return {
          converged: false,
          stalled: true,
          iterations: iteration,
          finalState: {
            iteration,
            previousGaps,
            currentGaps: [],
            newGaps: [],
            resolvedGaps: [],
            unchangedGaps: previousGaps,
            stalled: true,
            stallReason: "Error during execution",
            metrics: {
              gapReductionRate: 0,
              stallThreshold: config.maxStallCount,
              stallCount: config.maxStallCount,
            },
          },
          terminationReason: "error",
          error: {
            message: error.message,
            iteration,
            phase: "execute", // Could be more specific
          },
          summary: {
            totalGapsDetected: allGapsDetected.size,
            totalGapsResolved: 0,
            totalTasksExecuted,
            totalTasksSucceeded,
            totalTasksFailed,
            duration: Date.now() - startTime,
          },
        };
      }
    }

    // Max iterations reached
    ctx.log.error(
      `❌ Loop limit reached without convergence`,
    );
    this.statusManager.transitionPlaybook(
      ctx.epicId,
      "failed",
      `Loop limit reached`,
    );

    return {
      converged: false,
      stalled: true,
      iterations: iteration,
      finalState: {
        iteration,
        previousGaps,
        currentGaps: previousGaps,
        newGaps: [],
        resolvedGaps: [],
        unchangedGaps: previousGaps,
        stalled: true,
        stallReason: "Loop limit reached",
        metrics: {
          gapReductionRate: 0,
          stallThreshold: config.maxStallCount,
          stallCount: config.maxStallCount,
        },
      },
      terminationReason: "max-iterations",
      summary: {
        totalGapsDetected: allGapsDetected.size,
        totalGapsResolved: allGapsDetected.size - previousGaps.length,
        totalTasksExecuted,
        totalTasksSucceeded,
        totalTasksFailed,
        duration: Date.now() - startTime,
      },
    };
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Task Execution                                                */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Execute tasks (parallel or sequential)
   */
  private async executeTasks(
    epicCtx: ProjectContext,
    tasks: TaskConfig[],
    parallel: boolean,
    maxParallel: number,
  ): Promise<TaskResult[]> {
    if (parallel) {
      return this.executeTasksParallel(epicCtx, tasks, maxParallel);
    } else {
      return this.executeTasksSequential(epicCtx, tasks);
    }
  }

  /**
   * Execute tasks sequentially
   */
  private async executeTasksSequential(
    epicCtx: ProjectContext,
    tasks: TaskConfig[],
  ): Promise<TaskResult[]> {
    const results: TaskResult[] = [];

    for (const taskConfig of tasks) {
      const result = await this.executeTask(epicCtx, taskConfig);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute tasks in parallel with concurrency limit
   */
  private async executeTasksParallel(
    epicCtx: ProjectContext,
    tasks: TaskConfig[],
    maxParallel: number,
  ): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    // Wrap each in-flight task so the wrapper promise resolves with both the
    // result AND the wrapper itself — that lets us identify which slot to
    // remove from the executing array when Promise.race fires.
    //
    // The previous implementation used `executing.findIndex((p) => p === Promise.resolve(result))`
    // which is always -1: `Promise.resolve(result)` is a fresh promise that
    // is never `===` to anything already in the array. Result: nothing got
    // removed from `executing`, the window grew unboundedly, and the same
    // already-settled promise won every subsequent race.
    type Slot = { promise: Promise<{ result: TaskResult; slot: Slot }> };
    const executing: Slot[] = [];

    for (const taskConfig of tasks) {
      const slot: Slot = { promise: Promise.resolve() as never };
      slot.promise = this.executeTask(epicCtx, taskConfig).then((result) => ({
        result,
        slot,
      }));
      executing.push(slot);

      if (executing.length >= maxParallel) {
        const { result, slot: doneSlot } = await Promise.race(
          executing.map((s) => s.promise),
        );
        results.push(result);
        const index = executing.indexOf(doneSlot);
        if (index !== -1) executing.splice(index, 1);
      }
    }

    // Wait for remaining tasks
    const remaining = await Promise.all(executing.map((s) => s.promise));
    results.push(...remaining.map((r) => r.result));

    return results;
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    epicCtx: ProjectContext,
    taskConfig: TaskConfig,
  ): Promise<TaskResult> {
    const taskId = taskConfig.id;

    // Get or create task status
    const taskStatus = this.statusManager.getTaskStatus(epicCtx.epicId, taskId);

    // Create task context
    const taskCtx = createTaskContext(
      taskId,
      taskConfig,
      taskStatus,
      epicCtx.projectDir,
      epicCtx.convergeDir,
      epicCtx.vars,
      epicCtx,
      epicCtx.epicId,
      this.storage,
    );

    // Transition to active
    this.statusManager.transitionTask(
      epicCtx.epicId,
      taskId,
      "active",
      "Starting execution",
    );
    this.statusManager.startTaskAttempt(
      epicCtx.epicId,
      taskId,
      taskStatus.attempts + 1,
    );

    // Fire task:start hook
    await this.hooks?.fire("task:start", { ctx: taskCtx });

    try {
      // Get task function
      const taskMeta = globalRegistry.getTask(taskConfig.type || "default");
      if (!taskMeta) {
        throw new Error(`Task type "${taskConfig.type}" not found in registry`);
      }

      // Execute task function
      taskCtx.log.info(`Executing task: ${taskConfig.title}`);
      const result = await taskMeta.fn(taskCtx);

      // Record attempt
      this.statusManager.recordTaskAttempt(epicCtx.epicId, taskId, {
        number: taskStatus.attempts + 1,
        success: result.success,
        error: result.error?.message,
      });

      // Transition based on result
      if (result.success) {
        this.statusManager.transitionTask(
          epicCtx.epicId,
          taskId,
          "completed",
          result.message || "Task completed successfully",
        );
        taskCtx.log.info(`✅ Task completed: ${taskConfig.title}`);

        // Fire task:complete hook
        await this.hooks?.fire("task:complete", { ctx: taskCtx, result });

        // Fire gap:resolved for each resolved gap
        if (result.gapsResolved) {
          for (const gapId of result.gapsResolved) {
            await this.hooks?.fire("gap:resolved", {
              gapId,
              taskId,
              epicId: epicCtx.epicId,
            });
          }
        }
      } else {
        this.statusManager.transitionTask(
          epicCtx.epicId,
          taskId,
          "failed",
          result.error?.message || "Task failed",
        );
        taskCtx.log.error(
          `❌ Task failed: ${taskConfig.title} - ${result.error?.message}`,
        );

        // Fire task:fail hook
        await this.hooks?.fire("task:fail", {
          ctx: taskCtx,
          error: new Error(result.error?.message ?? "Task failed"),
        });
      }

      return result;
    } catch (error: any) {
      // Record failed attempt
      this.statusManager.recordTaskAttempt(epicCtx.epicId, taskId, {
        number: taskStatus.attempts + 1,
        success: false,
        error: error.message,
      });

      this.statusManager.transitionTask(
        epicCtx.epicId,
        taskId,
        "failed",
        error.message,
      );
      taskCtx.log.error(
        `❌ Task error: ${taskConfig.title} - ${error.message}`,
      );

      // Fire task:fail hook
      await this.hooks?.fire("task:fail", { ctx: taskCtx, error });

      return {
        success: false,
        message: `Task execution failed: ${error.message}`,
        error: {
          message: error.message,
          stack: error.stack,
          recoverable: false,
        },
      };
    }
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Checkpoint Management                                         */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Create a checkpoint for resumability.
   * Returns the checkpoint ID for hook firing.
   *
   * Simplified: Store ONLY cursor + execution context.
   */
  private async createCheckpoint(
    ctx: ProjectContext,
    iteration: number,
    gaps: Gap[],
    convergenceState: ConvergenceState,
  ): Promise<string> {
    const checkpointId = `checkpoint-${ctx.epicId}-${iteration}`;

    // Build cursor from execution stack
    const cursor = this.buildCursorFromContext(ctx);

    if (!cursor) {
      ctx.log.warn("No execution stack available, skipping checkpoint");
      return checkpointId;
    }

    // Get completed tasks
    const completedTasks = this.storage
      .listTasks(ctx.epicId)
      .filter((taskId) =>
        this.statusManager.isTaskCompleted(ctx.epicId, taskId),
      );

    const checkpoint: Checkpoint = {
      version: 3,
      id: checkpointId,
      timestamp: new Date().toISOString(),
      cursor,
      context: {
        iteration,
        completedUnits: completedTasks,
        rootPath: ctx.executionStack?.[0]?.filePath || "",
      },
      metadata: {
        created: new Date().toISOString(),
        machine: process.env.HOSTNAME || "unknown",
      },
    };

    this.storage.writeCheckpoint(checkpoint);
    ctx.log.debug(`Checkpoint created: ${checkpointId} (v3 simplified)`);
    return checkpointId;
  }

  /**
   * Build cursor from execution context
   */
  private buildCursorFromContext(ctx: ProjectContext): Cursor | undefined {
    if (!ctx.executionStack || ctx.executionStack.length === 0) {
      return undefined;
    }

    return {
      path: ctx.executionStack.map((level) => level.id),
      breadcrumbs: ctx.executionStack.map((level) => ({
        id: level.id,
        type: level.type,
        filePath: level.filePath,
        depth: level.depth,
      })),
      depth: ctx.executionStack.length - 1,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Function                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create a new convergence orchestrator
 */
export function createConvergenceOrchestrator(
  storage: FilesystemStorage,
  statusManager: StatusManager,
  hooks?: HookRegistry,
): ConvergenceOrchestrator {
  return new ConvergenceOrchestrator(storage, statusManager, hooks);
}
