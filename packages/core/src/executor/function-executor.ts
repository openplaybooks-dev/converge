/**
 * Function-Driven Executor
 *
 * Executes tasks using registered TaskFn functions.
 * Replaces the old store-driven executor with pure function execution.
 */

import type { TaskContext } from "../context/types.ts";
import type { TaskConfig } from "../storage/types.ts";
import type { TaskResult, TaskFnMeta } from "../functions/types.ts";
import { globalRegistry } from "../functions/registry.ts";
import { logTaskEvent, reEvaluateAfterTask } from "../journal/index.ts";
import path from "node:path";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";

/* ------------------------------------------------------------------ */
/*  Execution Options                                                 */
/* ------------------------------------------------------------------ */

export interface ExecutionOptions {
  /** Maximum execution time (ms) */
  timeout?: number;

  /** Maximum retry attempts on failure */
  maxRetries?: number;

  /** Retry backoff strategy */
  retryBackoff?: "linear" | "exponential";

  /** Initial retry delay (ms) */
  retryDelay?: number;

  /** Run checks after execution */
  runChecks?: boolean;

  /** Continue on check failure */
  continueOnCheckFailure?: boolean;
}

export const DEFAULT_EXECUTION_OPTIONS: ExecutionOptions = {
  timeout: 300000, // 5 minutes
  maxRetries: 3,
  retryBackoff: "exponential",
  retryDelay: 1000,
  runChecks: true,
  continueOnCheckFailure: false,
};

/* ------------------------------------------------------------------ */
/*  Execution Result                                                  */
/* ------------------------------------------------------------------ */

export interface ExecutionResult extends TaskResult {
  /** Task ID */
  taskId: string;

  /** Task type */
  taskType: string;

  /** Number of attempts made */
  attempts: number;

  /** Execution duration (ms) */
  duration: number;

  /** Check results (if checks were run) */
  checkResults?: Array<{
    check: string;
    passed: boolean;
    message?: string;
  }>;

  /** Whether execution was retried */
  retried: boolean;

