import type { ZodType } from "zod";
import type { GlobalQueue, GlobalQueueOptions } from "./queue.js";

export type PromptInput = string | ((input?: string) => string);

export interface DeepCodeFnHooks {
  before?: (ctx: { prompt: string }) => string | void | Promise<string | void>;
  after?: (ctx: { result: string; durationMs: number }) => void | Promise<void>;
  onStream?: (chunk: string) => void;
}

export interface DeepCodeCommand {
  command: string;
  args?: string[];
}

export interface DeepCodeFnOptions<T = string> {
  prompt?: PromptInput;
  schema?: ZodType<T>;
  hooks?: DeepCodeFnHooks;
  timeoutMs?: number;
  maxRetries?: number;
  cwd?: string;
  queue?: GlobalQueue | GlobalQueueOptions | boolean;
  cliFlags?: string[];
  model?: string;
  env?: Record<string, string>;
  command?: string | DeepCodeCommand;
  promptMode?: "chat" | "requirement";
  noPlanReview?: boolean;
}

export interface DeepCodeFnResult<T = string> {
  data: T;
  raw: string;
  durationMs: number;
}

export type DeepCodeFn<T = string> = (input?: string) => Promise<DeepCodeFnResult<T>>;
