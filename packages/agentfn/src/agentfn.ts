import { acpfn } from "@openplaybooks/acpfn";
import { claudefn } from "@openplaybooks/claudefn";
import type {
  AgentFnOptions,
  AgentFnResult,
  AgentFn,
  Provider,
} from "./types.js";
import type { ClaudeFnOptions } from "@openplaybooks/claudefn";
import type { KimiFnOptions } from "@openplaybooks/kimifn";
import type { QwenFnOptions } from "@openplaybooks/qwenfn";
import type { GeminiFnOptions } from "@openplaybooks/geminifn";
import type { AcpFnOptions } from "@openplaybooks/acpfn";
import type { OpenFnOptions } from "@openplaybooks/openfn";
import type { CodexFnOptions } from "@openplaybooks/codexfn";
import type { DeepCodeFnOptions } from "@openplaybooks/deepcodefn";
import {
  getDefaultProvider,
  registerProvider,
  getProvider,
} from "./provider.js";

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
import { existsSync } from "node:fs";

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

  // ── Stub provider ──────────────────────────────────
  //
  // Deterministic, no-LLM provider for testing the framework's
  // orchestration code paths (do-while loops, wave counter, converge:
  // verdict handling, multi-iteration runs) without burning external
  // API quota.
  //
  // The response is read from env vars in this precedence order:
  //   1. CONVERGE_STUB_RESPONSE_<TASK_ID>  — per-task override (highest)
  //   2. CONVERGE_STUB_RESPONSE             — global default for the run
  //   3. ''                                 — empty string (falls through to schema default)
  //
  // The response should be JSON when a schema is provided (typical for
  // converge: prompts which expect `{"action":"continue"|"done"}`).
  // Plain string responses pass through when no schema is provided.
  if (provider === "stub") {
    return async (_input?: string): Promise<AgentFnResult<T>> => {
      const start = Date.now();
      // Task-scoped override via current task id, if exposed by execute-task.
      const taskId = process.env.CONVERGE_STUB_TASK_ID || "";
      const perTaskKey = taskId
        ? `CONVERGE_STUB_RESPONSE_${taskId.replace(/[^A-Z0-9_]/gi, "_").toUpperCase()}`
        : "";
      const raw =
        (perTaskKey ? process.env[perTaskKey] : "") ||
        process.env.CONVERGE_STUB_RESPONSE ||
        "";

      let data: T;
      const schema = opts.schema;
      if (schema && raw) {
        try {
          const parsed = JSON.parse(raw);
          // If a Zod-ish schema is supplied, validate; otherwise pass through.
          if (typeof (schema as { parse?: (v: unknown) => unknown }).parse === "function") {
            data = (schema as { parse: (v: unknown) => unknown }).parse(parsed) as T;
          } else {
            data = parsed as T;
          }
        } catch {
          // If parsing/validation fails, fall back to the raw string cast
          // so callers can inspect what came in.
          data = raw as unknown as T;
        }
      } else {
        data = (raw as unknown) as T;
      }

      return {
        data,
        raw,
        durationMs: Date.now() - start,
        provider: "stub",
      };
    };
  }

  // ── Call mode ──────────────────────────────────────

  if (provider === "kimi") {
    let fn: ReturnType<typeof import("@openplaybooks/kimifn").kimifn<T>> | undefined;
    return async (input?: string): Promise<AgentFnResult<T>> => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@openplaybooks/kimifn")>("@openplaybooks/kimifn");
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
    let fn: ReturnType<typeof import("@openplaybooks/qwenfn").qwenfn<T>> | undefined;
    return async (input?: string): Promise<AgentFnResult<T>> => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@openplaybooks/qwenfn")>("@openplaybooks/qwenfn");
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
    let fn: ReturnType<typeof import("@openplaybooks/geminifn").geminifn<T>> | undefined;
    return async (input?: string): Promise<AgentFnResult<T>> => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@openplaybooks/geminifn")>("@openplaybooks/geminifn");
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

  // ── Registry-based providers ─────────────────────────

  // Try registry first (plugin-loaded providers).
  // Note: factory() is called lazily here (inside the returned function), not
  // at agentfn() construction time, so the provider module is loaded only when
  // the agent is actually invoked.
  const factory = getProvider(provider);
  if (factory) {
    const agentFnPromise = factory(opts as AgentFnOptions<unknown>);
    return (async (input?: string) => {
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }
      const agentFn = await agentFnPromise;
      const result = await agentFn(enhancedInput);
      return result as AgentFnResult<T>;
    });
  }

  // ── Legacy fallback: hardcoded built-in providers ─────
  // TODO: migrate all built-in providers to registry-based registration above

  if (provider === "openfn") {
    let fn: ReturnType<typeof import("@openplaybooks/openfn").openfn<T>> | undefined;
    return async (input?: string): Promise<AgentFnResult<T>> => {
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }

      const baseDir = opts.cwd || process.cwd();
      const projectRoot = findConvergeRoot(baseDir) ?? baseDir;
      const symlinkTargets = [
        join(projectRoot, ".opencode", "skills"),
        join(projectRoot, ".claude", "skills"),
      ];
      const createdByTarget: Array<{ target: string; names: string[] }> = [];

      const linkSkillRoots = (sourceRoot: string | undefined): void => {
        if (!sourceRoot || !existsSync(sourceRoot)) return;
        for (const target of symlinkTargets) {
          const names = ensureSkillSymlinks(sourceRoot, {
            skills: opts.skills,
            targetRoot: target,
          });
          if (names.length > 0) createdByTarget.push({ target, names });
        }
      };

      if (opts.skillDirs && Object.keys(opts.skillDirs).length > 0) {
        const { mkdirSync, symlinkSync, lstatSync } = await import("node:fs");
        for (const [name, absDir] of Object.entries(opts.skillDirs)) {
          for (const targetRoot of symlinkTargets) {
            mkdirSync(targetRoot, { recursive: true });
            const linkPath = join(targetRoot, name);
            try {
              lstatSync(linkPath);
              continue;
            } catch {
              /* doesn't exist */
            }
            try {
              symlinkSync(absDir, linkPath, "junction");
              const existing = createdByTarget.find((entry) => entry.target === targetRoot);
              if (existing) existing.names.push(name);
              else createdByTarget.push({ target: targetRoot, names: [name] });
            } catch (err: any) {
              console.warn(`   ⚠️  Failed skill junction ${name}: ${err.message}`);
            }
          }
        }
      }

      if (useNewSkills && opts.skillsRoot) {
        linkSkillRoots(opts.skillsRoot);
      } else if (useLegacySkills && projectRoot) {
        linkSkillRoots(join(projectRoot, ".converge", "skills"));
      }

      try {
        if (!fn) {
          const mod = await loadProvider<typeof import("@openplaybooks/openfn")>("@openplaybooks/openfn");
          fn = mod.openfn<T>(toOpenfnOptions(opts));
        }
        const result = await fn(enhancedInput);
        return { ...result, provider: "openfn" };
      } finally {
        for (const { target, names } of createdByTarget) {
          cleanupSkillSymlinks(names, target);
        }
      }
    };
  }

  // ── Codex provider ────────────────────────────────

  if (provider === "codex") {
    let fn: ReturnType<typeof import("@openplaybooks/codexfn").codexfn<T>> | undefined;
    return async (input?: string): Promise<AgentFnResult<T>> => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@openplaybooks/codexfn")>("@openplaybooks/codexfn");
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

  // ── DeepCode provider ────────────────────────────────

  if (provider === "deepcode") {
    let fn: ReturnType<typeof import("@openplaybooks/deepcodefn").deepcodefn<T>> | undefined;
    return async (input?: string): Promise<AgentFnResult<T>> => {
      if (!fn) {
        const mod = await loadProvider<typeof import("@openplaybooks/deepcodefn")>("@openplaybooks/deepcodefn");
        fn = mod.deepcodefn<T>(toDeepCodeOptions(opts));
      }
      let enhancedInput = input;
      if (useLegacySkills && input) {
        enhancedInput = enhancePrompt(input, { cwd: opts.cwd });
      }
      const result = await fn(enhancedInput);
      return { ...result, provider: "deepcode" };
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
    // the nearest ancestor (or self) containing .converge/.
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

function toDeepCodeOptions<T>(opts: AgentFnOptions<T>): DeepCodeFnOptions<T> {
  return {
    prompt: opts.prompt,
    schema: opts.schema,
    hooks: opts.hooks,
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
    cwd: opts.cwd,
    queue: opts.queue as DeepCodeFnOptions<T>["queue"],
    cliFlags: opts.cliFlags,
    model: opts.model,
    env: opts.env,
  };
}

// ─── Static Provider Registration ─────────────────────────────
//
// Built-in providers register themselves at module load.
// acp: acpfn handles SDK dependency lazily — only errors when called.
registerProvider("acp", async (opts) => {
  const { acpfn: _acpfn } = await import("@openplaybooks/acpfn");
  return (async (input?: string) => {
    const fn = (_acpfn as any)(toAcpOptions(opts as any));
    const result = await fn(input);
    return { ...result, provider: "acp" as const };
  }) as AgentFn<unknown>;
});
