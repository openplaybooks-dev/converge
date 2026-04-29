/**
 * Resolution helpers — createTaskContext, resolveChecks, resolvePrompt, resolveAgent, resolveSkill.
 */

import type {
  TaskContext,
  Check,
  CheckEntry,
} from "../../config/task-definition.ts";
import type { Unit } from "./unit.ts";

/**
 * Create task context for callback evaluation.
 */
export function createTaskContext(unit: Unit): TaskContext {
  return {
    level: "task",
    taskId: unit.id,
    projectDir: unit.getProjectRoot(),
    vars: unit.vars || {},
  };
}

/**
 * Resolve checks (supports callbacks and backward compat).
 * Handles three forms:
 *   - Full callback:  `(ctx) => CheckEntry[]`
 *   - Mixed array:    `Array<Check | ((ctx) => Check)>`
 *   - Static array:   `Check[]`
 *
 * Also sanitizes check commands for Windows compatibility before returning.
 */
export async function resolveChecks(unit: Unit): Promise<Check[]> {
  if (!unit.checks) {
    return (unit.vars?.inlineChecks as any[]) || [];
  }
  const ctx = createTaskContext(unit);
  const entries: CheckEntry[] =
    typeof unit.checks === "function" ? await unit.checks(ctx) : unit.checks;
  // Resolve any per-entry callbacks in the array
  const checks = await Promise.all(
    entries.map((e) => {
      if (typeof e === "function")
        return (e as (ctx: TaskContext) => Check | Promise<Check>)(ctx);
      return e as Check;
    }),
  );
  return checks.map(sanitizeCheck);
}

/**
 * Patch a single check command for cross-platform compatibility.
 * Catches known Windows-incompatible patterns before they ever run,
 * avoiding wasted AI repair cycles.
 */
function sanitizeCheck(check: Check): Check {
  if (!check.cmd) return check;
  const patched = sanitizeCheckCmd(check.cmd);
  if (patched === check.cmd) return check;
  console.log(
    `   🔧 Sanitized check '${check.id}': replaced Windows-incompatible command`,
  );
  return { ...check, cmd: patched };
}

/**
 * Replace known Windows-incompatible shell patterns with portable Node.js equivalents.
 *
 * Current rules:
 *  - /dev/stdin in a while-read loop → node reads the file directly
 *
 * Add new rules here when new incompatible patterns are discovered.
 */
function sanitizeCheckCmd(cmd: string): string {
  // Pattern: "while IFS= read -r line; do echo "$line" | node -e '...JSON.parse.../dev/stdin...' || exit 1; done < FILE"
  // /dev/stdin is not reliably available in Node.js on Windows Git Bash.
  if (cmd.includes("/dev/stdin")) {
    const fileMatch = cmd.match(/<\s*(\S+)\s*$/);
    if (fileMatch) {
      const file = fileMatch[1];
      if (/JSON\.parse/i.test(cmd)) {
        return `node -e "require('fs').readFileSync('${file}','utf8').split('\\n').filter(l=>l.trim()).forEach(l=>JSON.parse(l))"`;
      }
    }
  }
  return cmd;
}

/**
 * Strip YAML frontmatter from an agent definition file. Returns the
 * markdown body (the system prompt), trimmed.
 */
function stripFrontmatter(raw: string): string {
  const m = raw.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return (m ? m[1] : raw).trim();
}

/**
 * Read a custom agent's system prompt from `.converge/agents/<name>.md`.
 *
 * Mirrors Claude Code's `.claude/agents/` convention: the file is a
 * Markdown document with optional YAML frontmatter; the body is the
 * system prompt. When a TASK.md declares `agent: <name>` and a matching
 * file exists, the body is prepended to the task's own prompt at attempt
 * time so the agent's standing instructions are honored.
 *
 * Lets playbooks centralize cross-task discipline (e.g. "you are a
 * paid-API operator, do not hand-roll output") in a single file instead
 * of duplicating the same preamble in every TASK.md.
 *
 * Lookup order:
 *   1. <projectDir>/.converge/agents/<name>.md       (project scope)
 *   2. <projectDir>/.converge/agents/<name>/AGENT.md (project scope, dir form)
 *
 * Returns undefined when no file matches; callers fall back to the
 * task's own prompt.
 */
async function resolveAgentSystemPrompt(
  unit: Unit,
  agentName: string,
): Promise<string | undefined> {
  if (!agentName || typeof agentName !== "string") return undefined;
  try {
    const { readFile } = await import("node:fs/promises");
    const { existsSync } = await import("node:fs");
    const pathMod = await import("node:path");
    let dir = unit.path ? pathMod.dirname(unit.path) : "";
    let projectDir: string | null = null;
    while (dir) {
      if (existsSync(pathMod.join(dir, ".converge"))) {
        projectDir = dir;
        break;
      }
      const parent = pathMod.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    if (!projectDir) return undefined;
    const safe = agentName.replace(/[^a-zA-Z0-9_\-]/g, "");
    const candidates = [
      pathMod.join(projectDir, ".converge", "agents", `${safe}.md`),
      pathMod.join(projectDir, ".converge", "agents", safe, "AGENT.md"),
    ];
    for (const c of candidates) {
      if (existsSync(c)) {
        const raw = await readFile(c, "utf-8");
        return stripFrontmatter(raw);
      }
    }
  } catch {
    /* best-effort */
  }
  return undefined;
}

/**
 * Resolve prompt (supports callbacks and backward compat).
 *
 * When the unit declares `agent: <name>` in frontmatter or vars and a
 * matching `.converge/agents/<name>.md` file exists, the agent's system
 * prompt body is prepended to the resolved prompt. This mirrors Claude
 * Code's `.claude/agents/` subagent convention.
 *
 * The existing semantics of `unit.agent` (naming the runtime agent type
 * for navigator dispatch) are preserved — file-backed standing
 * instructions are an additive layer on top.
 */
export async function resolvePrompt(unit: Unit): Promise<string | undefined> {
  let basePrompt: string | undefined;
  if (unit.prompt) {
    if (typeof unit.prompt === "function") {
      const ctx = createTaskContext(unit);
      basePrompt = await unit.prompt(ctx);
    } else {
      basePrompt = unit.prompt;
    }
  } else {
    // Backward compat: fall back to vars.prompt
    basePrompt = unit.vars?.prompt as string | undefined;
  }

  const agentName =
    unit.agent ?? (unit.vars?.agent as string | undefined);
  if (agentName) {
    const preamble = await resolveAgentSystemPrompt(unit, agentName);
    if (preamble) {
      return basePrompt
        ? `${preamble}\n\n---\n\n${basePrompt}`
        : preamble;
    }
  }
  return basePrompt;
}

/**
 * Resolve agent (backward compat with vars).
 */
export function resolveAgent(unit: Unit): string | undefined {
  return unit.agent || (unit.vars?.agent as string | undefined);
}

/**
 * Resolve skill (backward compat with vars).
 */
export function resolveSkill(unit: Unit): string | string[] | undefined {
  if (unit.skill) return unit.skill;
  return (
    (unit.vars?.skill as string | string[] | undefined) ||
    (unit.vars?.skills as string[] | undefined)
  );
}
