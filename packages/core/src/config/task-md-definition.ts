/**
 * TASK.md Task Definition
 *
 * Parser and mapper for the TASK.md markdown format — a pure-markdown
 * task definition that supports all features including external WBS scripts.
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
import { parse as parseYaml } from "yaml";
import type { DiagnosisHint } from "../task/lifecycle/diagnose.ts";
import type { CheckDef } from "../task/lifecycle/after.ts";
import type {
  TaskDefinition,
  Check,
  PlanConfig,
  WbsFn,
} from "./task-definition.ts";
import type { BacklogDef } from "../backlog/types.ts";
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

/* ------------------------------------------------------------------ */
/*  Goal definition (produced by a task)                               */
/* ------------------------------------------------------------------ */

/**
 * Inline goal definition in TASK.md frontmatter.
 * When a task with goalDefs completes, each entry becomes a
 * .converge/goals/{NNN}-{id}/GOAL.md file on disk.
 */
export interface GoalDef {
  id: string;
  title: string;
  depends?: string[];
  metric: {
    cmd?: string;
    script?: string;
    target: number;
    direction: "min" | "max";
  };
  requirements?: string;
  plan?: {
    strategy: "split" | "single" | "custom" | "wbs";
  };
  tags?: string[];
  body?: string;
  /** dod.js script content (written alongside GOAL.md) */
  dod?: string;
  /** wbs.js script content (written alongside GOAL.md) */
  wbs?: string;
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
/*  TASK.md WBS config                                                 */
/* ------------------------------------------------------------------ */

export interface TaskMdWbs {
  type: "nodejs" | "shell" | "ai";
  /** Script path — required for nodejs/shell, unused for ai */
  path?: string;
  /** AI prompt — required for type: ai, describes what subtasks to generate */
  prompt?: string;
  /** Max AI generation attempts before failing (type: ai only, default: 3) */
  maxAttempts?: number;
  args?: string[];
  env?: Record<string, string>;
  /**
   * When to run the WBS script. Default: 'before' (runs before skill/executor).
   * 'after' runs the WBS after the task's skill/executor completes successfully.
   * Use 'after' when WBS needs to react to task outputs (e.g., epoch decision spawning next epoch).
   */
  after?: boolean;
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
  wbs?: TaskMdWbs;
  blocking?: boolean;
  dependencies?: string[];
  requires?: string[];
  tags?: string[];
  inputs?: string[];
  outputs?: string[];
  checks?: CheckDef[];
  needs?: CheckDef[];
  agent?: string;
  goals?: string[];
  plan?: TaskMdPlan;
  materials?: string[];
  materialization?: string;
  "allowed-tools"?: string[];
  "diagnosis-hints"?: DiagnosisHint[];
  "correction-budget"?: number;
  "context-depth"?: number;
  "auto-converge"?: boolean | AutoConvergePolicy;
  context?: SkillContextStep[];
  backlogs?: BacklogDef[];
  "on-fail"?: { reset?: string[] };
  vars?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  TaskMdShape — canonical spawn currency for ctx.spawn()             */
/* ------------------------------------------------------------------ */

/**
 * Plain-object shape accepted by ctx.spawn(). Unifies TaskMdDef,
 * ScriptTaskOutput, and the JSON objects wbs.js scripts produce.
 *
 * Every field is optional except `id`.
 */
export interface TaskMdShape {
  id: string;
  title?: string;
  description?: string;
  skills?: string[];
  agent?: string;
  executor?: TaskMdExecutor;
  dependencies?: string[];
  blocking?: boolean;
  inputs?: string[];
  outputs?: string[];
  checks?: Array<{ id: string; cmd?: string; description?: string }>;
  needs?: Array<{ id: string; cmd?: string; description?: string }>;
  goals?: string[];
  plan?: TaskMdPlan;
  wbs?: TaskMdWbs;
  tags?: string[];
  materials?: string[];
  materialization?: string;
  vars?: Record<string, unknown>;
  "diagnosis-hints"?: DiagnosisHint[];
  "correction-budget"?: number;
  "auto-converge"?: boolean | AutoConvergePolicy;
  context?: SkillContextStep[];
  backlogs?: BacklogDef[];
  "on-fail"?: { reset?: string[] };
  /**
   * Goal definitions this task produces when completed.
   * Each entry becomes a GOAL.md file in .converge/goals/{NNN}-{id}/.
   * The converge runner discovers them on re-evaluation.
   *
   * Use this when a task's output IS new goals (discovery pattern).
   */
  goalDefs?: GoalDef[];
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
  "wbs",
  "blocking",
  "dependencies",
  "requires",
  "tags",
  "inputs",
  "outputs",
  "checks",
  "needs",
  "agent",
  "goals",
  "plan",
  "materials",
  "allowed-tools",
  "diagnosis-hints",
  "correction-budget",
  "context-depth",
  "auto-converge",
  "context",
  "backlogs",
  "goalDefs",
  "goal-defs",
  "materialization",
  "on-fail",
  "vars",
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
    let raw = await readFile(taskMdPath, "utf8");

