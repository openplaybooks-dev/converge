/**
 * Loop Function Executor
 *
 * Runs a user-defined loop handler function iteratively.
 * Each ctx.loop.spawn() call invokes a SKILL.md via claudefn
 * and is journaled as a subtask entry in the task's todo.md.
 *
 * Usage: triggered by Unit.fixGaps() when taskDef.loopFn is set.
 */

import { agentfn } from "@openplaybooks/agentfn";
import { READONLY_TOOLS } from "../ai/context.ts";
import { join } from "node:path";
import { z } from "zod";
import {
  LOOP_DONE_SIGNAL,
  isBuilderTarget,
  isPathRefTarget,
  isTaskDefFactory,
  isInlineTaskTarget,
  type LoopFn,
  type LoopContext,
  type LoopDoneSignal,
  type LoopSpawnTarget,
  type AskResult,
  type TaskHandle,
  type SpawnOptions,
  type SpawnResult,
} from "../config/task-definition.ts";
import type { JournalContext } from "../navigator/repair/types.ts";
import {
  logTaskEvent,
  writeTaskStatus,
  writeTaskTodo,
} from "../journal/writer.ts";
import { getJournalStructure } from "../journal/structure.ts";
import type { TaskStatus, ChecklistItem } from "../journal/types.ts";
import { SpawnRunner } from "./spawn-runner.ts";
import type { SpawnState, WriteStatusOpts } from "./spawn-runner.ts";

/* ------------------------------------------------------------------ */
/*  Result type                                                       */
/* ------------------------------------------------------------------ */

export interface LoopResult {
  /** How many iterations the handler function was called */
  iterationsRun: number;
  /** True when the handler returned ctx.loop.done() */
  done: boolean;
  /** True when stopped by iteration limit without done */
  maxReached: boolean;
}

/* ------------------------------------------------------------------ */
/*  Done-condition evaluator schema                                   */
/* ------------------------------------------------------------------ */

const AskSchema = z.object({
  answer: z.boolean(),
  reasoning: z.string(),
});

/* ------------------------------------------------------------------ */
/*  Loop Function Executor                                            */
/* ------------------------------------------------------------------ */

export class LoopFunctionExecutor {
  private projectDir: string;
  private journalCtx: JournalContext;
  private spawnRunner: SpawnRunner;

  constructor(projectDir: string, journalCtx: JournalContext) {
    this.projectDir = projectDir;
    this.journalCtx = journalCtx;
    this.spawnRunner = new SpawnRunner(
      projectDir,
      journalCtx,
      () => this.getLogDir(),
      (opts: WriteStatusOpts) => this.writeStatus(opts),
    );
  }

