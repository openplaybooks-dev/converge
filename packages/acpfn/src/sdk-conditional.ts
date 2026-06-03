/**
 * Conditional import of `@anthropic-ai/claude-agent-sdk`.
 * When the SDK is not installed, `query` throws a clear error when called,
 * preserving the rest of the `acpfn` module's API so the package can be
 * loaded and used (for non-SDK code paths) without the SDK present.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

// ─── Public Types ────────────────────────────────────────────────

export interface SdkQuery {
  [Symbol.asyncIterator](): AsyncIterator<SdkMessage>;
  close(): void;
}

export interface SdkMessage {
  type: string;
  subtype?: string;
  message?: {
    content?: Array<{
      type: string;
      text?: string;
      thinking?: string;
      name?: string;
      input?: Record<string, unknown>;
      id?: string;
    }>;
  };
  result?: string;
}

export interface SdkOptions {
  cwd?: string;
  abortController?: AbortController;
  allowedTools?: string[];
  allowDangerouslySkipPermissions?: boolean;
  debug?: boolean;
  maxTurns?: number;
  model?: string;
  mcpServers?: unknown;
  persistSession?: boolean;
  sessionId?: string;
  systemPrompt?: string;
  env?: Record<string, string>;
  pathToClaudeCodeExecutable?: string;
  // sendFeedback-specific
  resume?: string;
}

// ─── Module Loading ──────────────────────────────────────────────

interface SdkModule {
  query: (opts: { prompt: string; options: SdkOptions }) => SdkQuery;
}

const _sdkModule: SdkModule | null = (() => {
  try {
    const requireFn = createRequire(import.meta.url);
    const mainEntry = requireFn.resolve("@anthropic-ai/claude-agent-sdk");
    const cliJs = join(dirname(mainEntry), "cli.js");
    const cliPath = existsSync(cliJs) ? cliJs : undefined;

    const mod = requireFn("@anthropic-ai/claude-agent-sdk") as SdkModule;
    if (cliPath) {
      (mod as unknown as Record<string, unknown>).__cliJsPath = cliPath;
    }
    return mod;
  } catch {
    return null;
  }
})();

// ─── Public Helpers ──────────────────────────────────────────────

/** True when the SDK is installed and loadable */
export const sdkAvailable = _sdkModule !== null;

/**
 * Returns the `query` function from the real SDK.
 * Throws a clear error if the SDK is not installed.
 */
export function getQuery(): SdkModule["query"] {
  if (!_sdkModule) {
    throw new Error(
      "@anthropic-ai/claude-agent-sdk is not installed. " +
        "Install it with: pnpm add @anthropic-ai/claude-agent-sdk",
    );
  }
  return _sdkModule.query;
}

/** Returns the resolved cli.js path, or undefined if SDK is not present */
export function getCliJsPath(): string | undefined {
  if (!_sdkModule) return undefined;
  return (_sdkModule as unknown as Record<string, unknown>).__cliJsPath as
    | string
    | undefined;
}
