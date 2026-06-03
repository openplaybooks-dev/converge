/**
 * TASK.md Task Definition
 *
 * Parser and mapper for the TASK.md markdown format — a pure-markdown
 * task definition that supports all features including external Seed scripts.
 *
 * TASK.md uses YAML frontmatter for structured configuration and a markdown
 * body for the AI prompt. It maps to the same TaskDefinition interface used
 * by task.ts and SKILL.md.
 *
 * Format priority: task.ts > SKILL.md > TASK.md
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { join as pathJoin } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { DiagnosisHint } from "../task/lifecycle/diagnose.ts";
import type { CheckDef } from "../task/lifecycle/after.ts";
import type { TaskDefinition, Check, PlanConfig } from "./task-definition.ts";
import type {
  AutoConvergePolicy,
  SkillContextStep,
} from "./skill-definition.ts";
import {
  parseChecks,
  parseAutoConverge,
  parseDiagnosisHints,
  parseContextSteps,
} from "./skill-definition.ts";
import { getPlaybookLayout } from "../task/playbook/layout.ts";
import {
  parseTaskModeFrontmatter,
  inferMode,
  type TaskMode,
  type SpawnerConfig,
  type ConvergerConfig,
} from "../task/mode/index.ts";

/* ------------------------------------------------------------------ */
/*  TASK.md Declarative spawn spec                                     */
/* ------------------------------------------------------------------ */

/**
 * A child task this parent should spawn at execution time. The framework
 * registers each `TaskMdSpawnSpec` in `tasks.jsonl` (via the same
 * `appendTaskUpsert` path the CLI uses) AFTER the parent's body runs
 * and BEFORE `syncSpawnedToDag` injects the new rows into the live DAG.
 *
 * Authoring shape:
 *
 *     spawns:
 *       - id: child-alpha
 *         template: .converge/playbooks/<pb>/templates/child-alpha/TASK.md
 *         vars: { wave: 0 }
 *         inherit_vars: true        # default: inherit parent's vars
 *
 * Var precedence (lowest → highest):
 *   1. template's own vars: frontmatter
 *   2. parent's vars: (only if inherit_vars !== false)
 *   3. parent's CONVERGE_TASK_WAVE env (auto-injected as vars.wave)
 *   4. spec-level vars: (caller's explicit override wins)
 */
export interface TaskMdSpawnSpec {
  /** Stable identifier for the spawned task. Must pass assertSafeId. */
  id: string;
  /** Path to the template TASK.md (relative to project root). */
  template: string;
  /** Per-child variable overrides; merged on top of parent + template. */
  vars?: Record<string, unknown>;
  /** When false, do NOT merge parent's vars into the child. Default: true. */
  inherit_vars?: boolean;
  /** Human-readable label; falls back to template's title if absent. */
  title?: string;
  /** Free-form description that propagates into the spawned row. */
  description?: string;
}

/* ------------------------------------------------------------------ */
/*  TASK.md Executor config                                            */
/* ------------------------------------------------------------------ */

