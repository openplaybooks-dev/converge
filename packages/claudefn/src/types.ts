import type { ZodType } from "zod";
import type { GlobalQueue, GlobalQueueOptions } from "./queue.js";

// ─── Execution Mode ────────────────────────────────────────

/**
 * Interaction pattern — what behavior you get:
 * - `"call"` (default) — one-shot: send a prompt, get a result back
 * - `"stream"` — same as call, but streams output via `hooks.onStream` as it arrives
 *   (uses `--output-format stream-json`; requires `onStream` hook to observe output)
 */
export type ExecutionMode = "call" | "stream";

// ─── Prompt ────────────────────────────────────────────────

/** A prompt can be a static string template or a function receiving the input */
export type PromptInput = string | ((input?: string) => string);

// ─── Hooks ─────────────────────────────────────────────────

/** Hooks that fire at various points in the claudefn lifecycle */
export interface ClaudeFnHooks {
  /** Called before the request is sent. Can modify the prompt or abort. */
  before?: (ctx: { prompt: string }) => string | void | Promise<string | void>;
  /** Called after the response completes. Receives raw text. */
  after?: (ctx: { result: string; durationMs: number }) => void | Promise<void>;
  /** Called with each chunk of streaming text data */
  onStream?: (chunk: string) => void;
}

// ─── claudefn() Types ──────────────────────────────────────

/** Options passed to claudefn() to create a callable function */
export interface ClaudeFnOptions<T = string> {
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
  hooks?: ClaudeFnHooks;
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
   * Passed as `--allowedTools "Tool1,Tool2"` to the CLI.
   * Example: `["Bash", "Read", "Edit"]`
   */
  allowedTools?: string[];

  /**
   * Appended to the system prompt (runs as system role — higher priority than user message).
   * Use for agent persona constraints, behavioral rules, and identity.
   * Passed as `--append-system-prompt "..."` to the CLI.
   */
  systemPrompt?: string;

  /**
   * Path to a .md file whose contents are appended to the system prompt.
   * Passed as `--append-system-prompt-file "..."` to the CLI.
   * Use for large context (file contents, specs) that would exceed CLI arg limits.
   */
  systemPromptFile?: string;

  /**
   * AbortSignal to cancel the running process.
   * When aborted, the spawned `claude` process is killed (SIGTERM).
   */
  signal?: AbortSignal;

  /**
   * Directory to write log files into.
   * REQUIRED: claudefn writes stdout/stderr and index to:
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

  // ─── CLI-specific options ───────────────────────────

  /** Extra CLI flags passed to `claude` */
  cliFlags?: string[];

  /**
   * Enable MCP (Model Context Protocol) servers configured in claude_desktop_config.json.
   * Default: false (bypasses MCP for faster startup)
   *
   * When true:
   * - Claude loads all configured MCP servers (e.g., Stitch for UI generation)
   * - Adds ~8-10 seconds to startup time for HTTP MCP servers
   * - Enables additional tools like mcp__stitch__* functions
   *
   * When false:
   * - Uses --strict-mcp-config with empty config to bypass all MCP servers
   * - Faster startup (~1-2 seconds)
   * - Only built-in Claude tools available
   */
  enableMCP?: boolean;
}

/** The result returned by a claudefn invocation */
export interface ClaudeFnResult<T = string> {
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

/** A callable function created by claudefn() */
export type ClaudeFn<T = string> = (
  input?: string,
) => Promise<ClaudeFnResult<T>>;

// ─── Composition Types ─────────────────────────────────────

/** A tool that can be called by a composed function */
export interface ToolDef {
  /** The claudefn to invoke when this tool is called */
  fn: ClaudeFn<any>;
  /** Description shown to Claude so it knows when to use this tool */
  description: string;
}

/** Extended hooks for composed functions */
export interface ComposeHooks extends ClaudeFnHooks {
  /** Called after each tool invocation with the tool name, input, and result */
  onToolCall?: (ctx: {
    name: string;
    input: string;
    result: ClaudeFnResult<any>;
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

  // ── CLI-specific ───────────────────────────────────

  /** Extra CLI flags passed to `claude` */
  cliFlags?: string[];
}
