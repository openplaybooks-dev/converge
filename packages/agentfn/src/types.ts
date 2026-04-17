import type { ZodType } from "zod";

// ─── Import shared types from claudefn ──────────────────────

import type {
  PromptInput,
  ExecutionMode,
  ClaudeFnOptions,
  ClaudeFnResult,
  ClaudeFn,
} from "@converge/claudefn";

// ─── Re-export shared types from claudefn ───────────────────

export type {
  PromptInput,
  ExecutionMode,
  ClaudeFnOptions,
  ClaudeFnResult,
  ClaudeFn,
} from "@converge/claudefn";

// ─── Stub types for removed SDK backend ─────────────────────

/** @deprecated SDK backend removed */
export type Backend = "cli";
/** @deprecated SDK backend removed */
export type PermissionMode = never;
/** @deprecated SDK backend removed */
export type McpServerConfig = never;
/** @deprecated SDK backend removed */
export type AgentDefinition = never;
/** @deprecated SDK backend removed */
export type SessionEvent = never;
/** @deprecated SDK backend removed */
export type Session = never;
/** @deprecated SDK backend removed */
export type StreamCallOptions = never;
/** @deprecated SDK backend removed */
export type AgentResult<T = string> = { data: T; raw: string; durationMs: number; sessionId?: string };
/** @deprecated SDK backend removed */
export type AgentHooks = never;
/** @deprecated SDK backend removed */
export type ClaudeAgentOptions<T = string> = Record<string, unknown> & { schema?: unknown };
/** @deprecated SDK backend removed */
export type StreamFn = never;

export type {
  KimiFnOptions,
  KimiFnResult,
  KimiFn,
} from "@converge/kimifn";

export type {
  QwenFnOptions,
  QwenFnResult,
  QwenFn,
} from "@converge/qwenfn";

export type {
  GeminiFnOptions,
  GeminiFnResult,
  GeminiFn,
} from "@converge/geminifn";

export type {
  AcpFnOptions,
  AcpFnResult,
  AcpFn,
} from "@converge/acpfn";

export type {
  OpenFnOptions,
  OpenFnResult,
  OpenFn,
} from "@converge/openfn";

export type { GlobalQueue, GlobalQueueOptions, SendFeedbackOptions } from "@converge/claudefn";

// ─── Skills/Agents ──────────────────────────────────────────

/** Options for enhancing prompts with skill/agent references */
// ─── Provider ───────────────────────────────────────────────

/** Supported LLM providers */
export type Provider = "claude" | "kimi" | "qwen" | "gemini" | "acp" | "openfn";

// ─── Unified Hooks ──────────────────────────────────────────

/** Lifecycle hooks — superset of both providers */
export interface AgentFnHooks {
  /** Called before the request is sent. Can modify the prompt. */
  before?: (ctx: { prompt: string }) => string | void | Promise<string | void>;
  /** Called after the response completes. Receives raw text. */
  after?: (ctx: { result: string; durationMs: number }) => void | Promise<void>;
  /** Called with each chunk of streaming text data */
  onStream?: (chunk: string) => void;
  /** Called for each raw SDK message (Claude SDK backend only) */
  onMessage?: (message: unknown) => void | Promise<void>;
  /**
   * Called after each response with the result and session ID.
   * Return a string to automatically send it as a follow-up message.
   * (Claude stream mode only)
   */
  onFeedback?: (ctx: {
    result: string;
    sessionId: string;
  }) => string | void | Promise<string | void>;
}

// ─── Unified Result ─────────────────────────────────────────

/** Result from an agentfn invocation */
export interface AgentFnResult<T = string> {
  /** Parsed data (typed via schema) or raw string if no schema */
  data: T;
  /** Raw text output */
  raw: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Which provider produced this result */
  provider: Provider;
  /** Session ID (Claude SDK/ACP backend only) */
  sessionId?: string;
  /** Total cost in USD (Claude SDK backend only) */
  costUsd?: number;
  /** Number of turns (Claude SDK/ACP backend only) */
  numTurns?: number;
  /** Path to log file (ACP backend only) */
  logPath?: string;
}

// ─── Unified Callable ───────────────────────────────────────

/** A callable function created by agentfn() */
export type AgentFn<T = string> = (
  input?: string,
) => Promise<AgentFnResult<T>>;

// ─── Unified Options ────────────────────────────────────────

/** Options for agentfn() */
export interface AgentFnOptions<T = string> {
  /** Which provider to use (default: from getDefaultProvider()) */
  provider?: Provider;

  // ── Shared options (both providers) ─────────────────

  /** Static string with {{input}} placeholder, or a function */
  prompt?: PromptInput;
  /** Zod schema to validate & parse the output */
  schema?: ZodType<T>;
  /** Lifecycle hooks */
  hooks?: AgentFnHooks;
  /** Max time in ms before aborting (default: 120_000) */
  timeoutMs?: number;
  /** Maximum retries on failure (default: 0) */
  maxRetries?: number;
  /** Working directory for the process */
  cwd?: string;
  /** Global queue for rate limiting */
  queue?: import("@converge/claudefn").GlobalQueue | import("@converge/claudefn").GlobalQueueOptions | boolean;
  /** Extra CLI flags */
  cliFlags?: string[];

  // ── Claude-only options ─────────────────────────────