export interface TaskMdExecutor {
  type: "ai" | "script" | "function";
  path?: string;
  args?: string[];
  env?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  TASK.md Plan config                                                */
/* ------------------------------------------------------------------ */

export interface TaskMdPlan {
  prompt?: string;
  output?: string;
  outputPrompt?: string;
}

/* ------------------------------------------------------------------ */
/*  TASK.md Frontmatter Interface                                      */
/* ------------------------------------------------------------------ */

export interface TaskMdDef {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  skills?: string[];
  executor?: TaskMdExecutor;
  blocking?: boolean;
  requires?: string[];
  tags?: string[];
  inputs?: string[];
  outputs?: string[];
  tests?: CheckDef[];
  checks?: CheckDef[];
  needs?: CheckDef[];
  agent?: string;
  ai?: Record<string, unknown>;
  plan?: TaskMdPlan;
  materials?: string[];
  materialization?: string;
  "allowed-tools"?: string[];
  "diagnosis-hints"?: DiagnosisHint[];
  "correction-budget"?: number;
  "context-depth"?: number;
  "auto-converge"?: boolean | AutoConvergePolicy;
  context?: SkillContextStep[];
  "on-fail"?: { reset?: string[] };
  vars?: Record<string, unknown>;
  passthrough?: boolean;
  /** When true, always use the full TASK body prompt, never the gap-detection shortcut. */
  "retry-full-body"?: boolean;
  /** RFC 0026: opt-out for sibling-output collision detector. Default: "per-child". */
  output_scope?: "per-child" | "shared";
  /**
   * Converge config.
   *
   * Legacy do-while-loop shape: `{ prompt, cmd }` — runs after main body.
   * RFC 0022 converger shape: `{ max_waves, halt_when, wave_check }` —
   * consumed when `mode: converger`.
   *
   * Disambiguated at parse time by the presence of `max_waves` / `halt_when` /
   * `wave_check` keys vs `prompt` / `cmd` keys.
   */
  converge?: Record<string, unknown>;
  /** Declarative child tasks to spawn after the body runs. See `TaskMdSpawnSpec`. */
  spawns?: TaskMdSpawnSpec[];
  /** RFC 0022 task mode — `task` | `spawner` | `converger` | `gateway`. */
  mode?: import("../task/mode/index.ts").TaskMode;
  /** RFC 0022 spawner config — only meaningful with `mode: spawner`. */
  spawn?: Record<string, unknown>;
  /** Human review artifact configuration for gateway tasks. */
  handoff?: TaskMdHandoff;
  /** RFC 0021: stub command and optional cleanup — run instead of AI executor in --stub mode. */
  stub?: { cmd: string; cleanup?: string };
  /** Shell command path for script-based stubs. In --stub mode, if a script exists at
   * taskFolder/scripts/<cmd>, it is used as the stub command. In normal mode, ignored. */
  cmd?: string;
}

export interface TaskMdHandoff {
  artifact: string;
  format?: "md" | "html";
  generate?: string;
  skill?: string;
}

/**
 * Outputs that gate a task's "is it already done?" cache decision.
 *
 * RFC 0047: a non-gateway `handoff:` block declares a review artifact the
 * task must generate. It lives outside `outputs:` but is just as required —
 * so a cached task whose handoff artifact is missing must be re-run, not
 * skipped. Fold the artifact into the output-existence check (deduped;
 * gateways generate nothing, so they are exempt). Mirrors the runtime gap
 * detector in `find-gaps.ts` so the scheduler cache layer and the
 * convergence loop agree on what "done" means.
 */
export function cacheOutputs(taskDef: {
  outputs?: string[];
  handoff?: { artifact?: string };
  mode?: string;
}): string[] {
  const outputs = taskDef?.outputs ?? [];
  const artifact =
    taskDef?.mode !== "gateway" ? taskDef?.handoff?.artifact : undefined;
  return artifact && !outputs.includes(artifact)
    ? [...outputs, artifact]
    : outputs;
}

/* ------------------------------------------------------------------ */
/*  TaskMdShape — canonical spawn currency for ctx.spawn()             */
/* ------------------------------------------------------------------ */

/**
 * Plain-object shape accepted by ctx.spawn(). Unifies TaskMdDef,
 * ScriptTaskOutput, and the JSON objects seed.js scripts produce.
 *
 * Every field is optional except `id`.
 */
export interface TaskMdShape {
  id: string;
  title?: string;
  description?: string;
  skills?: string[];
  agent?: string;
  ai?: Record<string, unknown>;
  executor?: TaskMdExecutor;
  blocking?: boolean;
  inputs?: string[];
  outputs?: string[];
  tests?: CheckDef[];
  checks?: CheckDef[];
  needs?: CheckDef[];
  plan?: TaskMdPlan;
  tags?: string[];
  materials?: string[];
  materialization?: string;
  vars?: Record<string, unknown>;
  "diagnosis-hints"?: DiagnosisHint[];
  "correction-budget"?: number;
  "auto-converge"?: boolean | AutoConvergePolicy;
  context?: SkillContextStep[];
  "on-fail"?: { reset?: string[] };
  /** Skip the AI agent — execute the body's shell commands directly. */
  passthrough?: boolean;
  /** Converge config for do-while loops. Runs after main body. */
  converge?: { prompt?: string; cmd?: string };
  /** Declarative child tasks to spawn after the body runs. */
  spawns?: TaskMdSpawnSpec[];
  /** Human review artifact configuration for gateway tasks. */
  handoff?: TaskMdHandoff;
  /** RFC 0021: stub command and optional cleanup. */
  stub?: { cmd: string; cleanup?: string };
  /** RFC 0026: opt-out for sibling-output collision detector. Default: "per-child". */
  output_scope?: "per-child" | "shared";
  /**
   * RFC 0034: `depends_on` is deprecated for declarative tasks (auto-chained
   * alphabetically). Still used internally by the spawn system to wire parent
   * → child edges, but never written to TASK.md frontmatter.
   */
  depends_on?: string[];
  /** Task mode: task | spawner | converger | gateway */
  mode?: TaskMode;
  /** RFC 0022 spawner config — only meaningful with `mode: spawner`. */
  spawn?: Record<string, unknown>;
  /** Markdown body (content below frontmatter) */
  body?: string;
  /** Alias for body — backward compat with script JSON */
  prompt?: string;
}

/* ------------------------------------------------------------------ */
/*  Reserved frontmatter keys (not passed to vars)                     */
/* ------------------------------------------------------------------ */

const RESERVED_KEYS = new Set([
  "id",
  "name",
  "title",
  "description",
  "skills",
  "executor",
  "seed",
  "blocking",
  "requires",
  "tags",
  "inputs",
  "outputs",
  "output_scope",
  "tests",
  "checks",
  "needs",
  "agent",
  "ai",
  "plan",
  "materials",
  "allowed-tools",
  "diagnosis-hints",
  "correction-budget",
  "context-depth",
  "auto-converge",
  "context",
  "materialization",
  "on-fail",
  "vars",
  "from_seed",
  "passthrough",
  "retry-full-body",
  "converge",
  "spawns",
  "mode",
  "spawn",
  "stub",
]);

/* ------------------------------------------------------------------ */
/*  Parser                                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse TASK.md file into frontmatter + body.
 * Returns null if the file doesn't exist or can't be parsed.
 */
export async function parseTaskMd(taskMdPath: string): Promise<{
  def: TaskMdDef;
  body: string;
} | null> {
  if (!existsSync(taskMdPath)) return null;

  // If given a directory, resolve to SKILL.md or TASK.md inside it
  if (statSync(taskMdPath).isDirectory()) {
    const skill = pathJoin(taskMdPath, "SKILL.md");
    const task = pathJoin(taskMdPath, "TASK.md");
    if (existsSync(skill)) taskMdPath = skill;
    else if (existsSync(task)) taskMdPath = task;
    else return null;
  }

  try {
    const raw = await readFile(taskMdPath, "utf8");

    // Frontmatter is required — TASK.md without `---` delimiters is a
    // malformed task definition, not a "body-only" file. The canonical
    // emitters (`serializeTaskMd`, `converge render` against the
    // playbook templates) always produce frontmatter; anything else is
    // either a corruption (caught by the spawn-time gate) or a hand-
    // crafted artifact that doesn't belong in the inventory.
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) {
      throw new Error(
        `${taskMdPath}: TASK.md must start with \`---\` YAML frontmatter delimiter`,
      );
    }

    const frontmatter = match[1];
    const body = match[2] ?? "";

    const parsed = parseYaml(frontmatter) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      throw new Error(
        `${taskMdPath}: frontmatter must parse to a YAML mapping (key: value pairs)`,
      );
    }

    const def = parseFrontmatterToTaskMdDef(parsed);

