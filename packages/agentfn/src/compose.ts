import type { ComposeOptions, AgentFnResult, Provider } from "./types.js";
import type { ComposeOptions as ClaudeComposeOptions } from "@openplaybooks/claudefn";
import type { ComposeOptions as KimiComposeOptions } from "@openplaybooks/kimifn";
import type { ComposeOptions as QwenComposeOptions } from "@openplaybooks/qwenfn";
import type { ComposeOptions as GeminiComposeOptions } from "@openplaybooks/geminifn";
import type { ComposeOptions as CodexComposeOptions } from "@openplaybooks/codexfn";
import { getDefaultProvider } from "./provider.js";

async function loadProvider<T>(pkg: string): Promise<T> {
  try {
    return await import(pkg);
  } catch {
    throw new Error(
      `Provider "${pkg}" is not installed. Install it with: pnpm add ${pkg}`,
    );
  }
}
import { enhancePrompt } from "./prompting.js";
import { ensureSkillSymlinks, cleanupSkillSymlinks } from "./skills.js";
import { findConvergeRoot } from "./find-converge-root.js";
import { join } from "node:path";

/**
 * Create a composed function that orchestrates tools via Claude or Kimi.
 *
 * Tools created with `agentfn()` can be passed directly. The composition
 * delegates to the underlying provider's compose implementation.
 *
 * @example
 * ```typescript
 * const translate = agentfn({ prompt: "Translate {{input}} to French" });
 * const summarize = agentfn({ prompt: "Summarize {{input}}", provider: "kimi" });
 *
 * const fn = compose({
 *   prompt: "Translate then summarize {{input}}",
 *   tools: {
 *     translate: { fn: translate, description: "Translate text" },
 *     summarize: { fn: summarize, description: "Summarize text" },
 *   },
 * });
 * ```
 */
export function compose<T = string>(
  options: ComposeOptions<T>,
): (input?: string) => Promise<AgentFnResult<T>> {
  const provider: Provider = options.provider ?? getDefaultProvider();
  const useNewSkills = !!options.skillsRoot;
  const useLegacySkills = !useNewSkills && (options.enableSkills ?? true);

  if (provider === "kimi") {
    let fn: ReturnType<typeof import("@openplaybooks/kimifn").compose<T>> | undefined;
    return async (input?: string) => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@openplaybooks/kimifn")>("@openplaybooks/kimifn");
        fn = mod.compose<T>(toKimiComposeOptions(options));
      }
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: options.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "kimi" };
    };
  }

  if (provider === "qwen") {
    let fn: ReturnType<typeof import("@openplaybooks/qwenfn").compose<T>> | undefined;
    return async (input?: string) => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@openplaybooks/qwenfn")>("@openplaybooks/qwenfn");
        fn = mod.compose<T>(toQwenComposeOptions(options));
      }
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: options.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "qwen" };
    };
  }

  if (provider === "gemini") {
    let fn: ReturnType<typeof import("@openplaybooks/geminifn").compose<T>> | undefined;
    return async (input?: string) => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@openplaybooks/geminifn")>("@openplaybooks/geminifn");
        fn = mod.compose<T>(toGeminiComposeOptions(options));
      }
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: options.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "gemini" };
    };
  }

  // Codex provider

  if (provider === "codex") {
    let fn: ReturnType<typeof import("@openplaybooks/codexfn").compose<T>> | undefined;
    return async (input?: string) => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@openplaybooks/codexfn")>("@openplaybooks/codexfn");
        fn = mod.compose<T>(toCodexComposeOptions(options));
      }
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: options.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "codex" };
    };
  }

  // Claude provider — supports symlinks
  let fn: ReturnType<typeof import("@openplaybooks/claudefn").compose<T>> | undefined;
  return async (input?: string) => {
    if (!fn) {
      const mod = await loadProvider<typeof import("@openplaybooks/claudefn")>("@openplaybooks/claudefn");
      fn = mod.compose<T>(toClaudeComposeOptions(options));
    }
    let enhancedInput = input;
    if (useLegacySkills && input) {
      enhancedInput = enhancePrompt(input, { cwd: options.cwd });
    }

    // Symlink management for new API
    let createdSymlinks: string[] = [];
    let symlinkTarget: string | undefined;

    if (useNewSkills && options.skillsRoot) {
      const baseDir = options.cwd || process.cwd();
      const projectRoot = findConvergeRoot(baseDir);
      symlinkTarget = join(projectRoot ?? baseDir, ".claude", "skills");
      createdSymlinks = ensureSkillSymlinks(options.skillsRoot, {
        skills: options.skills,
        targetRoot: symlinkTarget,
      });
    }

    try {
      const result = await fn(enhancedInput);
      return { ...result, provider: "claude" };
    } finally {
      if (createdSymlinks.length > 0 && symlinkTarget) {
        cleanupSkillSymlinks(createdSymlinks, symlinkTarget);
      }
    }
  };
}

