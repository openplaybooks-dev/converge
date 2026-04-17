import { claudefn } from "@crew/claudefn";
import { kimifn } from "@crew/kimifn";
import { qwenfn } from "@crew/qwenfn";
import { geminifn } from "@crew/geminifn";
import { acpfn } from "@crew/acpfn";
import { openfn } from "@crew/openfn";
import type {
  AgentFnOptions,
  AgentFnResult,
  AgentFn,
  Provider,
} from "./types.js";
import type { ClaudeFnOptions } from "@crew/claudefn";
import type { KimiFnOptions } from "@crew/kimifn";
import type { QwenFnOptions } from "@crew/qwenfn";
import type { GeminiFnOptions } from "@crew/geminifn";
import type { AcpFnOptions } from "@crew/acpfn";
import type { OpenFnOptions } from "@crew/openfn";
import { getDefaultProvider } from "./provider.js";
import { enhancePrompt } from "./prompting.js";
import { ensureSkillSymlinks, cleanupSkillSymlinks } from "./skills.js";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

/**
 * Walk up from startDir to find the project root.
 * Prefers a directory with .claude (Claude Code project), then .harness (harness project root).
 * Falls back to null if neither found.
 */
function findProjectRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  let harnessRoot: string | null = null;
  while (true) {
    if (existsSync(join(dir, ".claude"))) return dir;
    if (!harnessRoot && existsSync(join(dir, ".harness"))) harnessRoot = dir;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return harnessRoot; // fall back to .harness root if no .claude found
}

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
 * - Legacy: `enableSkills: true` (default) auto-detects .crew/ and injects
 *   prompt footnotes. Deprecated — will be removed.
 */
export function agentfn<T = string>(
  options?: AgentFnOptions<T>,
): AgentFn<T> {
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
      `Stream mode is not supported with ${provider} provider. Use Claude instead.`
    );
  }

  // ── Call mode ──────────────────────────────────────

  if (provider === "kimi") {
    const fn = kimifn<T>(toKimiOptions(opts));
    return async (input?: string): Promise<AgentFnResult<T>> => {
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "kimi" };
    };
  }

  if (provider === "qwen") {
    const fn = qwenfn<T>(toQwenOptions(opts));
    return async (input?: string): Promise<AgentFnResult<T>> => {
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "qwen" };
    };
  }

  if (provider === "gemini") {
    const fn = geminifn<T>(toGeminiOptions(opts));
    return async (input?: string): Promise<AgentFnResult<T>> => {
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
    const fn = openfn<T>(toOpenfnOptions(opts));
    return async (input?: string): Promise<AgentFnResult<T>> => {
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "openfn" };
    };
  }

  // ── Claude provider ────────────────────────────────

  const fn = claudefn<T>(toClaudeOptions(opts));
  return async (input?: string): Promise<AgentFnResult<T>> => {
    // Legacy prompt enhancement (deprecated path)
    let enhancedInput = input;
    if (useLegacySkills && input) {
      enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
    }

    // Symlink management — new explicit path or legacy auto-detect
    let createdSymlinks: string[] = [];
    let symlinkTarget: string | undefined;

    // Claude Code resolves skills from the directory containing .claude, not necessarily cwd.
    // Walk up to find the existing .claude directory so junctions land where Claude Code looks.
    const baseDir = opts.cwd || process.cwd();
    const projectRoot = findProjectRoot(baseDir);
    symlinkTarget = join(projectRoot ?? baseDir, ".claude", "skills");

    if (opts.skillDirs && Object.keys(opts.skillDirs).length > 0) {
      // Direct mapping: skill name → absolute path. Creates absolute symlinks.
      const { mkdirSync, symlinkSync, lstatSync } = await import("node:fs");
      console.log(`   🔗 Creating skill junctions in: ${symlinkTarget}`);
      mkdirSync(symlinkTarget, { recursive: true });
      for (const [name, absDir] of Object.entries(opts.skillDirs)) {
        const linkPath = join(symlinkTarget, name);
        try { lstatSync(linkPath); console.log(`   ⏭  ${name}: already exists`); continue; } catch { /* doesn't exist */ }
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
    } else if (useLegacySkills) {
      // Legacy: auto-detect from .crew/ (deprecated)
      const { _findProjectRoot } = await import("./skills.js");
      const root = _findProjectRoot(opts.cwd);
      if (root) {
        const crewSkillsDir = join(root, ".crew", "skills");
        symlinkTarget = join(root, ".claude", "skills");
        createdSymlinks = ensureSkillSymlinks(crewSkillsDir, {
          targetRoot: symlinkTarget,
        });
      }
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
    // Deprecated SDK-only options — passed through for backward compat
    ...(opts.backend && { backend: opts.backend }),
    ...(opts.model && { model: opts.model }),
    ...(opts.permissionMode !== undefined && { permissionMode: opts.permissionMode }),
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
