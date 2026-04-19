import type { ComposeOptions, AgentFnResult, Provider } from "./types.js";
import type { ComposeOptions as ClaudeComposeOptions } from "@converge/claudefn";
import type { ComposeOptions as KimiComposeOptions } from "@converge/kimifn";
import type { ComposeOptions as QwenComposeOptions } from "@converge/qwenfn";
import type { ComposeOptions as GeminiComposeOptions } from "@converge/geminifn";
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
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

/**
 * Walk up from startDir to find the project root.
 * Prefers a directory with .claude (Claude Code project), then .converge (converge project root).
 */
function findProjectRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  let convergeRoot: string | null = null;
  while (true) {
    if (existsSync(join(dir, ".claude"))) return dir;
    if (!convergeRoot && existsSync(join(dir, ".converge"))) convergeRoot = dir;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return convergeRoot;
}

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
    let fn: ReturnType<typeof import("@converge/kimifn").compose<T>> | undefined;
    return async (input?: string) => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@converge/kimifn")>("@converge/kimifn");
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
    let fn: ReturnType<typeof import("@converge/qwenfn").compose<T>> | undefined;
    return async (input?: string) => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@converge/qwenfn")>("@converge/qwenfn");
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
    let fn: ReturnType<typeof import("@converge/geminifn").compose<T>> | undefined;
    return async (input?: string) => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@converge/geminifn")>("@converge/geminifn");
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

  // Claude provider — supports symlinks
  let fn: ReturnType<typeof import("@converge/claudefn").compose<T>> | undefined;
  return async (input?: string) => {
    if (!fn) {
      const mod = await loadProvider<typeof import("@converge/claudefn")>("@converge/claudefn");
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
      const projectRoot = findProjectRoot(baseDir);
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
