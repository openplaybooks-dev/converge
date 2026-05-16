/**
 * Seed AI ask helper — backs `ctx.ai.ask(question)` and `ctx.ai.askJson()`.
 *
 * Two entry points share a base prompt (project dir, task id/title, the
 * question, and READONLY_TOOLS) and differ only in how the model is asked
 * to respond:
 *   - `boolean ask`: model returns `{ answer: boolean, reasoning: string }`,
 *     we surface only `answer`. Lazy: the agent is only invoked when the
 *     caller awaits the result, so a Seed that calls `ctx.ai.ask(...)` but
 *     doesn't await pays nothing.
 *   - `askJson`: caller supplies a zod schema, model returns a value of that
 *     shape, the parsed object is returned directly.
 *
 * Extracted from seed-executor.ts so that file can focus on the seed
 * execution lifecycle rather than AI plumbing. Public AskResult shape is
 * unchanged.
 */
import { dirname, join } from "node:path";
import { z } from "zod";
import { agentfn } from "@converge/agentfn";

import { READONLY_TOOLS } from "../ai/context.ts";
import type { AskResult } from "../config/task-definition.ts";
import type { JournalContext } from "../navigator/repair/types.ts";

export interface SeedAiAskContext {
  projectDir: string;
  taskId: string;
  taskTitle?: string;
  taskFilePath?: string;
  journalCtx: JournalContext;
}

function getAiLogDir(ctx: SeedAiAskContext): string {
  return ctx.taskFilePath
    ? join(
        ctx.taskFilePath.endsWith("/TASK.md")
          ? dirname(ctx.taskFilePath)
          : ctx.taskFilePath,
        "logs",
      )
    : join(
        ctx.projectDir,
        ".converge",
        "journal",
        ctx.journalCtx.epicId,
        "tasks",
        ctx.journalCtx.taskId,
        "logs",
      );
}

function basePrompt(ctx: SeedAiAskContext, question: string): string {
  return `You are analyzing a project to help break down work into subtasks.

PROJECT DIRECTORY: ${ctx.projectDir}
TASK: ${ctx.taskTitle ?? ctx.taskId}

QUESTION: ${question}

Use the available tools (Read, Glob) to inspect the project files and answer the question.`;
}

const AskSchema = z.object({
  answer: z.boolean(),
  reasoning: z.string(),
});

/**
 * Schema-validated AI call (also the impl backing AskResult.asJson).
 */
export function runAiJson<T>(
  ctx: SeedAiAskContext,
  question: string,
  schema: import("zod").ZodType<T>,
): Promise<T> {
  const logDir = getAiLogDir(ctx);
  const prompt =
    basePrompt(ctx, question) +
    "\n\nReturn a JSON object matching the requested schema.";

  const executor = agentfn<T>({
    prompt,
    schema,
    allowedTools: [...READONLY_TOOLS],
    timeoutMs: 120_000,
    cwd: ctx.projectDir,
    logDir,
  });

  return executor().then((r) => r.data);
}

/**
 * Build a lazy AskResult — agent is not invoked until `.then()` runs.
 */
export function buildAiAsk(
  ctx: SeedAiAskContext,
  question: string,
): AskResult {
  const logDir = getAiLogDir(ctx);

  let booleanPromise: Promise<boolean> | null = null;
  const getBooleanPromise = (): Promise<boolean> => {
    if (!booleanPromise) {
      booleanPromise = (async (): Promise<boolean> => {
        const executor = agentfn<{ answer: boolean; reasoning: string }>({
          prompt:
            basePrompt(ctx, question) +
            "\n\nReturn a JSON object:\n- answer: true if the condition is fully met, false otherwise\n- reasoning: brief explanation (1-2 sentences)",
          schema: AskSchema,
          allowedTools: [...READONLY_TOOLS],
          timeoutMs: 60_000,
          cwd: ctx.projectDir,
          logDir,
        });

        try {
          const result = await executor();
          return result.data.answer;
        } catch {
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
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => getBooleanPromise().then(onfulfilled, onrejected),

    asJson: <T>(schema: import("zod").ZodType<T>): Promise<T> =>
      runAiJson(ctx, question, schema),
  };
}