    // Collect non-reserved keys into vars
    const extraVars: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!RESERVED_KEYS.has(key)) {
        extraVars[key] = value;
      }
    }

    // Merge explicit `vars` from frontmatter with extra keys
    if (parsed.vars && typeof parsed.vars === "object") {
      Object.assign(extraVars, parsed.vars);
    }

    if (Object.keys(extraVars).length > 0) {
      def.vars = extraVars;
    }

    return { def, body: body.trim() };
  } catch (err: any) {
    // Attempt to auto-repair YAML frontmatter (e.g. unquoted values with colons)
    try {
      const raw = await readFile(taskMdPath, "utf8");
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (match) {
        const repaired = repairYamlFrontmatter(match[1]);
        if (repaired !== match[1]) {
          const repairedParsed = parseYaml(repaired) as Record<string, unknown>;
          if (repairedParsed && typeof repairedParsed === "object") {
            // Write the repaired file back
            const lineEnding = raw.includes("\r\n") ? "\r\n" : "\n";
            const repairedRaw = `---${lineEnding}${repaired}${lineEnding}---${lineEnding}${match[2]}`;
            await writeFile(taskMdPath, repairedRaw, "utf8");
            console.warn(`   🔧 Auto-repaired YAML in: ${taskMdPath}`);

            const def = parseFrontmatterToTaskMdDef(repairedParsed);
            const extraVars: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(repairedParsed)) {
              if (!RESERVED_KEYS.has(key)) {
                extraVars[key] = value;
              }
            }
            if (
              repairedParsed.vars &&
              typeof repairedParsed.vars === "object"
            ) {
              Object.assign(extraVars, repairedParsed.vars);
            }
            if (Object.keys(extraVars).length > 0) {
              def.vars = extraVars;
            }
            return { def, body: (match[2] ?? "").trim() };
          }
        }
      }
    } catch (repairErr) {
      // Repair attempt itself crashed (rare — usually a re-read or YAML
      // error). Log it so it's observable, then fall through to the
      // evidence-writing path which reports the *original* error to the
      // caller. We don't want the repair attempt's failure to mask the
      // root cause.
      if (process.env.CONVERGE_DEBUG) {
        console.warn(
          `   Debug: YAML auto-repair attempt failed: ${
            (repairErr as Error)?.message ?? repairErr
          }`,
        );
      }
    }

    // Both the original parse and the auto-repair failed. Preserve evidence
    // for the operator AND for the self-repair flow: write the rejected bytes
    // plus a structured EVIDENCE.json sibling that the repair strategy reads.
    // The evidence envelope is the framework's canonical fail-feedback packet
    // for definition gaps — what was expected, what was found, where the gap
    // is. Repair AI consumes this to emit a corrected TASK.md.
    try {
      const raw = await readFile(taskMdPath, "utf8");
      await writeFile(`${taskMdPath}.rejected`, raw, "utf8");
      const evidence = {
        kind: "definition",
        taskMdPath,
        rejectedPath: `${taskMdPath}.rejected`,
        parseError: String(err?.message ?? err),
        detectedAt: new Date().toISOString(),
        expected: {
          format:
            "TASK.md with `---` delimited YAML frontmatter, then markdown body.",
          requiredKeys: ["id"],
          listValuedKeys: ["outputs", "inputs", "checks", "tags", "skills"],
        },
        actual: {
          firstBytes: raw.slice(0, 400),
          byteLength: raw.length,
        },
        suggestedFix:
          "Re-emit the TASK.md frontmatter with each list-valued key followed by `  - item` bullets, and ensure scalar values containing colons, pipes, or backslashes are quoted.",
      };
      await writeFile(
        `${taskMdPath}.EVIDENCE.json`,
        JSON.stringify(evidence, null, 2),
        "utf8",
      );
    } catch {
      // Best effort — proceed with the diagnostic log.
    }

    console.warn(`   Warning: Failed to parse TASK.md: ${taskMdPath}`);
    console.warn(`   Error: ${err.message}`);
    console.warn(
      `   Evidence: ${taskMdPath}.rejected, ${taskMdPath}.EVIDENCE.json`,
    );
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  YAML Frontmatter Repair                                            */
/* ------------------------------------------------------------------ */

/** Frontmatter keys that must always be YAML lists when present. */
const LIST_KEYS = new Set([
  "outputs",
  "inputs",
  "checks",
  "needs",
  "tests",
  "tags",
  "skills",
  "materials",
  "allowed-tools",
]);

/**
 * Attempt to fix common YAML issues in frontmatter.
 *
 * Handles two patterns:
 *
 *   1. "Nested mappings are not allowed in compact mappings" — caused by an
 *      unquoted scalar value containing a colon (e.g. `cmd: grep "Entity: Foo"`).
 *      Fix: wrap the value in double quotes.
 *
 *   2. List-typed keys (`outputs:`, `inputs:`, `checks:`, …) followed by a
 *      polluted scalar line that should have been a `-` bullet — typically
 *      because a templating substitution leaked shell metacharacters (pipes,
 *      backslashes, escaped brackets) into a list slot. The corruption looks
 *      like:
 *          outputs:
 *          orderBook\|order_book' src/...|  - src/app/markets/[id]/page.tsx
 *      Fix: discard the polluted line and any subsequent non-bullet text
 *      until the next valid YAML key, leaving a syntactically valid (possibly
 *      empty) list. Downstream validation will then notice the missing outputs
 *      and a proper repair flow can target them — much better than a parse
 *      failure that gives no diagnostic.
 */
