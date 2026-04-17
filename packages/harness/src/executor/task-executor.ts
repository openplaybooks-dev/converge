/**
 * Task Executor
 *
 * Runs a user-defined executor function once, providing ExecutorContext
 * with ctx.ai.fn() (returns callable AI functions), ctx.spawn() (runs
 * SKILL.md files or inline TaskDefinition child Units), and ctx.task metadata.
 *
 * Used by HarnessController which decides how many times to call run().
 */

import { READONLY_TOOLS } from '../ai/context.ts';
import { runAgent } from '../repair/agent-runner.ts';
import { join } from 'node:path';
import { z } from 'zod';
import type {
  ExecutorFn,
  ExecutorContext,
  AiFnOpts,
  AiFn,
  AskResult,
  SpawnTarget,
  SpawnOptions,
  SpawnResult,
} from '../config/task-definition.ts';
import type { JournalContext } from '../repair/types.ts';
import {
  logTaskEvent,
  writeTaskStatus,
  writeTaskTodo,
} from '../journal/writer.ts';
import { getJournalStructure } from '../journal/structure.ts';
import type { TaskStatus, ChecklistItem } from '../journal/types.ts';
import { SpawnRunner } from './spawn-runner.ts';
import type { SpawnState, WriteStatusOpts } from './spawn-runner.ts';

/* ------------------------------------------------------------------ */
/*  Result type                                                       */
/* ------------------------------------------------------------------ */

export interface TaskExecutorResult {
  success: boolean;
  durationMs: number;
  spawnCount: number;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Ask schema (for ctx.ai.ask convenience)                          */
/* ------------------------------------------------------------------ */

const AskSchema = z.object({
  answer: z.boolean(),
  reasoning: z.string(),
});

/* ------------------------------------------------------------------ */
/*  Task Executor                                                     */
/* ------------------------------------------------------------------ */

export class TaskExecutor {
  private spawnRunner: SpawnRunner;

  constructor(
    private projectDir: string,
    private journalCtx: JournalContext,
    private taskMeta: { id: string; title?: string },
    private parentUnit?: any, // Unit — dynamic import avoids circular dep
  ) {
    this.spawnRunner = new SpawnRunner(
      projectDir,
      journalCtx,
      () => this.getLogDir(),
      (opts: WriteStatusOpts) => this.writeStatus(opts),
      parentUnit,
    );
  }

  /**
   * Run the executor function once with a fresh ExecutorContext.
   * iteration is passed from HarnessController (1 in manual mode).
   */
  async run(executorFn: ExecutorFn, iteration: number): Promise<TaskExecutorResult> {
    const startedAt = new Date().toISOString();
    const spawnState: SpawnState = {
      counter: 0,
      checklist: [],
      startedAt,
    };

    const ctx = this.buildExecutorContext(iteration, spawnState);

    const start = Date.now();
    try {
      await executorFn(ctx);
      const durationMs = Date.now() - start;
      return {
        success: true,
        durationMs,
        spawnCount: spawnState.counter,
      };
    } catch (error: any) {
      const durationMs = Date.now() - start;
      return {
        success: false,
        durationMs,
        spawnCount: spawnState.counter,
        error: error.message,
      };
    }
  }

  /* ---------------------------------------------------------------- */
  /*  ExecutorContext builder                                         */
  /* ---------------------------------------------------------------- */

