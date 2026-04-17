import type { ZodType } from "zod";
import type { GlobalQueue, GlobalQueueOptions } from "./queue.js";

// ─── Execution Mode ────────────────────────────────────────

/**
 * Interaction pattern — what behavior you get:
 * - `"call"` (default) — one-shot: send a prompt, get a result back
 * - `"stream"` — same as call, but streams output via `hooks.onStream` as it arrives
 */
export type ExecutionMode = "call" | "stream";

// ─── Prompt ────────────────────────────────────────────────

/** A prompt can be a static string template or a function receiving the input */
export type PromptInput = string | ((input?: string) => string);

// ─── Hooks ─────────────────────────────────────────────────

/** Hooks that fire at various points in the openfn lifecycle */
export interface OpenFnHooks {
  /** Called before the request is sent. Can modify the prompt or abort. */
  before?: (ctx: { prompt: string }) => string | void | Promise<string | void>;
  /** Called after the response completes. Receives raw text. */
  after?: (ctx: { result: string; durationMs: number }) => void | Promise<void>;
  /** Called with each chunk of streaming text data */
  onStream?: (chunk: string) => void;
}

// ─── openfn() Types ──────────────────────────────────────

/** Options passed to openfn() to create a callable function */
export interface OpenFnOptions<T = string> {
  /**
   * Static string with {{input}} placeholder, or a function `(input?) => string`.
   */
  prompt?: PromptInput;
  /**
   * Execution mode.
   * - `"call"` (default) — collect full output, return when done
   * - `"stream"` — stream output via `hooks.onStream` as it arrives
   */
  mode?: ExecutionMode;
  /** Zod schema to validate & parse the output (e.g. z.object({...})) */
  schema?: ZodType<T>;
  /** Lifecycle hooks */
  hooks?: OpenFnHooks;
  /** Max idle time in ms before aborting — resets on new output (default: 600_000) */
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
  /**
   * Opencode AI base URL (default: "http://localhost:4096")
   */
  baseUrl?: string;
  /**
   * Model to use for the session (e.g. "minimax/m2.5")
   */
  model?: string;
  /**
   * API key for the AI provider (e.g. MiniMax API key).
   * If provided, will be automatically configured via client.auth.set().
   * @deprecated Use providers instead for multi-provider support.
   */
  apiKey?: string;
  /**
   * Multiple AI providers supported by Opencode.
   * Each provider has its own API key and Opencode routes to the correct
   * provider based on the model string (e.g. "minimax/m2.5" uses minimax provider).
   */
  providers?: Record<string, { apiKey: string }>;
  /**
   * AbortSignal to cancel the running process.
   * When aborted, the spawned Python process is killed.
   */
  signal?: AbortSignal;
  /**
   * Directory to write log files into.
   * REQUIRED: openfn writes stdout/stderr and index to:
   * - `{logDir}/{timestamp}_{sessionId}.log` (full logs)
   * - `{logDir}/{timestamp}_{sessionId}.index.jsonl` (compact index)
   */
  logDir?: string;
  /**
   * Hook called immediately after the process is spawned.
   * Used by converge to register the process with AgentManager.
   * @param proc The spawned ChildProcess
   * @param logPath Path to the log file for this process
   */
  onProcessSpawned?: (proc: any, logPath: string) => void;
}

/** The result returned by an openfn invocation */
export interface OpenFnResult<T = string> {
  /** Parsed data (typed via schema) or raw string if no schema */
  data: T;
  /** Raw text output */
  raw: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Session ID for resuming the conversation */
  sessionId?: string;
  /** Path to the log file capturing full stdout/stderr */
  logPath?: string;
}

/** A callable function created by openfn() */
export type OpenFn<T = string> = (
  input?: string,
) => Promise<OpenFnResult<T>>;

// ─── Composition Types ─────────────────────────────────────

/** A tool that can be called by a composed function */
export interface ToolDef {
  /** The openfn to invoke when this tool is called */
  fn: OpenFn<any>;
  /** Description shown to the model so it knows when to use this tool */
  description: string;
}

/** Extended hooks for composed functions */
export interface ComposeHooks extends OpenFnHooks {
  /** Called after each tool invocation with the tool name, input, and result */
  onToolCall?: (ctx: {
    name: string;
    input: string;
    result: OpenFnResult<any>;
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
   * - `"code"` (default): The model writes a Node.js async function body that calls the
   *   injected tools directly. The code is executed with tools available as named
   *   async functions. Supports full JS control flow (loops, conditionals, etc.).
   * - `"tool_call"`: The model uses `<tool_call>` XML blocks to invoke tools.
   *   The system parses these, executes the tools, feeds results back in a loop.
   */
  composeMode?: "code" | "tool_call";
  /** Zod schema to validate & parse the final output */
  schema?: ZodType<T>;
  /** Lifecycle hooks (extended with onToolCall) */
  hooks?: ComposeHooks;
  /** Max idle time per invocation in ms — resets on new output (default: 600_000) */
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
  /**
   * Opencode AI base URL (default: "http://localhost:4096")
   */
  baseUrl?: string;
  /**
   * Model to use for the session (e.g. "minimax/m2.5")
   */
  model?: string;
  /**
   * Directory to write log files into.
   * REQUIRED: openfn writes stdout/stderr and index to:
   * - `{logDir}/{timestamp}_{sessionId}.log` (full logs)
   * - `{logDir}/{timestamp}_{sessionId}.index.jsonl` (compact index)
   */
  logDir?: string;
}