function repairYamlFrontmatter(yaml: string): string {
  const lines = yaml.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // Pattern 2: list-typed key with polluted continuation lines.
    const listKeyMatch = line.match(/^(\s*)([\w-]+):\s*$/);
    if (listKeyMatch && LIST_KEYS.has(listKeyMatch[2])) {
      out.push(line);
      const baseIndent = listKeyMatch[1];
      // Walk forward, only accept properly-indented `- …` bullets; drop any
      // intervening scalar pollution.
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        const nextTrim = next.trimStart();
        if (!nextTrim) {
          // Blank line — end of block.
          break;
        }
        // A new top-level (or sibling) key at the same indent — end of block.
        const siblingKey = next.match(/^(\s*)([\w-]+):/);
        if (siblingKey && siblingKey[1].length <= baseIndent.length) {
          break;
        }
        const isBullet = /^\s+-\s/.test(next);
        if (isBullet) {
          out.push(next);
          j++;
          continue;
        }
        // Polluted scalar line under a list key — drop it. Try to recover
        // any embedded `- path` fragments by extracting bullet-looking
        // substrings after a `|`, which is the exact corruption pattern.
        const recovered = next.match(/(?:^|\|)\s*(-\s+\S.*?)$/);
        if (recovered) {
          out.push(`${baseIndent}  ${recovered[1]}`);
        }
        // Otherwise silently drop — better an empty list than a parse error.
        j++;
      }
      i = j - 1;
      continue;
    }

    // Pattern 1: scalar values with unquoted colons or backslashes.
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) {
      out.push(line);
      continue;
    }
    const m = line.match(/^(\s*)([\w.@\-/]+):\s(.+)$/);
    if (!m) {
      out.push(line);
      continue;
    }
    const [, indent, key, value] = m;
    if (/^['"]/.test(value) || /^[|>]/.test(value)) {
      out.push(line);
      continue;
    }
    if (value.includes(":") || value.includes("\\")) {
      const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      out.push(`${indent}${key}: "${escaped}"`);
      continue;
    }
    out.push(line);
  }

  return out.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Mapper: TaskMdDef → TaskDefinition                                 */
/* ------------------------------------------------------------------ */

/**
 * Map a parsed TASK.md definition to a TaskDefinition.
 *
 * @param def - Parsed TASK.md frontmatter
 * @param body - Markdown body (becomes the AI prompt)
 * @param taskId - Task ID derived from directory name (source of truth)
 * @param _taskDir - Unused (kept for call-site compatibility; previously
 *                   used to resolve legacy seed scripts).
 */
export function mapTaskMdToTaskDefinition(
  def: TaskMdDef,
  body: string,
  taskId: string,
  _taskDir?: string,
): TaskDefinition {
  // Cross-field validation: surface a thrown error here so authoring
  // tools get a one-line fix hint at parse time (mode: task + spawn:,
  // mode: converger without halt_when, etc.). Body is the second arg
  // because gateway validation needs to see the markdown body.
  // The legacy do-while `converge: { prompt, cmd }` shape is NOT the
  // RFC 0022 converger block — exclude it from the strict mode schema,
  // mirroring resolveTaskMode's disambiguation.
  const convergeIsRfc0022 =
    def.converge != null &&
    typeof def.converge === "object" &&
    ("max_waves" in def.converge ||
      "halt_when" in def.converge ||
      "wave_check" in def.converge);
  const modeCheck = parseTaskModeFrontmatter(
    {
      ...(def as Record<string, unknown>),
      converge: convergeIsRfc0022 ? def.converge : undefined,
    },
    body,
  );
  if (!modeCheck.ok) {
    throw new Error(modeCheck.error);
  }

  // Build vars from def.vars + materials
  const vars: Record<string, unknown> = { ...(def.vars ?? {}) };
  if (def.materials) {
    vars._materials = def.materials;
  }

  // Map plan config
  let planConfig: PlanConfig | undefined;
  if (def.plan) {
    planConfig = {};
    if (def.plan.prompt) planConfig.prompt = def.plan.prompt;
    if (def.plan.output) planConfig.output = def.plan.output;
    if (def.plan.outputPrompt) planConfig.outputPrompt = def.plan.outputPrompt;
  }

  // Map tests from CheckDef[] to Check[]
  const checks: Check[] | undefined = (def.tests ?? def.checks)?.map((c) => ({
    id: c.id,
    cmd: c.cmd,
    description: c.description,
    type: c.type,
    check: c.check,
    name: c.name,
    args: c.args,
    agent: c.agent,
    model: c.model,
    timeoutMs: c.timeoutMs,
  }));

  // Resolve spawn/converge config blocks. Mode is derived at runtime from artifacts.
  const resolved = resolveTaskMode(def);

  const taskDef: TaskDefinition = {
    id: taskId, // Always from directory name
    title: def.title ?? taskId,
    description: def.description,
    inputs: def.inputs,
    outputs: def.outputs,
    agent: def.agent,
    ai: def.ai as import("./task-definition.ts").TaskAIConfig | undefined,
    skill: def.skills, // TASK.md `skills` array → TaskDefinition `skill` field
    checks,
    tags: def.tags,
    blocking: def.blocking,
    prompt: body || undefined,
    vars,
    planConfig,
    materialization: def.materialization,
    onFail: def["on-fail"] ? { reset: def["on-fail"].reset } : undefined,
    passthrough: def.passthrough,
    handoff: def.handoff,
    stub: def.stub,
    cmd: def.cmd,
    spawn: resolved.spawn,
    modeConverge: resolved.converge,
    mode:
      def.mode ??
      (resolved.converge ? "converger" : resolved.spawn ? "spawner" : "task"),
  };

  return taskDef;
}

/* ------------------------------------------------------------------ */
/*  Sub-parsers                                                        */
/* ------------------------------------------------------------------ */

function parseStringArray(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    // Filter out objects (e.g. YAML-parsed {{placeholder}} flow mappings)
    // and only keep actual string values
    const strings = raw
      .filter((item) => typeof item === "string" || typeof item === "number")
      .map(String);
    return strings.length > 0 ? strings : undefined;
  }
  if (typeof raw === "string") {
    return [raw];
  }
  return undefined;
}