  private buildExecutorContext(iteration: number, spawnState: SpawnState): ExecutorContext {
    return {
      task: {
        id: this.taskMeta.id,
        title: this.taskMeta.title,
        iteration,
      },
      ai: {
        fn: <T>(opts: AiFnOpts<T>): AiFn<T> => {
          return this.buildAiFn(opts);
        },
        ask: (question: string) => this.aiAsk(question),
      },
      spawn: (target: SpawnTarget, opts?: SpawnOptions) => {
        spawnState.counter++;
        if (typeof target === 'string') {
          return this.spawnRunner.executeSpawnPath(target, spawnState, opts);
        } else {
          return this.spawnRunner.executeSpawnInline(target, spawnState, opts);
        }
      },
      projectDir: this.projectDir,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  ctx.ai.fn()                                                    */
  /* ---------------------------------------------------------------- */

  private buildAiFn<T>(opts: AiFnOpts<T>): AiFn<T> {
    const logDir = this.getLogDir();
    const label = opts.label ?? 'ai.fn';
    let callCount = 0;

    // Get event writer from global context (if running under task-runner)
    const getEventWriter = () => (global as any).__HARNESS_EVENT_WRITER__ || null;

    // Use runAgent from agent-runner.ts which reads AI config from project.yaml
    const agentOptions = {
      prompt: opts.prompt,
      schema: opts.schema,
      allowedTools: opts.allowedTools,
      timeoutMs: opts.timeoutMs ?? 60_000,
    };

    // Return the callable — each invocation logs independently
    return async (): Promise<T> => {
      callCount++;
      const phase = `${label}_${callCount}`;

      await logTaskEvent(
        this.projectDir,
        this.journalCtx.epicId,
        this.journalCtx.taskId,
        'CLAUDEFN_START',
        `${label} call ${callCount}`,
        { phase, label, callCount },
      );

      try {
        const result = await runAgent<T>({
          phase,
          prompt: opts.prompt,
          agentOptions,
          projectDir: this.projectDir,
          journalCtx: this.journalCtx,
          label: `${label}_${callCount}`,
          agentName: 'task-executor',
        });
        await logTaskEvent(
          this.projectDir,
          this.journalCtx.epicId,
          this.journalCtx.taskId,
          'CLAUDEFN_COMPLETE',
          `${label} call ${callCount} done in ${result.durationMs}ms`,
          { phase, label, callCount, durationMs: result.durationMs, sessionId: result.sessionId },
        );
        return result.data;
      } catch (error: any) {
        await logTaskEvent(
          this.projectDir,
          this.journalCtx.epicId,
          this.journalCtx.taskId,
          'CLAUDEFN_FAILED',
          `${label} call ${callCount} failed: ${error.message}`,
          { phase, label, callCount, error: error.message },
        );
        throw error;
      }
    };
  }

  /* ---------------------------------------------------------------- */
  /*  ctx.ai.ask() — convenience sugar                               */
  /* ---------------------------------------------------------------- */

  private aiAsk(question: string): AskResult {
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
          const askFn = this.buildAiFn<{ answer: boolean; reasoning: string }>({
            prompt: basePrompt + `

Return a JSON object:
- answer: true if the condition is fully met, false otherwise
- reasoning: brief explanation (1-2 sentences)`,
            schema: AskSchema,
            allowedTools: [...READONLY_TOOLS],
            timeoutMs: 60_000,
            label: 'ai.ask',
          });

          try {
            const result = await askFn();
            return result.answer;
          } catch {
            // Conservative: keep running rather than stopping on evaluation error
            return false;
          }
        })();
      }
      return booleanPromise;
    };

    return {
      then: <TResult1 = boolean, TResult2 = never>(
        onfulfilled?: ((value: boolean) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
      ) => getBooleanPromise().then(onfulfilled, onrejected),

      asJson: <T>(schema: import('zod').ZodType<T>): Promise<T> => {
        const jsonFn = this.buildAiFn<T>({
          prompt: basePrompt + `

Return a JSON object matching the requested schema.`,
          schema,
          allowedTools: [...READONLY_TOOLS],
          timeoutMs: 60_000,
          label: 'ai.ask.asJson',
        });
        return jsonFn();
      },
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                         */
  /* ---------------------------------------------------------------- */

  private async writeStatus(opts: {
    status: TaskStatus['status'];
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
        ? new Date(opts.completedAt).getTime() - new Date(opts.startedAt).getTime()
        : undefined,
      attempt: 1,
      gapsResolved: opts.status === 'complete' ? opts.checklist.filter(i => i.done).length : 0,
      gapsFailed: opts.status === 'failed' ? 1 : 0,
      error: opts.error,
      checklist: opts.checklist,
    };
    await writeTaskStatus(this.projectDir, epicId, taskId, status);
    await writeTaskTodo(this.projectDir, epicId, taskId, status);
  }

  getLogDir(): string {
    const { epicId, taskId } = this.journalCtx;
    const structure = getJournalStructure(this.projectDir, epicId, taskId);
    return join(structure.attempt ?? structure.task!, 'logs');
  }
}