  /**
   * Run the loop by calling loopFn on each iteration.
   * Stops when fn returns ctx.loop.done() or the hardcoded limit is reached.
   */
  async run(loopFn: LoopFn, _maxIterations?: number): Promise<LoopResult> {
    // Default cap: small enough that buggy never-done loops surface quickly
    // in tests/dev; production callers always pass a real cap.
    const maxIterations = _maxIterations ?? 20;
    const startedAt = new Date().toISOString();
    const checklist: ChecklistItem[] = [];
    // Track spawn count across all iterations for unique subtask IDs
    let spawnCounter = 0;
    // Queue: taskId → { target, opts } — persists across iterations within one run()
    let enqueueCounter = 0;
    const taskQueue = new Map<
      string,
      { target: LoopSpawnTarget; opts?: SpawnOptions }
    >();

    await this.writeStatus({ status: "running", startedAt, checklist });

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      console.log(`\n🔄 Loop iteration ${iteration}`);

      await logTaskEvent(
        this.projectDir,
        this.journalCtx.epicId,
        this.journalCtx.taskId,
        "TASK_START",
        `Loop iteration ${iteration}`,
        { iteration },
      );

      // Build context for this iteration
      const ctx: LoopContext = {
        projectDir: this.projectDir,
        loop: {
          isInitial: iteration === 1,
          iteration,
          done: () => LOOP_DONE_SIGNAL,
          continue: () => undefined,
          next: () => undefined,
          spawn: async (
            target: LoopSpawnTarget,
            opts?: SpawnOptions,
          ): Promise<SpawnResult> => {
            spawnCounter++;
            return this.dispatchSpawn(
              target,
              { counter: spawnCounter, checklist, startedAt },
              opts,
            );
          },
          await: async (taskId: string): Promise<SpawnResult> => {
            const queued = taskQueue.get(taskId);
            if (!queued) {
              throw new Error(
                `ctx.loop.await: no task found for id '${taskId}'. ` +
                  `Use ctx.enqueue() first to register the task.`,
              );
            }
            taskQueue.delete(taskId);
            spawnCounter++;
            return this.dispatchSpawn(
              queued.target,
              { counter: spawnCounter, checklist, startedAt },
              queued.opts,
            );
          },
        },
        enqueue: (target: LoopSpawnTarget, opts?: SpawnOptions): TaskHandle => {
          enqueueCounter++;
          const id = `task-${iteration}-${enqueueCounter}`;
          taskQueue.set(id, { target, opts });
          console.log(`   📥 Enqueued task ${id}`);
          return { id };
        },
        ai: {
          ask: (question: string) => this.aiAsk(question, iteration),
        },
      };

      let signal: LoopDoneSignal | void;
      try {
        signal = await loopFn(ctx);
      } catch (error: any) {
        console.log(`   ❌ Iteration ${iteration} failed: ${error.message}`);
        await logTaskEvent(
          this.projectDir,
          this.journalCtx.epicId,
          this.journalCtx.taskId,
          "TASK_FAILED",
          `Loop iteration ${iteration} threw: ${error.message}`,
          { iteration, error: error.message },
        );
        await this.writeStatus({
          status: "failed",
          startedAt,
          completedAt: new Date().toISOString(),
          checklist,
          error: error.message,
        });
        return { iterationsRun: iteration, done: false, maxReached: false };
      }

      await logTaskEvent(
        this.projectDir,
        this.journalCtx.epicId,
        this.journalCtx.taskId,
        "TASK_COMPLETE",
        `Loop iteration ${iteration} done`,
        { iteration },
      );

      // Handler signalled done
      if (signal === LOOP_DONE_SIGNAL) {
        console.log(`   ✅ Loop complete after ${iteration} iteration(s)`);
        const completedAt = new Date().toISOString();
        await this.writeStatus({
          status: "complete",
          startedAt,
          completedAt,
          checklist,
        });
        return { iterationsRun: iteration, done: true, maxReached: false };
      }
    }

