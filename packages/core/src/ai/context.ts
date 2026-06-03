/**
 * AI Context Layer
 *
 * Provides a clean abstraction over the agentfn wrapper for AI-driven
 * repair strategies. Handles:
 *   - Structured JSON responses with schema validation
 *   - Boolean yes/no decisions
 *   - Text analysis and reasoning extraction
 *   - Error handling and retries
 *
 * All repair strategies should use this instead of calling runAgent directly
 * for consistency and better error handling.
 */

import { z } from "zod";
import type { AgentFnResult } from "@openplaybooks/agentfn";
import {
  runAgent,
  type AgentRunOptions,
} from "../navigator/repair/agent-runner.ts";
import type { JournalContext } from "../navigator/repair/types.ts";

/** Read-only tools: inspect files and search content without writing anything. */
export const READONLY_TOOLS = ["Read", "Glob", "Grep"] as const;

/* ------------------------------------------------------------------ */
/*  AI Response wrapper                                               */
/* ------------------------------------------------------------------ */

export class AIResponse<T = string> {
  constructor(private readonly result: AgentFnResult<T>) {}

  /**
   * Get the raw text response
   */
  asText(): string {
    if (typeof this.result.data === "string") {
      return this.result.data;
    }
    return this.result.raw || "";
  }

  /**
   * Parse response as JSON
   * Handles markdown code blocks (```json ... ```)
   */
  asJson<J = T>(): J {
    const text = this.asText();

    // Try to extract JSON from markdown code blocks (any language tag)
    const jsonBlockMatch = text.match(
      /```(?:json|typescript|ts|javascript|js)?\s*\n([\s\S]*?)\n```/,
    );
    if (jsonBlockMatch) {
      return JSON.parse(jsonBlockMatch[1]) as J;
    }

    // Try to find JSON object in text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as J;
    }

    // Try to parse the entire response
    try {
      return JSON.parse(text) as J;
    } catch (err) {
      throw new Error(
        `Failed to parse AI response as JSON: ${text.slice(0, 200)}`,
      );
    }
  }

  /**
   * Parse response as boolean (yes/no question)
   */
  asBool(): boolean {
    const text = this.asText().toLowerCase().trim();
    return text.startsWith("yes") || text.startsWith("true");
  }

  /**
   * Extract reasoning from structured response
   * Looks for "Reasoning:" or "Analysis:" sections
   */
  getReasoning(): string {
    const text = this.asText();

    const reasoningMatch = text.match(
      /(?:Reasoning|Analysis):\s*([\s\S]*?)(?:\n\n|$)/i,
    );
    if (reasoningMatch) {
      return reasoningMatch[1].trim();
    }

    return "";
  }

  /**
   * Get the raw AgentFnResult for advanced usage
   */
  getRaw(): AgentFnResult<T> {
    return this.result;
  }
}

/* ------------------------------------------------------------------ */
/*  AI Context                                                        */
/* ------------------------------------------------------------------ */

export class AIContext {
  constructor(
    private readonly projectDir: string,
    private readonly journalCtx?: JournalContext,
  ) {}

  /**
   * Ask the AI a question and get a raw response
   *
   * @param prompt - The prompt text
   * @param options - Optional configuration
   */
  async ask<T = string>(
    prompt: string,
    options?: {
      phase?: string;
      label?: string;
      allowedTools?: string[];
      timeoutMs?: number;
      schema?: z.ZodSchema<T>;
    },
  ): Promise<AIResponse<T>> {
    const agentOptions: AgentRunOptions = {
      phase: options?.phase || "analysis",
      prompt,
      agentOptions: {
        schema: options?.schema,
        allowedTools: options?.allowedTools || [...READONLY_TOOLS],
        timeoutMs: options?.timeoutMs || 120_000,
      },
      projectDir: this.projectDir,
      journalCtx: this.journalCtx,
      label: options?.label,
      agentName: "ai-repair",
    };

    const result = await runAgent<T>(agentOptions);
    return new AIResponse<T>(result);
  }

  /**
   * Ask the AI a question and parse response as JSON with schema validation
   *
   * @param prompt - The prompt text
   * @param schema - Zod schema for validation
   * @param options - Optional configuration
   */
  async askJson<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: {
      phase?: string;
      label?: string;
      allowedTools?: string[];
      timeoutMs?: number;
    },
  ): Promise<T> {
    const response = await this.ask(prompt, { ...options, schema });
    const parsed = response.asJson<T>();

    // Validate with zod schema
    try {
      return schema.parse(parsed);
    } catch (err) {
      console.error(`Schema validation failed for AI response`);
      console.error(`Parsed JSON:`, JSON.stringify(parsed, null, 2));
      console.error(`Validation error:`, err);
      throw err;
    }
  }

  /**
   * Ask the AI a yes/no question
   *
   * @param prompt - The prompt text (should be a yes/no question)
   * @param options - Optional configuration
   */
  async askBool(
    prompt: string,
    options?: {
      phase?: string;
      label?: string;
      timeoutMs?: number;
    },
  ): Promise<boolean> {
    const response = await this.ask(prompt, options);
    return response.asBool();
  }

  /**
   * Create a child context for a specific task
   * Useful when spawning sub-tasks or gap-fixers
   */
  withJournalContext(journalCtx: JournalContext): AIContext {
    return new AIContext(this.projectDir, journalCtx);
  }
}

/* ------------------------------------------------------------------ */
/*  Factory helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Create an AI context from strategy context
 */
export function createAIContext(
  projectDir: string,
  journalCtx?: JournalContext,
): AIContext {
  return new AIContext(projectDir, journalCtx);
}