/**
 * Strict variant of `parseStringArray` — throws on shape mismatch
 * instead of silently returning undefined. Used for reserved
 * list-typed keys (outputs, inputs, checks, etc.) where a
 * scalar/number/object value would otherwise produce a silently-empty
 * field and confuse downstream checks.
 *
 * Accepts:
 *   - undefined / null  → returns undefined (the field is optional)
 *   - string[]          → returns as-is
 *   - number[]          → coerced to string[] (legacy compat)
 *   - string            → wrapped as single-element array (legacy compat)
 *
 * Rejects:
 *   - number, boolean, object → throws with field name and actual type
 *   - array containing non-string-coercible items → throws
 */
function parseStringArrayStrict(
  raw: unknown,
  fieldName: string,
): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "string") return [raw];
  if (!Array.isArray(raw)) {
    throw new Error(
      `frontmatter field \`${fieldName}\` must be a YAML list of strings, ` +
        `got ${typeof raw} (${JSON.stringify(raw).slice(0, 80)})`,
    );
  }
  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item === "string") {
      out.push(item);
    } else if (typeof item === "number" || typeof item === "boolean") {
      out.push(String(item));
    } else {
      throw new Error(
        `frontmatter field \`${fieldName}[${i}]\` must be a string, ` +
          `got ${typeof item} (${JSON.stringify(item).slice(0, 80)})`,
      );
    }
  }
  return out.length > 0 ? out : undefined;
}

function parseAIConfig(raw: unknown): Record<string, unknown> | undefined {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Object.keys(obj).length === 0) return undefined;
    return obj;
  }
  return undefined;
}

/**
 * Strip human-readable annotations from output paths.
 *
 * TASK.md authors annotate outputs with ` (new)`, ` (modified)`, or
 * ` (deleted)` to signal intent — e.g. `packages/core/src/foo.ts (new)`.
 * Annotations may include extra description after the keyword, e.g.
 * ` (modified — keep atomic-write only)`. These annotations are NOT part
 * of the file path. The framework must strip them before resolving the
 * path against the filesystem.
 *
 * Returns the clean path with the annotation removed. The annotation kind
 * is available for consumers that need to vary behavior (e.g. findGaps()
 * checks for file *absence* on `(deleted)` outputs).
 */
const OUTPUT_ANNOTATION_RE = /\s+\((new|modified|deleted)\b[^)]*\)$/;

/** @internal strip human-readable ` (new)`/` (modified)`/` (deleted)` from output paths */
export function cleanOutputPath(output: string): string {
  return output.replace(OUTPUT_ANNOTATION_RE, "");
}

function parseOutputs(raw: unknown): string[] | undefined {
  // Strict parser: `outputs:` is the most important field — checks
  // depend on it, repair attempts depend on it, the doctor command
  // depends on it. A silently-empty outputs would let a broken sprint
  // verify as "passed" because there's nothing to fail against.
  const rawOutputs = parseStringArrayStrict(raw, "outputs");
  if (!rawOutputs) return undefined;
  return rawOutputs.map(cleanOutputPath);
}

function parseExecutor(raw: unknown): TaskMdExecutor | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  if (type !== "ai" && type !== "script" && type !== "function")
    return undefined;
  return {
    type,
    path: obj.path ? String(obj.path) : undefined,
    args: parseStringArray(obj.args),
    env: parseStringRecord(obj.env),
  };
}

function parseSeeds(raw: unknown): undefined {
  if (raw === undefined || raw === null) return undefined;
  throw new Error(
    "Legacy `seeds:` is removed. Use `mode: spawner` with `spawn.plan.jsonl` " +
      "(RFC 0021/0022). See docs/rfcs/0022-task-mode-contract.md.",
  );
}

function parseTests(raw: unknown): CheckDef[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error("tests: must be an array of object entries");
  }

  const results: CheckDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("tests: entries must be objects: { id, cmd }");
    }

    const obj = item as Record<string, unknown>;
    if (obj.type === "ai" || obj.check !== undefined) {
      throw new Error(
        "tests: AI assertions are not allowed; use deterministic cmd checks that point at scripts/... when you need reusable logic",
      );
    }

    if (typeof obj.name === "string" && obj.name.length > 0) {
      throw new Error(
        "tests: named test references are removed. Inline the command and point it at scripts/... instead.",
      );
    }

    if (
      typeof obj.id === "string" &&
      obj.id.length > 0 &&
      typeof obj.cmd === "string" &&
      obj.cmd.length > 0
    ) {
      results.push({
        id: obj.id,
        description: obj.description ? String(obj.description) : obj.id,
        type: "cmd",
        cmd: obj.cmd,
      });
      continue;
    }

    throw new Error("tests: each entry must be { id, cmd }");
  }

  return results.length > 0 ? results : undefined;
}

function parsePlan(raw: unknown): TaskMdPlan | undefined {
  if (raw === undefined || raw === null || raw === false) return undefined;
  if (raw === true) return {};
  if (typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  return {
    prompt: obj.prompt ? String(obj.prompt) : undefined,
    output: obj.output ? String(obj.output) : undefined,
    outputPrompt: obj.outputPrompt ? String(obj.outputPrompt) : undefined,
  };
}

function parseSeedMode(raw: unknown): undefined {
  if (raw == null) return undefined;
  const err = new Error(
    "`seed: { mode: cli }` is removed. Use `mode: spawner` with a body that " +
      "writes `$CONVERGE_TASK_DIR/spawn.plan.jsonl`, or `mode: converger` for " +
      "multi-wave loops. See docs/rfcs/0021-declarative-spawn-apply.md and " +
      "docs/rfcs/0022-task-mode-contract.md.",
  );
  (err as Error & { errorCode?: string }).errorCode = "schema-removed";
  throw err;
}

function parseOnFail(raw: unknown): { reset?: string[] } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const reset = parseStringArray(obj.reset);
  if (!reset) return undefined;
  return { reset };
}

