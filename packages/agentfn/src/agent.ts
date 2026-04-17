import type { Provider } from "./types.js";

/** Options for agent() */
export interface UnifiedAgentOptions<T = string> {
  /** Which provider to use. Only "claude" is supported for agent(). */
  provider?: Provider;
  [key: string]: unknown;
}

/** Type alias for the callable agent function */
export type AgentFn<T = string> = (
  input?: string,
) => Promise<{ data: T; raw: string; durationMs: number }>;

/**
 * @deprecated The Claude Agent SDK backend has been removed.
 * Use agentfn() with the CLI backend instead.
 */
export function agent<T = string>(
  _options: UnifiedAgentOptions<T>,
): AgentFn<T> {
  throw new Error(
    "agentfn: agent() is not available — the Claude Agent SDK backend has been removed. " +
      "Use agentfn() instead.",
  );
}