// ─── Options Mapping ─────────────────────────────────────────

function toClaudeComposeOptions<T>(
  opts: ComposeOptions<T>,
): ClaudeComposeOptions<T> {
  return {
    prompt: opts.prompt,
    tools: opts.tools as unknown as ClaudeComposeOptions<T>["tools"],
    composeMode: opts.composeMode,
    schema: opts.schema,
    hooks: opts.hooks as ClaudeComposeOptions<T>["hooks"],
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    maxIterations: opts.maxIterations,
    cwd: opts.cwd,
    queue: opts.queue as ClaudeComposeOptions<T>["queue"],
    cliFlags: opts.cliFlags,
    allowedTools: opts.allowedTools,
    systemPrompt: opts.systemPrompt,
    // Deprecated SDK-only options — passed through for backward compat
    ...(opts.backend && { backend: opts.backend }),
    ...(opts.model && { model: opts.model }),
    ...(opts.permissionMode !== undefined && {
      permissionMode: opts.permissionMode,
    }),
  } as ClaudeComposeOptions<T>;
}

function toKimiComposeOptions<T>(
  opts: ComposeOptions<T>,
): KimiComposeOptions<T> {
  return {
    prompt: opts.prompt,
    tools: opts.tools as unknown as KimiComposeOptions<T>["tools"],
    composeMode: opts.composeMode,
    schema: opts.schema,
    hooks: opts.hooks as KimiComposeOptions<T>["hooks"],
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    maxIterations: opts.maxIterations,
    cwd: opts.cwd,
    queue: opts.queue as KimiComposeOptions<T>["queue"],
    cliFlags: opts.cliFlags,
  };
}

function toQwenComposeOptions<T>(
  opts: ComposeOptions<T>,
): QwenComposeOptions<T> {
  return {
    prompt: opts.prompt,
    tools: opts.tools as unknown as QwenComposeOptions<T>["tools"],
    composeMode: opts.composeMode,
    schema: opts.schema,
    hooks: opts.hooks as QwenComposeOptions<T>["hooks"],
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    maxIterations: opts.maxIterations,
    cwd: opts.cwd,
    queue: opts.queue as QwenComposeOptions<T>["queue"],
    cliFlags: opts.cliFlags,
  };
}

function toGeminiComposeOptions<T>(
  opts: ComposeOptions<T>,
): GeminiComposeOptions<T> {
  return {
    prompt: opts.prompt,
    tools: opts.tools as unknown as GeminiComposeOptions<T>["tools"],
    composeMode: opts.composeMode,
    schema: opts.schema,
    hooks: opts.hooks as GeminiComposeOptions<T>["hooks"],
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    maxIterations: opts.maxIterations,
    cwd: opts.cwd,
    queue: opts.queue as GeminiComposeOptions<T>["queue"],
    cliFlags: opts.cliFlags,
  };
}

function toCodexComposeOptions<T>(
  opts: ComposeOptions<T>,
): CodexComposeOptions<T> {
  return {
    prompt: opts.prompt,
    tools: opts.tools as unknown as CodexComposeOptions<T>["tools"],
    composeMode: opts.composeMode,
    schema: opts.schema,
    hooks: opts.hooks as CodexComposeOptions<T>["hooks"],
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    maxIterations: opts.maxIterations,
    cwd: opts.cwd,
    queue: opts.queue as CodexComposeOptions<T>["queue"],
    cliFlags: opts.cliFlags,
  };
}
