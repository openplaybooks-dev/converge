import type { ZodType } from "zod";
import type { GlobalQueue, GlobalQueueOptions } from "./queue.js";

// ─── Prompt ────────────────────────────────────────────────

/** A prompt can be a static string template or a function receiving the input */
export type PromptInput = string | ((input?: string) => string);

// ─── Hooks ─────────────────────────────────────────────────

/** Hooks that fire at various points in the kimifn lifecycle */
export interface KimiFnHooks {
  /** Called before the request is sent. Can modify the prompt or abort. */
  before?: (ctx: { prompt: string }) => string | void | Promise<string | void>;
  /** Called after the response completes. Receives raw text. */
  after?: (ctx: { result: string; durationMs: number }) => void | Promise<void>;
  /** Called with each chunk of streaming text data */
  onStream?: (chunk: string) => void;
}

// ─── kimifn() Types ──────────────────────────────────────

/** Options passed to kimifn() to create a callable function */
export interface KimiFnOptions<T = string> {
  /**
   * Static string with {{input}} placeholder, or a function `(input?) => string`.
   * Optional — if omitted, the input argument is used as the full prompt.
   */
  prompt?: PromptInput;
  /** Zod schema to validate & parse the output (e.g. z.object({...})) */
  schema?: ZodType<T>;
  /** Lifecycle hooks */
  hooks?: KimiFnHooks;
  /** Max time in ms before aborting (default: 120_000) */
  timeoutMs?: number;
  /** Maximum retries on failure (default: 0) */
  maxRetries?: number;
  /** Working directory for the process */
  cwd?: string;
  /**
   * Global queue for cross-process rate limiting and concurrency control.
   * Pass a GlobalQueue instance, options to create one, or `true` to use the
   * default singleton queue. Pass `false` or omit to disable queuing.
   */
  queue?: GlobalQueue | GlobalQueueOptions | boolean;
  /** Extra CLI flags passed to `kimi` */
  cliFlags?: string[];
}

/** The result returned by a kimifn invocation */
export interface KimiFnResult<T = string> {
  /** Parsed data (typed via schema) or raw string if no schema */
  data: T;
  /** Raw text output */
  raw: string;
  /** Duration in milliseconds */
  durationMs: number;
}

/** A callable function created by kimifn() */
export type KimiFn<T = string> = (
  input?: string,
) => Promise<KimiFnResult<T>>;

// ─── Composition Types ─────────────────────────────────────

/** A tool that can be called by a composed function */
export interface ToolDef {
  /** The kimifn to invoke when this tool is called */
  fn: KimiFn<any>;
  /** Description shown to Kimi so it knows when to use this tool */
  description: string;
}

/** Extended hooks for composed functions */
export interface ComposeHooks extends KimiFnHooks {
  /** Called after each tool invocation with the tool name, input, and result */
  onToolCall?: (ctx: {
    name: string;
    input: string;
    result: KimiFnResult<any>;
  }) => void | Promise<void>;
}

/** Options for compose() */
export interface ComposeOptions<T = string> {
  /** Static string with {{input}} placeholder, or a function `(input?) => string` */
  prompt: PromptInput;
  /** Map of tool name → tool definition */
  tools: Record<string, ToolDef>;
  /**
   * Composition mode:
   * - `"code"` (default): Kimi writes a Node.js async function body that calls the
   *   injected tools directly. The code is executed with tools available as named
   *   async functions. Supports full JS control flow (loops, conditionals, etc.).
   * - `"tool_call"`: Kimi uses `<tool_call>` XML blocks to invoke tools.
   *   The system parses these, executes the tools, feeds results back in a loop.
   */
  composeMode?: "code" | "tool_call";
  /** Zod schema to validate & parse the final output */
  schema?: ZodType<T>;
  /** Lifecycle hooks (extended with onToolCall) */
  hooks?: ComposeHooks;
  /** Max time per invocation in ms (default: 120_000) */
  timeoutMs?: number;
  /** Maximum retries on failure (default: 0) */
  maxRetries?: number;
  /** Maximum iterations (tool-call rounds or code-fix retries) before returning (default: 10) */
  maxIterations?: number;
  /** Working directory */
  cwd?: string;
  /**
   * Global queue for cross-process rate limiting and concurrency control.
   */
  queue?: GlobalQueue | GlobalQueueOptions | boolean;
  /** Extra CLI flags passed to `kimi` */
  cliFlags?: string[];
}
