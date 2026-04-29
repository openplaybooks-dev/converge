/**
 * AI Check Runner
 *
 * Executes a `type: "ai"` check by asking the configured AI provider to
 * verify a plain-English assertion against the workspace, and returns a
 * normalized {pass, feedback} result.
 *
 * The framework owns the full prompt scaffolding — playbook authors only
 * supply the natural-language `check:` text. The model is required to
 * reply with strict JSON `{"pass": bool, "feedback": string}`.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { extractJson } from "@converge/claudefn";
import { createAIFactory } from "../../ai/factory.ts";
import { loadConvergeConfig } from "../../config/loader.ts";
import type { AIConfig } from "../../storage/types.ts";

/**
 * Resolve the project's AI configuration from .converge/project.yaml
 * (preferred) or .converge/PROJECT.md. Returns undefined if neither
 * exposes an `ai:` section.
 *
 * Errors during config load are swallowed and surface as undefined,
 * which the caller treats as a fail-closed condition.
 */
export async function loadProjectAIConfig(
  projectDir: string,
): Promise<AIConfig | undefined> {
  const convergeDir = join(projectDir, ".converge");
  const candidates = [
    { path: join(convergeDir, "project.yaml"), type: "project.yaml" as const },
    { path: join(convergeDir, "project.yml"), type: "project.yaml" as const },
    { path: join(convergeDir, "PROJECT.md"), type: "PROJECT.md" as const },
  ];
  for (const { path, type } of candidates) {
    if (!existsSync(path)) continue;
    try {
      const config = await loadConvergeConfig(path, type);
      if (config.ai) return config.ai as AIConfig;
    } catch {
      // Swallow — caller treats missing ai as fail-closed with a clear message.
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AiCheckSpec {
  id: string;
  description?: string;
  /** The user-supplied natural-language assertion. */
  check: string;
  /** Optional provider override (selects a named entry in multi-provider config). */
  agent?: string;
  /** Optional model override. */
  model?: string;
  /** Optional per-check timeout (ms). Defaults to 120_000. */
  timeoutMs?: number;
}

export interface AiCheckContext {
  projectDir: string;
  taskId: string;
  description?: string;
  /** The resolved task prompt. */
  taskPrompt?: string;
  /** Declared output paths from the task. */
  outputs?: string[];
  /**
   * Optional run summary (file diff + tail of prior bash check stdout/stderr).
   * Provided by the after.ts callsite; omitted by find-gaps.ts.
   */
  runSummary?: {
    created?: string[];
    modified?: string[];
    deleted?: string[];
    priorStdoutTail?: string;
    priorStderrTail?: string;
  };
}

export interface AiCheckResult {
  pass: boolean;
  feedback: string;
  durationMs: number;
}

/* ------------------------------------------------------------------ */
/*  Prompt construction                                                */
/* ------------------------------------------------------------------ */

const SYSTEM_PREAMBLE = `You are an automated converge check. Inspect the workspace using your tools (Read, Bash, Grep, Glob) to verify the assertion below. Return ONLY a JSON object with exactly two fields:

{"pass": <boolean>, "feedback": <string>}

Rules:
- "pass" is true only if the assertion holds; otherwise false.
- "feedback" is a short, actionable explanation. When "pass" is false, it MUST describe the error or reason so a downstream agent can fix it.
- Output JSON only. No prose, no commentary, no code fences.`;

function formatList(label: string, items?: string[]): string {
  if (!items || items.length === 0) return "";
  return `${label}:\n${items.map((i) => `  - ${i}`).join("\n")}\n`;
}

function buildPrompt(spec: AiCheckSpec, ctx: AiCheckContext): string {
  const lines: string[] = [SYSTEM_PREAMBLE, ""];

  lines.push("## Task context");
  lines.push(`task_id: ${ctx.taskId}`);
  if (ctx.description) lines.push(`description: ${ctx.description}`);
  if (ctx.taskPrompt) {
    lines.push("task_prompt: |");
    for (const line of ctx.taskPrompt.split("\n")) lines.push(`  ${line}`);
  }
  const outputsList = formatList("declared_outputs", ctx.outputs);
  if (outputsList) lines.push(outputsList.trimEnd());
  lines.push("");

  if (ctx.runSummary) {
    lines.push("## Run summary");
    const created = formatList("created", ctx.runSummary.created);
    const modified = formatList("modified", ctx.runSummary.modified);
    const deleted = formatList("deleted", ctx.runSummary.deleted);
    if (created) lines.push(created.trimEnd());
    if (modified) lines.push(modified.trimEnd());
    if (deleted) lines.push(deleted.trimEnd());
    if (ctx.runSummary.priorStdoutTail) {
      lines.push("prior_stdout_tail: |");
      for (const line of ctx.runSummary.priorStdoutTail.split("\n"))
        lines.push(`  ${line}`);
    }
    if (ctx.runSummary.priorStderrTail) {
      lines.push("prior_stderr_tail: |");
      for (const line of ctx.runSummary.priorStderrTail.split("\n"))
        lines.push(`  ${line}`);
    }
    lines.push("");
  }

  lines.push("## Assertion to verify");
  lines.push(spec.check);

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Result parsing                                                     */
/* ------------------------------------------------------------------ */

function tryParse(raw: string): AiCheckResult | null {
  try {
    const json = extractJson(raw);
    const parsed = JSON.parse(json) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { pass?: unknown }).pass === "boolean" &&
      typeof (parsed as { feedback?: unknown }).feedback === "string"
    ) {
      const obj = parsed as { pass: boolean; feedback: string };
      return { pass: obj.pass, feedback: obj.feedback, durationMs: 0 };
    }
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

export async function runAiCheck(
  spec: AiCheckSpec,
  ctx: AiCheckContext,
  aiConfig: AIConfig | undefined,
): Promise<AiCheckResult> {
  const start = Date.now();

  const ai = createAIFactory(
    aiConfig,
    { cwd: ctx.projectDir, allowedTools: ["Read", "Bash", "Grep", "Glob"] },
    spec.agent,
  );

  if (!ai) {
    return {
      pass: false,
      feedback: `AI check "${spec.id}" requires an 'ai:' provider configuration in the project, but none was found. Add an ai: block to converge.config.json (or the project config) to use type: ai checks.`,
      durationMs: Date.now() - start,
    };
  }

  const prompt = buildPrompt(spec, ctx);

  let raw: string;
  try {
    const result = await ai.call<string>(prompt, {
      timeoutMs: spec.timeoutMs ?? 120_000,
      ...(spec.model ? { model: spec.model } : {}),
    });
    raw = String(result.data ?? "");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      pass: false,
      feedback: `AI check "${spec.id}" failed to invoke provider: ${msg}`,
      durationMs: Date.now() - start,
    };
  }

  const parsed = tryParse(raw);
  if (!parsed) {
    const tail = raw.slice(0, 200);
    return {
      pass: false,
      feedback: `LLM check parse error: ${tail}`,
      durationMs: Date.now() - start,
    };
  }

  return { ...parsed, durationMs: Date.now() - start };
}