    // Lazy substitution safety net: if the journaled TASK.md still contains
    // {{var}} placeholders (e.g. {{scene_id}} that the WBS spawn path
    // missed in fields like checks[].cmd), substitute them using vars
    // derivable from the task's filesystem path. Currently we extract:
    //   scene_id  ← any path segment matching `scene-<id>`
    // This safety net is idempotent and only writes through if changes
    // were made, so source-of-truth files keep their placeholders.
    const inferredVars: Record<string, string> = {};
    const sceneMatch = taskMdPath.match(/[\\/]scene-([^\\/]+)[\\/]/);
    if (sceneMatch) inferredVars.scene_id = sceneMatch[1];
    if (Object.keys(inferredVars).length > 0 && /\{\{(\w+)\}\}/.test(raw)) {
      const substituted = raw.replace(/\{\{(\w+)\}\}/g, (m, key) => {
        return key in inferredVars ? inferredVars[key] : m;
      });
      if (substituted !== raw) {
        raw = substituted;
        await writeFile(taskMdPath, raw, "utf8");
      }
    }

    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) {
      // TASK.md with no frontmatter — treat entire content as body
      return { def: {}, body: raw.trim() };
    }

    const frontmatter = match[1];
    const body = match[2] ?? "";

    const parsed = parseYaml(frontmatter) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return { def: {}, body: body.trim() };
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
    } catch {
      // Repair failed — fall through to original error
    }