function parseStringRecord(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    result[key] = String(value);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/* ------------------------------------------------------------------ */
/*  parseTaskMdString — parse in-memory TASK.md string → TaskMdShape   */
/* ------------------------------------------------------------------ */

/**
 * Parse a TASK.md-formatted string (frontmatter + body) into a TaskMdShape.
 * Unlike `parseTaskMd()` which reads from a file path, this works on
 * in-memory strings — useful for `rawMd()` spawn targets.
 *
 * Throws on invalid YAML frontmatter.
 */
export function parseTaskMdString(raw: string): TaskMdShape {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(
      "parseTaskMdString: input must start with `---` YAML frontmatter delimiter",
    );
  }

  const frontmatter = match[1];
  const body = (match[2] ?? "").trim();

  const parsed = parseYaml(frontmatter) as Record<string, unknown>;
  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      "parseTaskMdString: frontmatter must parse to a YAML mapping (key: value pairs)",
    );
  }

  const def = parseFrontmatterToTaskMdDef(parsed);

  // Collect non-reserved keys into vars
  const extraVars: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!RESERVED_KEYS.has(key)) {
      extraVars[key] = value;
    }
  }
  if (parsed.vars && typeof parsed.vars === "object") {
    Object.assign(extraVars, parsed.vars);
  }

  return {
    id: def.id ?? "",
    title: def.title,
    description: def.description,
    skills: def.skills,
    agent: def.agent,
    ai: def.ai,
    executor: def.executor,
    blocking: def.blocking,
    inputs: def.inputs,
    outputs: def.outputs,
    tests: def.tests,
    checks: def.tests ?? def.checks,
    needs: def.needs,
    plan: def.plan,
    tags: def.tags,
    materials: def.materials,
    materialization: def.materialization,
    vars: Object.keys(extraVars).length > 0 ? extraVars : def.vars,
    "diagnosis-hints": def["diagnosis-hints"],
    "correction-budget": def["correction-budget"],
    "auto-converge": def["auto-converge"],
    context: def.context,
    "on-fail": def["on-fail"],
    passthrough: def.passthrough,
    converge: def.converge,
    spawns: def.spawns,
    handoff: def.handoff,
    stub: def.stub,
    mode: def.mode,
    spawn: def.spawn,
    body: body || undefined,
  };
}

function parseFromSeed(raw: unknown): undefined {
  if (raw == null) return undefined;
  throw new Error(
    "`from_seed:` is removed. Spawned tasks are now created via `converge apply " +
      "<manifest.jsonl>` (RFC 0021); the parent declares `mode: spawner`. See " +
      "docs/rfcs/0021-declarative-spawn-apply.md.",
  );
}

function parseConverge(raw: unknown): Record<string, unknown> | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") {
    return raw.trim().length > 0 ? { prompt: raw } : undefined;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("converge: must be a string or mapping");
  }
  const converge = raw as Record<string, unknown>;
  // RFC 0022 converger shape (max_waves / halt_when / wave_check) — pass
  // through as-is; the mode parser owns its schema and cross-field rules.
  const isRfc0022Shape =
    "max_waves" in converge ||
    "halt_when" in converge ||
    "wave_check" in converge;
  if (isRfc0022Shape) return converge;
  // Legacy do-while shape: { prompt, cmd }.
  const prompt =
    typeof converge.prompt === "string" && converge.prompt.trim().length > 0
      ? converge.prompt
      : undefined;
  const cmd =
    typeof converge.cmd === "string" && converge.cmd.trim().length > 0
      ? converge.cmd
      : undefined;
  if (!prompt && !cmd) {
    throw new Error("converge: must declare prompt: or cmd:");
  }
  return { ...(prompt ? { prompt } : {}), ...(cmd ? { cmd } : {}) };
}

function parseHandoff(raw: unknown): TaskMdHandoff | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("handoff: must be a mapping");
  }
  const h = raw as Record<string, unknown>;
  const artifact = typeof h.artifact === "string" ? h.artifact.trim() : "";
  if (!artifact) {
    throw new Error("handoff.artifact: required, must be a non-empty string");
  }
  const format =
    h.format === undefined || h.format === null
      ? undefined
      : h.format === "md" || h.format === "html"
        ? h.format
        : (() => {
            throw new Error("handoff.format: must be either `md` or `html`");
          })();
  return {
    artifact,
    ...(format ? { format } : {}),
    ...(typeof h.generate === "string" && h.generate.trim().length > 0
      ? { generate: h.generate }
      : {}),
    ...(typeof h.skill === "string" && h.skill.trim().length > 0
      ? { skill: h.skill }
      : {}),
  };
}

/**
 * Parse the `spawns:` frontmatter list into an array of `TaskMdSpawnSpec`.
 *
 * Each entry must be an object with at minimum `id` (string) and
 * `template` (string). Optional fields: `vars` (object),
 * `inherit_vars` (boolean), `title`/`description` (strings).
 *
 * Bad entries throw with a precise message naming the index — surfaces
 * authoring errors immediately rather than silently dropping rows.
 */
function parseSpawns(raw: unknown): TaskMdSpawnSpec[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error(
      "spawns: must be a YAML list of spawn-spec entries (got " +
        typeof raw +
        ")",
    );
  }
  const specs: TaskMdSpawnSpec[] = [];
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i];
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(
        `spawns[${i}]: must be a YAML mapping (got ${
          Array.isArray(entry) ? "list" : typeof entry
        })`,
      );
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || e.id.length === 0) {
      throw new Error(`spawns[${i}].id: required, must be a non-empty string`);
    }
    if (typeof e.template !== "string" || e.template.length === 0) {
      throw new Error(
        `spawns[${i}].template: required, must be a non-empty path string`,
      );
    }
    const vars =
      e.vars && typeof e.vars === "object" && !Array.isArray(e.vars)
        ? (e.vars as Record<string, unknown>)
        : undefined;
    const inheritVars =
      typeof e.inherit_vars === "boolean" ? e.inherit_vars : undefined;
    specs.push({
      id: e.id,
      template: e.template,
      ...(vars ? { vars } : {}),
      ...(inheritVars !== undefined ? { inherit_vars: inheritVars } : {}),
      ...(typeof e.title === "string" && e.title.length > 0
        ? { title: e.title }
        : {}),
      ...(typeof e.description === "string" && e.description.length > 0
        ? { description: e.description }
        : {}),
    });
  }
  return specs;
}

