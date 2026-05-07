import { acpfn } from "@converge/acpfn";
import { claudefn } from "@converge/claudefn";
import type {
  AgentFnOptions,
  AgentFnResult,
  AgentFn,
  Provider,
} from "./types.js";
import type { ClaudeFnOptions } from "@converge/claudefn";
import type { KimiFnOptions } from "@converge/kimifn";
import type { QwenFnOptions } from "@converge/qwenfn";
import type { GeminiFnOptions } from "@converge/geminifn";
import type { AcpFnOptions } from "@converge/acpfn";
import type { OpenFnOptions } from "@converge/openfn";
import type { CodexFnOptions } from "@converge/codexfn";
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
import { findConvergeRoot } from "@converge/project-root";
import { join } from "node:path";

/**
 * Create a callable function backed by either Claude or Kimi.
 *
 * Delegates to `claudefn()` or `kimifn()` based on the `provider` option
 * (or the global default). Returns a unified result that includes a
 * `provider` field indicating which backend produced it.
 *
 * Skills handling:
 * - New API: pass `skillsRoot` (+ optional `skills` filter) for explicit control.
 *   agentfn creates symlinks for Claude and cleans up after. No prompt injection.
 * - Legacy: `enableSkills: true` (default) auto-detects .converge/ and injects
 *   prompt footnotes. Deprecated — will be removed.
 */