    // Max iterations reached without done
    const completedAt = new Date().toISOString();
    await this.writeStatus({
      status: "failed",
      startedAt,
      completedAt,
      checklist,
      error: `Loop did not complete after ${maxIterations} iterations`,
    });
    return { iterationsRun: maxIterations, done: false, maxReached: true };
  }

  /* ---------------------------------------------------------------- */
  /*  ctx.loop.spawn() — dispatch to SpawnRunner                    */
  /* ---------------------------------------------------------------- */

  private async dispatchSpawn(
    target: LoopSpawnTarget,
    state: SpawnState,
    opts?: SpawnOptions,
  ): Promise<SpawnResult> {
    if (typeof target === "string") {
      return this.spawnRunner.executeSpawnPath(target, state, opts);
    }
    if (isBuilderTarget(target)) {
      return this.spawnRunner.executeSpawnBuilder(target, state, opts);
    }
    if (isTaskDefFactory(target)) {
      return this.spawnRunner.executeSpawnFactory(target, state, opts);
    }
    if (isPathRefTarget(target)) {
      return this.spawnRunner.executeSpawnPathRef(target, state, opts);
    }
    if (isInlineTaskTarget(target)) {
      return this.spawnRunner.executeSpawnInline(target, state, opts);
    }
    throw new Error(
      `ctx.loop.spawn: unrecognized target type: ${JSON.stringify(target)}`,
    );
  }

  /* ---------------------------------------------------------------- */
  /*  ctx.ai.ask()                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Ask AI a yes/no question using read-only tools.
   * Returns an AskResult thenable: await for boolean, or chain .asJson(schema) for structured data.
   * Conservative: returns false on any error (keep looping).
   */
  private aiAsk(question: string, iteration: number): AskResult {
    const logDir = this.getLogDir();
    const basePrompt = `You are evaluating a condition about the current state of a project.

PROJECT DIRECTORY: ${this.projectDir}

QUESTION: ${question}

Use the available tools (Read, Glob) to inspect the project files and determine
whether the condition described in QUESTION is fully satisfied.`;

    // Lazy: only execute the boolean path when .then() is called
    let booleanPromise: Promise<boolean> | null = null;
    const getBooleanPromise = (): Promise<boolean> => {
      if (!booleanPromise) {
        booleanPromise = (async (): Promise<boolean> => {
          const phase = `ai_ask_${iteration}`;

          await logTaskEvent(
            this.projectDir,
            this.journalCtx.epicId,
            this.journalCtx.taskId,
            "CLAUDEFN_START",
            `ai.ask iteration ${iteration}`,
            { phase, question },
          );

          const evaluator = agentfn({
            prompt:
              basePrompt +
              `

Return a JSON object:
- answer: true if the condition is fully met, false otherwise
- reasoning: brief explanation (1-2 sentences)`,
            schema: AskSchema,
            allowedTools: [...READONLY_TOOLS],
            timeoutMs: 60_000,
            cwd: this.projectDir,
            logDir,
          });

          try {
            const result = await evaluator();
            await logTaskEvent(
              this.projectDir,
              this.journalCtx.epicId,
              this.journalCtx.taskId,
              "CLAUDEFN_COMPLETE",
              `ai.ask iteration ${iteration}: answer=${result.data.answer}`,
              {
                phase,
                answer: result.data.answer,
                reasoning: result.data.reasoning,
                durationMs: result.durationMs,
              },
            );
            return result.data.answer;
          } catch (error: any) {
            await logTaskEvent(
              this.projectDir,
              this.journalCtx.epicId,
              this.journalCtx.taskId,
              "CLAUDEFN_FAILED",
              `ai.ask iteration ${iteration} failed: ${error.message}`,
              { phase, error: error.message },
            );
            // Conservative: keep looping rather than stopping on evaluation error
            return false;
          }
        })();
      }
      return booleanPromise;
    };

    return {
      then: <TResult1 = boolean, TResult2 = never>(
        onfulfilled?:
          | ((value: boolean) => TResult1 | PromiseLike<TResult1>)
          | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
      ) => getBooleanPromise().then(onfulfilled, onrejected),

      asJson: <T>(schema: import("zod").ZodType<T>): Promise<T> => {
        const phase = `ai_ask_json_${iteration}`;

        return (async () => {
          console.log(
            `   🤖 Evaluating: ${question.slice(0, 80)}${question.length > 80 ? "…" : ""}`,
          );
          await logTaskEvent(
            this.projectDir,
            this.journalCtx.epicId,
            this.journalCtx.taskId,
            "CLAUDEFN_START",
            `ai.ask.asJson iteration ${iteration}`,
            { phase, question },
          );

          const evaluator = agentfn<T>({
            prompt:
              basePrompt +
              `

Return a JSON object matching the requested schema.`,
            schema,
            allowedTools: [...READONLY_TOOLS],
            timeoutMs: 60_000,
            cwd: this.projectDir,
            logDir,
          });

          try {
            const result = await evaluator();
            await logTaskEvent(
              this.projectDir,
              this.journalCtx.epicId,
              this.journalCtx.taskId,
              "CLAUDEFN_COMPLETE",
              `ai.ask.asJson iteration ${iteration} done in ${result.durationMs}ms`,
              { phase, durationMs: result.durationMs },
            );
            return result.data;
          } catch (error: any) {
            await logTaskEvent(
              this.projectDir,
              this.journalCtx.epicId,
              this.journalCtx.taskId,
              "CLAUDEFN_FAILED",
              `ai.ask.asJson iteration ${iteration} failed: ${error.message}`,
              { phase, error: error.message },
            );
            throw error;
          }
        })();
      },
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                         */
  /* ---------------------------------------------------------------- */

  private async writeStatus(opts: {
    status: TaskStatus["status"];
    startedAt: string;
    completedAt?: string;
    checklist: ChecklistItem[];
    error?: string;
  }): Promise<void> {
    const { epicId, taskId } = this.journalCtx;

    const status: TaskStatus = {
      taskId,
      epicId,
      focusPath: `${epicId}/${taskId}`,
      status: opts.status,
      startedAt: opts.startedAt,
      completedAt: opts.completedAt,
      durationMs: opts.completedAt
        ? new Date(opts.completedAt).getTime() -
          new Date(opts.startedAt).getTime()
        : undefined,
      attempt: 1,
      gapsResolved:
        opts.status === "complete"
          ? opts.checklist.filter((i) => i.done).length
          : 0,
      gapsFailed: opts.status === "failed" ? 1 : 0,
      error: opts.error,
      checklist: opts.checklist,
    };

    await writeTaskStatus(this.projectDir, epicId, taskId, status);
    await writeTaskTodo(this.projectDir, epicId, taskId, status);
  }

  private getLogDir(): string {
    const { epicId, taskId } = this.journalCtx;
    const structure = getJournalStructure(this.projectDir, epicId, taskId);
    return join(structure.attempt ?? structure.task!, "logs");
  }
}