/* ------------------------------------------------------------------ */
/*  Serializer — TaskMdShape → TASK.md string                         */
/* ------------------------------------------------------------------ */

/**
 * Serialize a `TaskMdShape` to a complete TASK.md document
 * (`---` frontmatter + body). Uses the `yaml` library — no hand-written
 * string concatenation, no per-field quoting rules. Special characters
 * (pipes, backslashes, colons, newlines, escaped brackets) round-trip
 * cleanly through `parseTaskMdString(serializeTaskMd(shape))`.
 *
 * Fields with undefined values are omitted from the output.
 * Empty arrays and empty objects are omitted (they would emit `[]`/`{}`
 * which round-trip as different from `undefined`).
 *
 * @throws if the shape is missing a required `id`.
 */
export function serializeTaskMd(shape: TaskMdShape): string {
  if (!shape.id || typeof shape.id !== "string") {
    throw new Error("serializeTaskMd: shape.id is required");
  }

  // Build the frontmatter object in the canonical key order. The yaml
  // library preserves insertion order; ordering matters for deterministic
  // round-trips and for diff-stability across runs.
  const fm: Record<string, unknown> = {};
  fm.id = shape.id;
  if (shape.title !== undefined) fm.title = shape.title;
  if (shape.description !== undefined) fm.description = shape.description;
  if (shape.agent !== undefined) fm.agent = shape.agent;
  if (shape.skills && shape.skills.length > 0) fm.skills = shape.skills;
  if (shape.ai && Object.keys(shape.ai).length > 0) fm.ai = shape.ai;
  if (shape.executor !== undefined) fm.executor = shape.executor;
  if (shape.blocking !== undefined) fm.blocking = shape.blocking;
  if (shape.inputs && shape.inputs.length > 0) fm.inputs = shape.inputs;
  if (shape.outputs && shape.outputs.length > 0) fm.outputs = shape.outputs;
  // tests is canonical; checks is the legacy alias. If both are set, prefer
  // tests (matches parseFrontmatterToTaskMdDef which rejects "both").
  if (shape.tests && shape.tests.length > 0) {
    fm.tests = shape.tests;
  } else if (shape.checks && shape.checks.length > 0) {
    fm.checks = shape.checks;
  }
  if (shape.needs && shape.needs.length > 0) fm.needs = shape.needs;
  if (shape.plan !== undefined) fm.plan = shape.plan;
  if (shape.tags && shape.tags.length > 0) fm.tags = shape.tags;
  if (shape.materials && shape.materials.length > 0)
    fm.materials = shape.materials;
  if (shape.materialization !== undefined)
    fm.materialization = shape.materialization;
  if (shape["diagnosis-hints"] !== undefined)
    fm["diagnosis-hints"] = shape["diagnosis-hints"];
  if (shape["correction-budget"] !== undefined)
    fm["correction-budget"] = shape["correction-budget"];
  if (shape["auto-converge"] !== undefined)
    fm["auto-converge"] = shape["auto-converge"];
  if (shape.context !== undefined) fm.context = shape.context;
  if (shape["on-fail"] !== undefined) fm["on-fail"] = shape["on-fail"];
  if (shape.vars && Object.keys(shape.vars).length > 0) fm.vars = shape.vars;
  // Passthrough + converge: were declared in TaskMdShape but not emitted
  // by the serializer — that meant `converge spawn task --task-file <tpl>`
  // silently dropped these fields when round-tripping through
  // mergeWiringFlags. Restore them here so spawned tasks inherit the
  // passthrough/do-while behavior declared in their templates.
  if (shape.passthrough !== undefined) fm.passthrough = shape.passthrough;
  if (shape.converge !== undefined) fm.converge = shape.converge;
  if (shape.spawns && shape.spawns.length > 0) fm.spawns = shape.spawns;
  if (shape.handoff !== undefined) fm.handoff = shape.handoff;

  const yaml = stringifyYaml(fm, {
    // Plain (unquoted) strings when safe; the library auto-quotes anything
    // that needs it (colons, pipes, leading/trailing space, YAML keywords
    // like "true"/"yes", numeric-looking values, etc.). This matches the
    // historical hand-written emitters' "only quote when necessary" output
    // and keeps existing tests/diffs stable.
    defaultStringType: "PLAIN",
    defaultKeyType: "PLAIN",
    // Disable line-folding — predictable, single-line scalars unless the
    // value itself contains a newline.
    lineWidth: 0,
  });

  // The yaml library may emit a trailing newline. Normalise to a single
  // newline before the closing `---` for tidy diffs.
  const frontmatter = yaml.replace(/\n+$/, "");
  const body = shape.body ?? shape.prompt;
  const bodySection = body && body.trim().length > 0 ? `\n${body}\n` : "\n";

  return `---\n${frontmatter}\n---\n${bodySection}`;
}

/**
 * Shared helper: parse a raw YAML object into TaskMdDef.
 * Used by both parseTaskMd() and parseTaskMdString().
 */
