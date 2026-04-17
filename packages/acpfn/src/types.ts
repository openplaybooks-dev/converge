import type { ZodType } from "zod";
import type { GlobalQueue, GlobalQueueOptions } from "./queue.js";
import type { Options, Query } from "@anthropic-ai/claude-agent-sdk";

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

/** Hooks that fire at various points in the acpfn lifecycle */
export interface AcpFnHooks {
  /** Called before the request is sent. Can modify the prompt or abort. */
  before?: (ctx: { prompt: string }) => string | void | Promise<string | void>;
  /** Called after the response completes. Receives raw text. */
  after?: (ctx: { result: string; durationMs: number }) => void | Promise<void>;
  /** Called with each chunk of streaming text data */
  onStream?: (chunk: string) => void;
}

// ─── acpfn() Types ──────────────────────────────────────

/** Options passed to acpfn() to create a callable function */
export interface AcpFnOptions<T = string> {
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
  hooks?: AcpFnHooks;
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
   * Restrict which tools are available, by name.
   * Example: `["Bash", "Read", "Edit"]`
   */
  allowedTools?: string[];

  /**
   * Appended to the system prompt (runs as system role — higher priority than user message).
   * Use for agent persona constraints, behavioral rules, and identity.
   */
  systemPrompt?: string;

  /**
   * Path to a .md file whose contents are appended to the system prompt.
   * Use for large context (file contents, specs) that would exceed CLI arg limits.
   */
  systemPromptFile?: string;

  /**
   * AbortSignal to cancel the running process.
   */
  signal?: AbortSignal;

  /**
   * Directory to write log files into.
   * Writes stdout/stderr and index to:
   * - `{logDir}/{timestamp}_{sessionId}.log` (full logs)
   * - `{logDir}/{timestamp}_{sessionId}.index.jsonl` (compact index)
   */
  logDir?: string;

  /**
   * Hook called immediately after the query is initialized.
   * Used by converge to register the query with AgentManager.
   * @param query The SDK Query object
   * @param logPath Path to the log file for this process
   */
  onQueryInitialized?: (query: Query, logPath: string) => void;

  // ─── SDK-specific options ───────────────────────────

  /** 
   * Additional SDK options that are passed directly to the Agent SDK.
   * These override any defaults set by acpfn.
   */
  sdkOptions?: Partial<Options>;

  /** 
   * Model to use for the session.
   * Defaults to the SDK default.
   */
  model?: string;

  /**
   * Maximum number of agentic turns (tool-use round trips) before stopping.
   */
  maxTurns?: number;

  /**
   * MCP server configurations for the session.
   */
  mcpServers?: Options["mcpServers"];

  /**
   * Enable debug mode for the SDK.
   */
  debug?: boolean;

  /**
   * Custom API key for authentication.
   * If not provided, uses ANTHROPIC_API_KEY from environment.
   */
  apiKey?: string;

  /**
   * Custom base URL for the API endpoint.
   * Use this to connect to compatible APIs (e.g., Kimi, OpenAI-compatible endpoints).
   * Example: "https://api.moonshot.cn/v1"
   */
  baseUrl?: string;
}

/** The result returned by a acpfn invocation */
export interface AcpFnResult<T = string> {
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

/** A callable function created by acpfn() */
export type AcpFn<T = string> = (
  input?: string,
) => Promise<AcpFnResult<T>>;

// ─── Composition Types ─────────────────────────────────────

/** A tool that can be called by a composed function */
export interface ToolDef {
  /** The acpfn to invoke when this tool is called */
  fn: AcpFn<any>;
  /** Description shown to Claude so it knows when to use this tool */
  description: string;
}

/** Extended hooks for composed functions */
export interface ComposeHooks extends AcpFnHooks {
  /** Called after each tool invocation with the tool name, input, and result */
  onToolCall?: (ctx: {
    name: string;
    input: string;
    result: AcpFnResult<any>;
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
   * - `"code"` (default): Claude writes a Node.js async function body that calls the
   *   injected tools directly. The code is executed with tools available as named
   *   async functions. Supports full JS control flow (loops, conditionals, etc.).
   * - `"tool_call"`: Claude uses `<tool_call>` XML blocks to invoke tools.
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
   * Restrict which tools are available, by name.
   */
  allowedTools?: string[];

  // ── SDK-specific ───────────────────────────────────

  /** 
   * Additional SDK options that are passed directly to the Agent SDK.
   */
  sdkOptions?: Partial<Options>;

  /** 
   * Model to use for the session.
   */
  model?: string;

  /** 
   * Maximum agentic turns.
   */
  maxTurns?: number;
}

// ─── Feedback Types ────────────────────────────────────────

export interface SendFeedbackOptions {
  /** Session ID from the original call */
  sessionId: string;
  /** Follow-up prompt to send */
  prompt: string;
  /** Working directory */
  cwd?: string;
  /** Max idle time in ms — resets on new output (default: 600_000) */
  timeoutMs?: number;
  /** Allowed tools for the follow-up */
  allowedTools?: string[];
  /** Log directory for this feedback session */
  logDir?: string;
  /** Additional SDK options */
  sdkOptions?: Partial<Options>;
}
