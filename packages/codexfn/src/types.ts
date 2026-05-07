import type { ZodType } from "zod";
import type { GlobalQueue, GlobalQueueOptions } from "./queue.js";

export type PromptInput = string | ((input?: string) => string);

export interface CodexFnHooks {
  before?: (ctx: { prompt: string }) => string | void | Promise<string | void>;
  after?: (ctx: { result: string; durationMs: number }) => void | Promise<void>;
  onStream?: (chunk: string) => void;
}

export interface CodexFnOptions<T = string> {
  prompt?: PromptInput;
  schema?: ZodType<T>;
  hooks?: CodexFnHooks;
  timeoutMs?: number;
  maxRetries?: number;
  cwd?: string;
  queue?: GlobalQueue | GlobalQueueOptions | boolean;
  cliFlags?: string[];
  /** Override the model (e.g. "gpt-5.4"). Passed as --model to the CLI. */
  model?: string;
  /** Sandbox policy (default: "danger-full-access") */
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  /** Skip git repo check (default: true) */
  skipGitRepoCheck?: boolean;
  /** Don't persist session rollout files (default: true) */
  ephemeral?: boolean;
  /** Environment variables to set when spawning the process */
  env?: Record<string, string>;
}

export interface CodexFnResult<T = string> {
  data: T;
  raw: string;
  durationMs: number;
}

export type CodexFn<T = string> = (input?: string) => Promise<CodexFnResult<T>>;

// -- Composition --

export interface ToolDef {
  fn: CodexFn<any>;
  description: string;
}

export interface ComposeHooks extends CodexFnHooks {
  onToolCall?: (ctx: {
    name: string;
    input: string;
    result: CodexFnResult<any>;
  }) => void | Promise<void>;
}

export interface ComposeOptions<T = string> {
  prompt: PromptInput;
  tools: Record<string, ToolDef>;
  composeMode?: "code" | "tool_call";
  schema?: ZodType<T>;
  hooks?: ComposeHooks;
  timeoutMs?: number;
  maxRetries?: number;
  maxIterations?: number;
  cwd?: string;
  queue?: GlobalQueue | GlobalQueueOptions | boolean;
  cliFlags?: string[];
  model?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  skipGitRepoCheck?: boolean;
  ephemeral?: boolean;
}