function parseFrontmatterToTaskMdDef(
  parsed: Record<string, unknown>,
): TaskMdDef {
  const tests = parseTests(parsed.tests);
  const checks = parseChecks(parsed.checks);
  if (tests && checks) {
    throw new Error(
      "Use tests: or checks:, not both. tests: is the canonical field.",
    );
  }

  return {
    id: parsed.id ? String(parsed.id) : undefined,
    name: parsed.name ? String(parsed.name) : undefined,
    title: parsed.title ? String(parsed.title) : undefined,
    description: parsed.description ? String(parsed.description) : undefined,
    // List-typed fields use the STRICT parser — a scalar/number/object
    // at any of these positions is a data-quality bug we want to surface
    // immediately, not silently coerce to `[]` (which would let a typo
    // like `outputs: src/foo.ts` — missing the YAML list dash — pass as
    // "no outputs" and break downstream gap detection).
    skills: parseStringArrayStrict(parsed.skills, "skills"),
    executor: parseExecutor(parsed.executor),
    // Legacy seed surface — these parsers throw migration errors so
    // existing TASK.md files surface an addressable error pointing at
    // RFC 0021/0022 instead of silently parsing as something else.
    ...(parsed.seeds !== undefined ? (parseSeeds(parsed.seeds), {}) : {}),
    ...(parsed.seed !== undefined ? (parseSeedMode(parsed.seed), {}) : {}),
    ...(parsed.from_seed !== undefined
      ? (parseFromSeed(parsed.from_seed), {})
      : {}),
    blocking:
      typeof parsed.blocking === "boolean" ? parsed.blocking : undefined,
    requires: parseStringArrayStrict(parsed.requires, "requires"),
    tags: parseStringArrayStrict(parsed.tags, "tags"),
    inputs: parseStringArrayStrict(parsed.inputs, "inputs"),
    outputs: parseOutputs(parsed.outputs),
    tests,
    checks,
    needs: parseChecks(parsed.needs),
    agent: parsed.agent ? String(parsed.agent) : undefined,
    ai: parseAIConfig(parsed.ai),
    plan: parsePlan(parsed.plan ?? parsed.planning),
    materials: parseStringArray(parsed.materials),
    materialization: parsed.materialization
      ? String(parsed.materialization)
      : undefined,
    "allowed-tools": parseStringArray(parsed["allowed-tools"]),
    "diagnosis-hints": parseDiagnosisHints(parsed["diagnosis-hints"]),
    "correction-budget":
      typeof parsed["correction-budget"] === "number"
        ? parsed["correction-budget"]
        : undefined,
    "context-depth":
      typeof parsed["context-depth"] === "number"
        ? parsed["context-depth"]
        : undefined,
    "auto-converge": parseAutoConverge(parsed["auto-converge"]),
    context: parseContextSteps(parsed.context),
    "on-fail": parseOnFail(parsed["on-fail"]),
    vars:
      parsed.vars && typeof parsed.vars === "object"
        ? (parsed.vars as Record<string, unknown>)
        : undefined,
    passthrough:
      typeof parsed.passthrough === "boolean" ? parsed.passthrough : undefined,
    "retry-full-body":
      typeof parsed["retry-full-body"] === "boolean"
        ? parsed["retry-full-body"]
        : undefined,
    converge: parseConverge(parsed.converge),
    spawns: parseSpawns(parsed.spawns),
    handoff: parseHandoff(parsed.handoff),
    mode: parseMode(parsed.mode),
    spawn:
      parsed.spawn &&
      typeof parsed.spawn === "object" &&
      !Array.isArray(parsed.spawn)
        ? (parsed.spawn as Record<string, unknown>)
        : undefined,
    stub: parseStub(parsed.stub),
    cmd: typeof parsed.cmd === "string" ? parsed.cmd : undefined,
  };
}

/**
 * Parse the `mode:` frontmatter field. Returns the typed mode or undefined
 * if absent. The `parseTaskModeFrontmatter` schema (called downstream by
 * `resolveTaskMode`) is the source of truth for cross-field validation;
 * this helper just rejects malformed scalar values.
 */
function parseMode(raw: unknown): TaskMode | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "string") {
    throw new Error(
      `mode: must be a string (one of task | spawner | converger | gateway), got ${typeof raw}`,
    );
  }
  // Legacy alias: `leaf` was renamed to `task`. Accept it and normalize so
  // existing TASK.md files don't throw (mode is deprecated anyway — RFC 0045).
  if (raw === "leaf") return "task";
  const valid = ["task", "spawner", "converger", "gateway"];
  if (!valid.includes(raw)) {
    throw new Error(
      `mode: must be one of task | spawner | converger | gateway, got "${raw}"`,
    );
  }
  return raw as TaskMode;
}

/**
 * Parse the `stub:` frontmatter block.
 * { cmd: string; cleanup?: string }
 */
function parseStub(
  raw: unknown,
): { cmd: string; cleanup?: string } | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("stub: must be an object with cmd string");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.cmd !== "string") {
    throw new Error("stub.cmd: must be a string");
  }
  return {
    cmd: obj.cmd as string,
    cleanup: typeof obj.cleanup === "string" ? obj.cleanup : undefined,
  };
}

/**
 * Resolve a TASK.md definition to its spawn/converge config.
 *
 * RFC 0045: mode: is no longer declared. This function now returns only
 * the spawn/converge config blocks. Mode is derived at runtime from
 * artifacts (spawn.plan.jsonl = spawner, converge: = converger, empty body = gateway,
 * otherwise = task).
 *
 * Returns the parsed spawn/converge configs.
 * Throws on spawn/converge validation errors.
 */
export function resolveTaskMode(def: TaskMdDef): {
  spawn?: SpawnerConfig;
  converge?: ConvergerConfig;
} {
  const convergeIsRfc0022 =
    def.converge != null &&
    typeof def.converge === "object" &&
    ("max_waves" in def.converge ||
      "halt_when" in def.converge ||
      "wave_check" in def.converge);
  const modeResult = parseTaskModeFrontmatter({
    spawn: def.spawn,
    converge: convergeIsRfc0022 ? def.converge : undefined,
    outputs: def.outputs,
  });
  if (!modeResult.ok) {
    throw new Error(`config contract: ${modeResult.error}`);
  }
  const parsed = modeResult.parsed!;

  return {
    spawn: parsed.spawn,
    converge: parsed.converge,
  };
}