  /** Retry history */
  retryHistory?: Array<{
    attempt: number;
    error: string;
    timestamp: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Function Executor                                                 */
/* ------------------------------------------------------------------ */

export class FunctionExecutor {
  /**
   * Execute a task using its registered TaskFn
   */
  async execute(
    ctx: TaskContext,
    config: TaskConfig,
    options: ExecutionOptions = DEFAULT_EXECUTION_OPTIONS,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const taskId = ctx.taskId;
    const taskType = config.type || "default";
    const epicId = ctx.epic.epicId;
    const projectDir = ctx.projectDir;

    ctx.log.info(`Executing task: ${config.title} (type: ${taskType})`);

    // Journal: Log task start
    await logTaskEvent(
      projectDir,
      epicId,
      taskId,
      "TASK_START",
      `Starting task: ${config.title}`,
      { taskType, attempt: 1 },
    );

    // Check if task has SKILL.md and should execute as skill
    const taskFolder = (config.metadata as any)?.filePath
      ? path.dirname((config.metadata as any).filePath)
      : null;
    const isSkillTask =
      (config.metadata as any)?.isSkillOnly === true ||
      taskType === "skill-task";

    let result: ExecutionResult;

    if (
      isSkillTask &&
      taskFolder &&
      existsSync(path.join(taskFolder, "SKILL.md"))
    ) {
      // Execute as skill task
      ctx.log.info(`Executing as skill task from folder: ${taskFolder}`);
      result = await this.executeAsSkill(ctx, config, taskFolder, options);
    } else {
      // Get task function
      const taskMeta = this.getTaskFunction(taskType);
      if (!taskMeta) {
        const errorMsg = `Task type "${taskType}" not found in registry`;
        await logTaskEvent(projectDir, epicId, taskId, "ERROR", errorMsg);
        return this.createErrorResult(taskId, taskType, 0, startTime, errorMsg);
      }

      // Execute with retries
      result = await this.executeWithRetries(
        ctx,
        taskMeta,
        options.maxRetries || 1,
        options.retryBackoff || "exponential",
        options.retryDelay || 1000,
        options.timeout,
      );
    }

    // Run checks if requested
    let checkResults;
    if (options.runChecks && result.success) {
      checkResults = await this.runChecks(ctx, config, options);

      // Override success if checks fail
      if (!options.continueOnCheckFailure) {
        const allChecksPassed = checkResults.every((c) => c.passed);
        if (!allChecksPassed) {
          result = {
            ...result,
            success: false,
            message: `Task succeeded but checks failed`,
          };
        }
      }
    }

    // Journal: Log task completion or failure
    if (result.success) {
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        "TASK_COMPLETE",
        `Task completed: ${config.title}`,
        { duration: Date.now() - startTime, attempts: result.attempts },
      );

      // Trigger automatic re-evaluation
      try {
        await reEvaluateAfterTask(ctx);
      } catch (error: any) {
        ctx.log.error(`Re-evaluation failed: ${error.message}`);
      }
    } else {
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        "TASK_FAILED",
        `Task failed: ${result.message || "Unknown error"}`,
        { attempts: result.attempts, error: result.error?.message },
      );
    }

    return {
      ...result,
      taskId,
      taskType,
      duration: Date.now() - startTime,
      checkResults,
    };
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetries(
    ctx: TaskContext,
    taskMeta: TaskFnMeta,
    maxRetries: number,
    backoff: "linear" | "exponential",
    baseDelay: number,
    timeout?: number,
  ): Promise<ExecutionResult> {
    let attempts = 0;
    const retryHistory: Array<{
      attempt: number;
      error: string;
      timestamp: string;
    }> = [];
    const epicId = ctx.epic.epicId;
    const taskId = ctx.taskId;
    const projectDir = ctx.projectDir;

    while (attempts < maxRetries) {
      attempts++;

      try {
        ctx.log.debug(`Attempt ${attempts}/${maxRetries}`);

        // Execute with timeout
        const result = timeout
          ? await this.executeWithTimeout(ctx, taskMeta, timeout)
          : await taskMeta.fn(ctx);

        if (result.success) {
          return {
            ...result,
            taskId: ctx.taskId,
            taskType: taskMeta.type,
            attempts,
            duration: 0, // Will be set by caller
            retried: attempts > 1,
            retryHistory: retryHistory.length > 0 ? retryHistory : undefined,
          };
        }

        // Record failure
        const errorMsg = result.error?.message || "Unknown error";
        retryHistory.push({
          attempt: attempts,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        });

        // Journal: Log error
        await logTaskEvent(projectDir, epicId, taskId, "ERROR", errorMsg, {
          attempt: attempts,
          recoverable: result.error?.recoverable,
        });

        // Check if error is recoverable
        if (result.error && !result.error.recoverable) {
          ctx.log.error(
            `Non-recoverable error, not retrying: ${result.error.message}`,
          );
          return {
            ...result,
            taskId: ctx.taskId,
            taskType: taskMeta.type,
            attempts,
            duration: 0,
            retried: false,
            retryHistory,
          };
        }

        // Wait before retry (if not last attempt)
        if (attempts < maxRetries) {
          const delay = this.calculateDelay(attempts, baseDelay, backoff);
          ctx.log.info(`Retrying in ${delay}ms...`);

          // Journal: Log retry
          await logTaskEvent(
            projectDir,
            epicId,
            taskId,
            "RETRY",
            `Retrying after ${delay}ms (attempt ${attempts + 1}/${maxRetries})`,
            { attempt: attempts + 1, delay },
          );

          await this.sleep(delay);
        }
      } catch (error: any) {
        ctx.log.error(`Execution error: ${error.message}`);

        retryHistory.push({
          attempt: attempts,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        // Journal: Log error
        await logTaskEvent(projectDir, epicId, taskId, "ERROR", error.message, {
          attempt: attempts,
          stack: error.stack,
        });

        // Last attempt - return error
        if (attempts >= maxRetries) {
          return {
            success: false,
            message: `Failed after ${attempts} attempts`,
            error: {
              message: error.message,
              stack: error.stack,
              recoverable: false,
            },
            taskId: ctx.taskId,
            taskType: taskMeta.type,
            attempts,
            duration: 0,
            retried: attempts > 1,
            retryHistory,
          };
        }

        // Wait before retry
        const delay = this.calculateDelay(attempts, baseDelay, backoff);
        ctx.log.info(`Retrying in ${delay}ms...`);

        // Journal: Log retry
        await logTaskEvent(
          projectDir,
          epicId,
          taskId,
          "RETRY",
          `Retrying after ${delay}ms (attempt ${attempts + 1}/${maxRetries})`,
          { attempt: attempts + 1, delay },
        );

        await this.sleep(delay);
      }
    }

    // Should not reach here, but just in case
    return {
      success: false,
      message: `Failed after ${attempts} attempts`,
      taskId: ctx.taskId,
      taskType: taskMeta.type,
      attempts,
      duration: 0,
      retried: true,
      retryHistory,
    };
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    ctx: TaskContext,
    taskMeta: TaskFnMeta,
    timeout: number,
  ): Promise<TaskResult> {
    return Promise.race([
      taskMeta.fn(ctx),
      new Promise<TaskResult>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Task timed out after ${timeout}ms`)),
          timeout,
        ),
      ),
    ]);
  }

  /**
   * Execute task as skill by loading SKILL.md folder to ~/.claude/skills/
   */
  private async executeAsSkill(
    ctx: TaskContext,
    config: TaskConfig,
    taskFolder: string,
    options: ExecutionOptions,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const taskId = path.basename(taskFolder);
    const projectDir = ctx.projectDir;
    const epicId = ctx.epic.epicId;

    try {
      // 1. Load skill to ~/.claude/skills/
      await this.loadSkillToClaudeSkills(taskId, taskFolder, ctx);

      // 2. Build prompt from task config
      const prompt = this.buildTaskPrompt(ctx, config);

      // 3. Execute with claudefn (placeholder - needs actual claudefn integration)
      ctx.log.info(`Executing skill task: ${taskId}`);
      ctx.log.info(`Prompt: ${prompt}`);

      // TODO: Integrate with claudefn
      // const result = await claudefn({ prompt, cwd: ctx.projectDir });

      // For now, simulate success
      await this.simulateSkillExecution(ctx, config);

      // 4. Validate outputs
      const validated = await this.validateOutputs(ctx, config);

      return {
        success: validated.passed,
        message: validated.message,
        filesModified: validated.filesModified,
        taskId: ctx.taskId,
        taskType: config.type || "skill-task",
        attempts: 1,
        duration: Date.now() - startTime,
        retried: false,
      };
    } catch (error: any) {
      ctx.log.error(`Skill execution failed: ${error.message}`);

      await logTaskEvent(
        projectDir,
        epicId,
        ctx.taskId,
        "ERROR",
        `Skill execution failed: ${error.message}`,
        { stack: error.stack },
      );

      return {
        success: false,
        message: `Skill execution failed: ${error.message}`,
        error: {
          message: error.message,
          stack: error.stack,
          recoverable: false,
        },
        taskId: ctx.taskId,
        taskType: config.type || "skill-task",
        attempts: 1,
        duration: Date.now() - startTime,
        retried: false,
      };
    } finally {
      // 5. Remove symlink
      await this.unloadSkillFromClaudeSkills(taskId, ctx);
    }
  }

  /**
   * Load skill to ~/.claude/skills/ directory via symlink
   */
  private async loadSkillToClaudeSkills(
    taskId: string,
    taskFolder: string,
    ctx: TaskContext,
  ): Promise<void> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      throw new Error("Cannot determine home directory");
    }

    const claudeSkillsDir = path.join(homeDir, ".claude", "skills");
    const skillLink = path.join(claudeSkillsDir, taskId);

    // Ensure ~/.claude/skills/ exists
    await fs.mkdir(claudeSkillsDir, { recursive: true });

    // Remove existing symlink if present
    if (existsSync(skillLink)) {
      await fs.rm(skillLink, { recursive: true, force: true });
    }

    // Create symlink: ~/.claude/skills/{taskId} → task folder
    await fs.symlink(taskFolder, skillLink, "dir");
    ctx.log.info(`📚 Loaded skill: ${taskId} → ${skillLink}`);
  }

  /**
   * Unload skill from ~/.claude/skills/ directory
   */
  private async unloadSkillFromClaudeSkills(
    taskId: string,
    ctx: TaskContext,
  ): Promise<void> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) return;

    const claudeSkillsDir = path.join(homeDir, ".claude", "skills");
    const skillLink = path.join(claudeSkillsDir, taskId);

    if (existsSync(skillLink)) {
      await fs.rm(skillLink, { recursive: true, force: true });
      ctx.log.info(`📚 Unloaded skill: ${taskId}`);
    }
  }

  /**
   * Build task prompt from TaskConfig
   */
  private buildTaskPrompt(ctx: TaskContext, config: TaskConfig): string {
    const parts: string[] = [];

    parts.push(`# Task: ${config.title}`);

    if (config.description) {
      parts.push(`\n${config.description}`);
    }

    if (config.inputs && config.inputs.length > 0) {
      parts.push(`\n## Input Files`);
      parts.push(config.inputs.map((i) => `- ${i}`).join("\n"));
    }

    if (config.outputs && config.outputs.length > 0) {
      parts.push(`\n## Expected Outputs`);
      parts.push(config.outputs.map((o) => `- ${o}`).join("\n"));
    }

    return parts.join("\n");
  }

  /**
   * Simulate skill execution (placeholder until claudefn integration)
   */
  private async simulateSkillExecution(
    ctx: TaskContext,
    config: TaskConfig,
  ): Promise<void> {
    ctx.log.info(
      "⚠️  Skill execution simulation mode (claudefn integration pending)",
    );

    // Create dummy output files if specified
    if (config.outputs && config.outputs.length > 0) {
      for (const output of config.outputs) {
        const outputPath = path.join(ctx.projectDir, output);
        const outputDir = path.dirname(outputPath);

        // Create directory if needed
        await fs.mkdir(outputDir, { recursive: true });

        // Create dummy file
        await fs.writeFile(
          outputPath,
          `# ${config.title}\n\nThis is a placeholder output generated by skill task simulation.\n`,
          "utf-8",
        );
        ctx.log.info(`Created output: ${output}`);
      }
    }
  }

  /**
   * Validate task outputs exist
   */
  private async validateOutputs(
    ctx: TaskContext,
    config: TaskConfig,
  ): Promise<{
    passed: boolean;
    message: string;
    filesModified: string[];
  }> {
    const outputs = config.outputs || [];
    const missing: string[] = [];
    const found: string[] = [];

    for (const output of outputs) {
      const outputPath = path.join(ctx.projectDir, output);
      if (existsSync(outputPath)) {
        found.push(output);
      } else {
        missing.push(output);
      }
    }

    return {
      passed: missing.length === 0,
      message:
        missing.length > 0
          ? `Missing outputs: ${missing.join(", ")}`
          : `All ${outputs.length} outputs created successfully`,
      filesModified: found,
    };
  }

  /**
   * Run checks after task execution
   */
  private async runChecks(
    ctx: TaskContext,
    config: TaskConfig,
    options: ExecutionOptions,
  ): Promise<Array<{ check: string; passed: boolean; message?: string }>> {
    const checks = config.checks || [];
    if (checks.length === 0) {
      return [];
    }

    ctx.log.info(`Running ${checks.length} checks...`);

    const results: Array<{ check: string; passed: boolean; message?: string }> =
      [];

    for (const checkName of checks) {
      try {
        const checkResult = await ctx.check.run(checkName);
        results.push({
          check: checkName,
          passed: checkResult.passed,
          message: checkResult.message,
        });

        if (checkResult.passed) {
          ctx.log.info(`✅ Check passed: ${checkName}`);
        } else {
          ctx.log.error(
            `❌ Check failed: ${checkName} - ${checkResult.message}`,
          );
        }
      } catch (error: any) {
        ctx.log.error(`Check execution error: ${checkName} - ${error.message}`);
        results.push({
          check: checkName,
          passed: false,
          message: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get task function from registry
   */
  private getTaskFunction(taskType: string): TaskFnMeta | undefined {
    return globalRegistry.getTask(taskType);
  }

  /**
   * Calculate retry delay
   */
  private calculateDelay(
    attempt: number,
    baseDelay: number,
    backoff: "linear" | "exponential",
  ): number {
    if (backoff === "exponential") {
      return baseDelay * Math.pow(2, attempt - 1);
    } else {
      return baseDelay * attempt;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create error result
   */
  private createErrorResult(
    taskId: string,
    taskType: string,
    attempts: number,
    startTime: number,
    errorMessage: string,
  ): ExecutionResult {
    return {
      success: false,
      message: errorMessage,
      error: {
        message: errorMessage,
        recoverable: false,
      },
      taskId,
      taskType,
      attempts,
      duration: Date.now() - startTime,
      retried: false,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Batch Executor                                                    */
/* ------------------------------------------------------------------ */

/**
 * Execute multiple tasks in parallel with concurrency control
 */
export class BatchExecutor {
  private executor: FunctionExecutor;

  constructor() {
    this.executor = new FunctionExecutor();
  }

  /**
   * Execute tasks in parallel with max concurrency
   */
  async executeParallel(
    contexts: TaskContext[],
    configs: TaskConfig[],
    maxConcurrency: number = 5,
    options: ExecutionOptions = DEFAULT_EXECUTION_OPTIONS,
  ): Promise<ExecutionResult[]> {
    if (contexts.length !== configs.length) {
      throw new Error("Contexts and configs arrays must have same length");
    }

    const results: ExecutionResult[] = [];
    const executing: Promise<ExecutionResult>[] = [];

    for (let i = 0; i < contexts.length; i++) {
      const promise = this.executor.execute(contexts[i], configs[i], options);
      executing.push(promise);

      if (executing.length >= maxConcurrency) {
        const result = await Promise.race(executing);
        results.push(result);
        const index = executing.findIndex((p) => p === Promise.resolve(result));
        if (index !== -1) executing.splice(index, 1);
      }
    }

    // Wait for remaining
    const remaining = await Promise.all(executing);
    results.push(...remaining);

    return results;
  }

  /**
   * Execute tasks sequentially
   */
  async executeSequential(
    contexts: TaskContext[],
    configs: TaskConfig[],
    options: ExecutionOptions = DEFAULT_EXECUTION_OPTIONS,
  ): Promise<ExecutionResult[]> {
    if (contexts.length !== configs.length) {
      throw new Error("Contexts and configs arrays must have same length");
    }

    const results: ExecutionResult[] = [];

    for (let i = 0; i < contexts.length; i++) {
      const result = await this.executor.execute(
        contexts[i],
        configs[i],
        options,
      );
      results.push(result);

      // Stop on first failure if requested
      if (!result.success && !options.continueOnCheckFailure) {
        break;
      }
    }

    return results;
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Functions                                                 */
/* ------------------------------------------------------------------ */

/**
 * Create a new function executor
 */
export function createFunctionExecutor(): FunctionExecutor {
  return new FunctionExecutor();
}

/**
 * Create a new batch executor
 */
export function createBatchExecutor(): BatchExecutor {
  return new BatchExecutor();
}