  /** Execution mode — "call" (default) or "stream" (Claude only) */
  mode?: import("@converge/claudefn").ExecutionMode;
  /** Backend — "cli" only (sdk backend removed) */
  backend?: Backend;
  /** Restrict available tools */
  allowedTools?: string[];
  /** Model (Claude SDK backend — removed) */
  model?: string;
  /** Permission mode (Claude SDK backend — removed) */
  permissionMode?: PermissionMode;
  /** Max conversation turns (Claude SDK backend — removed) */
  maxTurns?: number;
  /** System prompt (Claude SDK backend — removed) */
  systemPrompt?: string;
  /**
   * Path to a .md file appended to the system prompt via --append-system-prompt-file.
   * Use for large context that would exceed CLI arg limits.
   */
  systemPromptFile?: string;
  /** Tools to block (Claude SDK backend — removed) */
  disallowedTools?: string[];
  /** MCP servers (Claude SDK backend — removed) */
  mcpServers?: Record<string, McpServerConfig>;
  /** Subagent definitions (Claude SDK backend — removed) */
  agents?: Record<string, AgentDefinition>;
  /** Resume session (Claude SDK backend) */
  resume?: string;
  /** Reasoning effort (Claude SDK backend) */
  effort?: "low" | "medium" | "high" | "max";
  /** Max budget in USD (Claude SDK backend) */
  maxBudgetUsd?: number;
  /** Max feedback turns (Claude stream mode) */
  maxFeedbackTurns?: number;

  // ── ACP (Agent SDK) options ─────────────────────────

  /** 
   * Custom API key for ACP provider.
   * Use this to connect to Claude-compatible APIs (e.g., Kimi).
   */
  apiKey?: string;

  /**
   * Custom base URL for ACP provider.
   * Use this to connect to Claude-compatible APIs (e.g., https://api.moonshot.cn/v1).
   */
  baseUrl?: string;

  /**
   * Multiple AI providers for Opencode.
   * Each provider has its own API key.
   */
  providers?: Record<string, { apiKey: string }>;

  /**
   * AbortSignal to cancel the running process.
   * When aborted, the spawned child process is killed.
   */
  signal?: AbortSignal;

  // ── Skills/Agents injection ─────────────────────────

  /**
   * @deprecated Use skillsRoot + skills instead.
   * Enable automatic skill/agent injection via /skill and @agent references.
   * When enabled, prompts are enhanced with file paths to referenced skills/agents.
   * Default: true
   */
  enableSkills?: boolean;

  /**
   * Absolute path to the skills directory (e.g. "/project/.crew/skills").
   * When set, agentfn will create .claude/skills/ symlinks for Claude provider
   * and clean them up after execution.
   */
  skillsRoot?: string;

  /**
   * Explicit list of skill names to activate.
   * When set with skillsRoot, only these skills get symlinked.
   * When omitted but skillsRoot is set, all discovered skills are symlinked.
   */
  skills?: string[];

  /**
   * Direct skill name → absolute directory path mappings.
   * Each entry creates an absolute symlink: .claude/skills/{name} → absPath.
   * Takes precedence over skillsRoot for the named skills.
   * Useful when skills live in different locations (e.g. task dir + shared skills dir).
   */
  skillDirs?: Record<string, string>;

  /**
   * Directory to write claudefn execution logs.
   * Passed through to claudefn when using the Claude provider.
   */
  logDir?: string;
}

// ─── Unified Tool Definition ────────────────────────────────

/** A tool usable in compose() */
export interface ToolDef {
  /** The callable function to invoke */
  fn: AgentFn<any>;
  /** Description shown to the LLM */
  description: string;
}

/** Extended hooks for composed functions */
export interface ComposeHooks extends AgentFnHooks {
  /** Called after each tool invocation */
  onToolCall?: (ctx: {
    name: string;
    input: string;
    result: AgentFnResult<any>;
  }) => void | Promise<void>;
}

/** Options for compose() */
export interface ComposeOptions<T = string> {
  /** Which provider to use (default: from getDefaultProvider()) */
  provider?: Provider;
  /** Static string with {{input}} placeholder, or a function */
  prompt: PromptInput;
  /** Map of tool name to tool definition */
  tools: Record<string, ToolDef>;
  /** Composition mode — "code" (default) or "tool_call" */
  composeMode?: "code" | "tool_call";
  /** Zod schema to validate & parse the final output */
  schema?: ZodType<T>;
  /** Lifecycle hooks */
  hooks?: ComposeHooks;
  /** Max time per invocation in ms (default: 120_000) */
  timeoutMs?: number;
  /** Maximum retries on failure (default: 0) */
  maxRetries?: number;
  /** Maximum iterations (default: 10) */
  maxIterations?: number;
  /** Working directory */
  cwd?: string;
  /** Global queue for rate limiting */
  queue?: import("@converge/claudefn").GlobalQueue | import("@converge/claudefn").GlobalQueueOptions | boolean;
  /** Extra CLI flags */
  cliFlags?: string[];

  // ── Claude-only ─────────────────────────────────────

  /** Backend — "cli" only (sdk backend removed) */
  backend?: Backend;
  /** Restrict available tools (Claude only) */
  allowedTools?: string[];
  /** Model (Claude SDK backend — removed) */
  model?: string;
  /** Permission mode (Claude SDK backend — removed) */
  permissionMode?: PermissionMode;
  /** System prompt (Claude SDK backend — removed) */
  systemPrompt?: string;

  // ── Skills/Agents injection ─────────────────────────

  /**
   * @deprecated Use skillsRoot + skills instead.
   */
  enableSkills?: boolean;

  /**
   * Absolute path to the skills directory.
   * When set, creates .claude/skills/ symlinks for Claude provider.
   */
  skillsRoot?: string;

  /**
   * Explicit list of skill names to activate.
   */
  skills?: string[];
}