    console.warn(`   Warning: Failed to parse TASK.md: ${taskMdPath}`);
    console.warn(`   Error: ${err.message}`);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  YAML Frontmatter Repair                                            */
/* ------------------------------------------------------------------ */

/**
 * Attempt to fix common YAML issues in frontmatter.
 *
 * Targets the "Nested mappings are not allowed in compact mappings" error
 * caused by unquoted scalar values that contain colons (e.g. `cmd: grep "Entity: Foo"`).
 *
 * Strategy: for each line that looks like a key-value pair, if the value
 * portion contains an additional unquoted colon, wrap the value in double quotes
 * (escaping any existing double quotes inside it).
 */
function repairYamlFrontmatter(yaml: string): string {
  return yaml
    .split("\n")
    .map((line) => {
      // Skip blank lines, comments, array items, already-quoted values, and lines
      // where the value is a block scalar indicator (| or >).
      const trimmed = line.trimStart();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-"))
        return line;

      // Match "key: value" — indent + key + colon + space + value
      const m = line.match(/^(\s*)([\w.@\-/]+):\s(.+)$/);
      if (!m) return line;

      const [, indent, key, value] = m;

      // Already quoted or block scalar
      if (/^['"]/.test(value) || /^[|>]/.test(value)) return line;

      // Value contains an extra colon or backslash → needs quoting
      // Backslash check is critical for Windows paths (D:\...) to prevent
      // double-escaping that creates invalid escape sequences like \c
      if (value.includes(":") || value.includes("\\")) {
        const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        return `${indent}${key}: "${escaped}"`;
      }

      return line;
    })
    .join("\n");
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
 * @param taskDir - Absolute path to the task directory (for resolving WBS scripts)
 */
export async function mapTaskMdToTaskDefinition(
  def: TaskMdDef,
  body: string,
  taskId: string,
  taskDir?: string,
): Promise<TaskDefinition> {
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

  // Map WBS config to wbsFn via script executor (nodejs/shell) or AI executor
  let wbsFn: WbsFn | undefined;
  if (def.wbs && taskDir) {
    if (def.wbs.type === "ai") {
      const { createAiWbsFn } =
        await import("../executor/script-wbs-executor.ts");
      wbsFn = createAiWbsFn(def.wbs, taskDir);
    } else {
      const { createScriptWbsFn } =
        await import("../executor/script-wbs-executor.ts");
      wbsFn = createScriptWbsFn(def.wbs, taskDir);
    }
  }

  // Map checks from CheckDef[] to Check[]
  const checks: Check[] | undefined = def.checks?.map((c) => ({
    id: c.id,
    cmd: c.cmd,
    description: c.description,
    type: c.type,
    check: c.check,
    agent: c.agent,
    model: c.model,
    timeoutMs: c.timeoutMs,
  }));

  const taskDef: TaskDefinition = {
    id: taskId, // Always from directory name
    title: def.title ?? taskId,
    description: def.description,
    inputs: def.inputs,
    outputs: def.outputs,
    agent: def.agent,
    skill: def.skills, // TASK.md `skills` array → TaskDefinition `skill` field
    checks,
    goals: def.goals,
    dependencies: def.dependencies,
    tags: def.tags,
    blocking: def.blocking,
    prompt: body || undefined,
    vars,
    planConfig,
    wbsFn,
    materialization: def.materialization,
    backlogs: def.backlogs,
    onFail: def["on-fail"] ? { reset: def["on-fail"].reset } : undefined,
    // Store wbs config (including `after` flag) for wbsAfter detection in Unit
    wbs: def.wbs,
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

function parseWbs(raw: unknown): TaskMdWbs | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  if (type === "ai") {
    if (!obj.prompt || typeof obj.prompt !== "string") return undefined;
    return {
      type: "ai",
      prompt: obj.prompt,
      maxAttempts:
        typeof obj.maxAttempts === "number" ? obj.maxAttempts : undefined,
      args: parseStringArray(obj.args),
      env: parseStringRecord(obj.env),
    };
  }
  if (type !== "nodejs" && type !== "shell") return undefined;
  if (!obj.path || typeof obj.path !== "string") return undefined;
  return {
    type,
    path: obj.path,
    args: parseStringArray(obj.args),
    env: parseStringRecord(obj.env),
  };
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

function parseBacklogs(raw: unknown): BacklogDef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const results: BacklogDef[] = [];
  for (const item of raw) {
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if (typeof obj.id === "string" && typeof obj.cmd === "string") {
        results.push({
          id: obj.id,
          cmd: obj.cmd,
          description: obj.description ? String(obj.description) : undefined,
          severity: ["low", "medium", "high"].includes(obj.severity as string)
            ? (obj.severity as "low" | "medium" | "high")
            : undefined,
        });
      }
    }
  }
  return results.length > 0 ? results : undefined;
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
    // No frontmatter — treat entire content as body, require id via other means
    return { id: "", body: raw.trim() };
  }

  const frontmatter = match[1];
  const body = (match[2] ?? "").trim();

  const parsed = parseYaml(frontmatter) as Record<string, unknown>;
  if (!parsed || typeof parsed !== "object") {
    return { id: "", body };
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
    executor: def.executor,
    dependencies: def.dependencies,
    blocking: def.blocking,
    inputs: def.inputs,
    outputs: def.outputs,
    checks: def.checks,
    needs: def.needs,
    goals: def.goals,
    plan: def.plan,
    wbs: def.wbs,
    tags: def.tags,
    materials: def.materials,
    materialization: def.materialization,
    vars: Object.keys(extraVars).length > 0 ? extraVars : def.vars,
    "diagnosis-hints": def["diagnosis-hints"],
    "correction-budget": def["correction-budget"],
    "auto-converge": def["auto-converge"],
    context: def.context,
    backlogs: def.backlogs,
    "on-fail": def["on-fail"],
    body: body || undefined,
  };
}

/**
 * Shared helper: parse a raw YAML object into TaskMdDef.
 * Used by both parseTaskMd() and parseTaskMdString().
 */
function parseFrontmatterToTaskMdDef(
  parsed: Record<string, unknown>,
): TaskMdDef {
  return {
    id: parsed.id ? String(parsed.id) : undefined,
    name: parsed.name ? String(parsed.name) : undefined,
    title: parsed.title ? String(parsed.title) : undefined,
    description: parsed.description ? String(parsed.description) : undefined,
    skills: parseStringArray(parsed.skills),
    executor: parseExecutor(parsed.executor),
    wbs: parseWbs(parsed.wbs),
    blocking:
      typeof parsed.blocking === "boolean" ? parsed.blocking : undefined,
    dependencies: parseStringArray(parsed.dependencies),
    requires: parseStringArray(parsed.requires),
    tags: parseStringArray(parsed.tags),
    inputs: parseStringArray(parsed.inputs),
    outputs: parseStringArray(parsed.outputs),
    checks: parseChecks(parsed.checks),
    needs: parseChecks(parsed.needs),
    agent: parsed.agent ? String(parsed.agent) : undefined,
    goals: parseStringArray(parsed.goals),
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
    backlogs: parseBacklogs(parsed.backlogs),
    "on-fail": parseOnFail(parsed["on-fail"]),
    vars:
      parsed.vars && typeof parsed.vars === "object"
        ? (parsed.vars as Record<string, unknown>)
        : undefined,
  };
}