export function agentfn<T = string>(options?: AgentFnOptions<T>): AgentFn<T> {
  const opts = options ?? ({} as AgentFnOptions<T>);
  const provider: Provider = opts.provider ?? getDefaultProvider();

  // Determine skill handling mode:
  // - New: skillsRoot is set → explicit symlink management, no prompt injection
  // - Legacy: enableSkills (default true) → auto-detect + prompt enhancement
  const useNewSkills = !!opts.skillsRoot;
  const useLegacySkills = !useNewSkills && (opts.enableSkills ?? true);

  // ── Stream mode validation ──────────────────────────

  if (opts.mode === "stream" && provider !== "claude") {
    throw new Error(
      `Stream mode is not supported with ${provider} provider. Use Claude instead.`,
    );
  }

  // ── Call mode ──────────────────────────────────────

  if (provider === "kimi") {
    let fn: ReturnType<typeof import("@converge/kimifn").kimifn<T>> | undefined;
    return async (input?: string): Promise<AgentFnResult<T>> => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@converge/kimifn")>("@converge/kimifn");
        fn = mod.kimifn<T>(toKimiOptions(opts));
      }
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "kimi" };
    };
  }

  if (provider === "qwen") {
    let fn: ReturnType<typeof import("@converge/qwenfn").qwenfn<T>> | undefined;
    return async (input?: string): Promise<AgentFnResult<T>> => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@converge/qwenfn")>("@converge/qwenfn");
        fn = mod.qwenfn<T>(toQwenOptions(opts));
      }
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "qwen" };
    };
  }

  if (provider === "gemini") {
    let fn: ReturnType<typeof import("@converge/geminifn").geminifn<T>> | undefined;
    return async (input?: string): Promise<AgentFnResult<T>> => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@converge/geminifn")>("@converge/geminifn");
        fn = mod.geminifn<T>(toGeminiOptions(opts));
      }
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "gemini" };
    };
  }

  // ── ACP (Agent SDK) provider ────────────────────────

  if (provider === "acp") {
    const fn = acpfn<T>(toAcpOptions(opts));
    return async (input?: string): Promise<AgentFnResult<T>> => {
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "acp" };
    };
  }

  // ── Openfn provider ────────────────────────────────

  if (provider === "openfn") {
    let fn: ReturnType<typeof import("@converge/openfn").openfn<T>> | undefined;
    return async (input?: string): Promise<AgentFnResult<T>> => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@converge/openfn")>("@converge/openfn");
        fn = mod.openfn<T>(toOpenfnOptions(opts));
      }
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "openfn" };
    };
  }

  // ── Codex provider ────────────────────────────────

  if (provider === "codex") {
    let fn: ReturnType<typeof import("@converge/codexfn").codexfn<T>> | undefined;
    return async (input?: string): Promise<AgentFnResult<T>> => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@converge/codexfn")>("@converge/codexfn");
        fn = mod.codexfn<T>(toCodexOptions(opts));
      }
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "codex" };
    };
  }

  // ── Claude provider ────────────────────────────────

  let fn: ReturnType<typeof claudefn<T>> | undefined;
  return async (input?: string): Promise<AgentFnResult<T>> => {
    if (!fn) {
      fn = claudefn<T>(toClaudeOptions(opts));
    }
    // Legacy prompt enhancement (deprecated path)
    let enhancedInput = input;
    if (useLegacySkills && input) {
      enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
    }

    // Symlink management — new explicit path or legacy auto-detect
    let createdSymlinks: string[] = [];
    let symlinkTarget: string | undefined;

    // Skill junctions land at <projectRoot>/.claude/skills/, where projectRoot is
    // the nearest ancestor (or self) containing .converge/. See @converge/project-root.
    const baseDir = opts.cwd || process.cwd();
    const projectRoot = findConvergeRoot(baseDir);
    symlinkTarget = join(projectRoot ?? baseDir, ".claude", "skills");

    if (opts.skillDirs && Object.keys(opts.skillDirs).length > 0) {
      // Direct mapping: skill name → absolute path. Creates absolute symlinks.
      const { mkdirSync, symlinkSync, lstatSync } = await import("node:fs");
      console.log(`   🔗 Creating skill junctions in: ${symlinkTarget}`);
      mkdirSync(symlinkTarget, { recursive: true });
      for (const [name, absDir] of Object.entries(opts.skillDirs)) {
        const linkPath = join(symlinkTarget, name);
        try {
          lstatSync(linkPath);
          console.log(`   ⏭  ${name}: already exists`);
          continue;
        } catch {
          /* doesn't exist */
        }
        try {
          symlinkSync(absDir, linkPath, "junction");
          createdSymlinks.push(name);
          console.log(`   ✅ ${name} → ${absDir}`);
        } catch (err: any) {
          console.warn(`   ⚠️  Failed junction ${name}: ${err.message}`);
        }
      }
    }

    if (useNewSkills && opts.skillsRoot) {
      // Explicit skillsRoot → scan dir, create symlinks in .claude/skills/
      const fromRoot = ensureSkillSymlinks(opts.skillsRoot, {
        skills: opts.skills,
        targetRoot: symlinkTarget,
      });
      createdSymlinks.push(...fromRoot);
    } else if (useLegacySkills && projectRoot) {
      // Legacy: auto-detect from <projectRoot>/.converge/skills/.
      // symlinkTarget was already set above; reuse it.
      const convergeSkillsDir = join(projectRoot, ".converge", "skills");
      createdSymlinks = ensureSkillSymlinks(convergeSkillsDir, {
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

function toClaudeOptions<T>(opts: AgentFnOptions<T>): ClaudeFnOptions<T> {
  return {
    prompt: opts.prompt,
    mode: opts.mode,
    schema: opts.schema,
    hooks: opts.hooks,
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    cwd: opts.cwd,
    queue: opts.queue as ClaudeFnOptions<T>["queue"],
    cliFlags: opts.cliFlags,
    allowedTools: opts.allowedTools,
    systemPrompt: opts.systemPrompt,
    systemPromptFile: opts.systemPromptFile,
    signal: opts.signal,
    logDir: opts.logDir,
    env: opts.env,
    // Deprecated SDK-only options — passed through for backward compat
    ...(opts.backend && { backend: opts.backend }),
    ...(opts.model && { model: opts.model }),
    ...(opts.permissionMode !== undefined && {
      permissionMode: opts.permissionMode,
    }),
    ...(opts.maxTurns && { maxTurns: opts.maxTurns }),
    ...(opts.disallowedTools && { disallowedTools: opts.disallowedTools }),
    ...(opts.mcpServers && { mcpServers: opts.mcpServers }),
    ...(opts.agents && { agents: opts.agents }),
    ...(opts.resume && { resume: opts.resume }),
    ...(opts.effort && { effort: opts.effort }),
    ...(opts.maxBudgetUsd && { maxBudgetUsd: opts.maxBudgetUsd }),
    ...(opts.maxFeedbackTurns && { maxFeedbackTurns: opts.maxFeedbackTurns }),
  } as ClaudeFnOptions<T>;
}

function toKimiOptions<T>(opts: AgentFnOptions<T>): KimiFnOptions<T> {
  return {
    prompt: opts.prompt,
    schema: opts.schema,
    hooks: opts.hooks,
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    cwd: opts.cwd,
    queue: opts.queue as KimiFnOptions<T>["queue"],
    cliFlags: opts.cliFlags,
  };
}

function toQwenOptions<T>(opts: AgentFnOptions<T>): QwenFnOptions<T> {
  return {
    prompt: opts.prompt,
    schema: opts.schema,
    hooks: opts.hooks,
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    cwd: opts.cwd,
    queue: opts.queue as QwenFnOptions<T>["queue"],
    cliFlags: opts.cliFlags,
  };
}

function toGeminiOptions<T>(opts: AgentFnOptions<T>): GeminiFnOptions<T> {
  return {
    prompt: opts.prompt,
    schema: opts.schema,
    hooks: opts.hooks,
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    cwd: opts.cwd,
    queue: opts.queue as GeminiFnOptions<T>["queue"],
    cliFlags: opts.cliFlags,
  };
}

function toAcpOptions<T>(opts: AgentFnOptions<T>): AcpFnOptions<T> {
  return {
    prompt: opts.prompt,
    schema: opts.schema,
    hooks: opts.hooks,
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    cwd: opts.cwd,
    queue: opts.queue as AcpFnOptions<T>["queue"],
    allowedTools: opts.allowedTools,
    systemPrompt: opts.systemPrompt,
    systemPromptFile: opts.systemPromptFile,
    signal: opts.signal,
    logDir: opts.logDir,
    model: opts.model,
    maxTurns: opts.maxTurns,
    mcpServers: opts.mcpServers,
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl,
  };
}

function toOpenfnOptions<T>(opts: AgentFnOptions<T>): OpenFnOptions<T> {
  return {
    prompt: opts.prompt,
    schema: opts.schema,
    hooks: opts.hooks,
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    cwd: opts.cwd,
    queue: opts.queue as OpenFnOptions<T>["queue"],
    signal: opts.signal,
    logDir: opts.logDir,
    model: opts.model,
    baseUrl: opts.baseUrl,
    apiKey: opts.apiKey,
    providers: opts.providers,
  };
}

function toCodexOptions<T>(opts: AgentFnOptions<T>): CodexFnOptions<T> {
  return {
    prompt: opts.prompt,
    schema: opts.schema,
    hooks: opts.hooks,
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    cwd: opts.cwd,
    queue: opts.queue as CodexFnOptions<T>["queue"],
    cliFlags: opts.cliFlags,
    model: opts.model,
    env: opts.env,
  };
}
