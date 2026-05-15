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
import { extname, join as pathJoin } from "node:path";
import { parse as parseYaml } from "yaml";
import type { DiagnosisHint } from "../task/lifecycle/diagnose.ts";
import type { CheckDef } from "../task/lifecycle/after.ts";
import type {
  TaskDefinition,
  Check,
  PlanConfig,
  SeedFn,
} from "./task-definition.ts";
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
import {
  createScriptSeedFn,
  createAiSeedFn,
  createAiCliSeedFn,
} from "../executor/script-seed-executor.ts";
import {
  getPlaybookLayout,
  listExecutableFiles,
} from "../task/playbook/layout.ts";

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
/*  TASK.md Seed config                                                */
/* ------------------------------------------------------------------ */

export interface TaskMdSeed {
  type: "nodejs" | "python" | "shell" | "ai";
  /** Script path — required for nodejs/shell, unused for ai */
  path?: string;
  /** AI prompt — required for type: ai, describes what subtasks to generate */
  prompt?: string;
  /** Max AI generation attempts before failing (type: ai only, default: 3) */
  maxAttempts?: number;
  args?: string[];
  env?: Record<string, string>;
  /**
   * When to run the seed script. Default: 'before' (runs before skill/executor).
   * 'after' runs the seed after the task's skill/executor completes successfully.
   * Use 'after' when seed needs to react to task outputs (e.g., epoch decision spawning next epoch).
   */
  after?: boolean;
}

export interface TaskMdNamedSeed {
  /** Seed file name without .seed.js, resolved from a seeds/ directory. */
  name: string;
  /** Run after task execution instead of before. */
  after?: boolean;
}

export type SeedRef =
  | TaskMdSeed
  | TaskMdNamedSeed;

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
  seeds?: SeedRef[];
  seed?: { mode?: "cli" };
  blocking?: boolean;
  depends_on?: string[];
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
  from_seed?: string;
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
  depends_on?: string[];
  blocking?: boolean;
  inputs?: string[];
  outputs?: string[];
  tests?: CheckDef[];
  checks?: CheckDef[];
  needs?: CheckDef[];
  plan?: TaskMdPlan;
  seeds?: SeedRef[];
  seed?: { mode?: "cli" };
  tags?: string[];
  materials?: string[];
  materialization?: string;
  vars?: Record<string, unknown>;
  "diagnosis-hints"?: DiagnosisHint[];
  "correction-budget"?: number;
  "auto-converge"?: boolean | AutoConvergePolicy;
  context?: SkillContextStep[];
  "on-fail"?: { reset?: string[] };
  from_seed?: string;
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
  "seeds",
  "seed",
  "blocking",
  "depends_on",
  "requires",
  "tags",
  "inputs",
  "outputs",
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
    // {{var}} placeholders (e.g. {{scene_id}} that the Seed spawn path
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
 * @param taskDir - Absolute path to the task directory (for resolving seed scripts)
 */
export function mapTaskMdToTaskDefinition(
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

  if (def.seeds && def.seeds.length > 0) {
    throw new Error("Legacy `seeds:` is removed. Use `seed: { mode: cli }`.");
  }

  // Map seeds array to seedFn
  let seedFn: SeedFn | undefined;
  if (def.seeds && taskDir) {
    const seedRefs: TaskMdSeed[] = [];
    for (const entry of def.seeds) {
      if ("name" in entry) {
        seedRefs.push(resolveNamedSeed(taskDir, entry.name, entry.after));
      } else {
        seedRefs.push(entry);
      }
    }
    // Create a composite seedFn that runs all seeds in order
    if (seedRefs.length === 1) {
      const seed = seedRefs[0];
      if (seed.type === "ai") {
        seedFn = createAiSeedFn(seed, taskDir);
      } else {
        seedFn = createScriptSeedFn(seed, taskDir);
      }
    } else {
      seedFn = async (ctx) => {
        let anyKeepLooping = false;
        for (const seed of seedRefs) {
          if (seed.type === "ai") {
            const result = await createAiSeedFn(seed, taskDir)(ctx);
            if (result === true) anyKeepLooping = true;
          } else {
            const result = await createScriptSeedFn(seed, taskDir)(ctx);
            if (result === true) anyKeepLooping = true;
          }
        }
        return anyKeepLooping;
      };
    }
  }

  if (def.seed?.mode === "cli" && taskDir) {
    if (def.seeds && def.seeds.length > 0) {
      throw new Error("TASK.md cannot declare both `seed:` and `seeds:`");
    }
    seedFn = createAiCliSeedFn(body, taskDir);
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
    depends_on: def.depends_on,
    tags: def.tags,
    blocking: def.blocking,
    prompt: body || undefined,
    vars,
    planConfig,
    seedFn,
    materialization: def.materialization,
    onFail: def["on-fail"] ? { reset: def["on-fail"].reset } : undefined,
    // Store seeds config (including `after` flag) for seedAfter detection in Unit
    seed: def.seed ?? def.seeds,
    from_seed: def.from_seed,
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
  const rawOutputs = parseStringArray(raw);
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

function parseSeed(raw: unknown): TaskMdSeed | undefined {
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
      after: obj.after === true ? true : undefined,
    };
  }
  if (type !== "nodejs" && type !== "python" && type !== "shell") return undefined;
  if (!obj.path || typeof obj.path !== "string") return undefined;
  return {
    type,
    path: obj.path,
    args: parseStringArray(obj.args),
    env: parseStringRecord(obj.env),
    after: obj.after === true ? true : undefined,
  };
}

function parseNamedSeed(raw: Record<string, unknown>): TaskMdNamedSeed | undefined {
  if (typeof raw.name !== "string" || raw.name.length === 0) {
    return undefined;
  }
  return {
    name: raw.name,
    after: raw.after === true ? true : undefined,
  };
}

function parseSeeds(raw: unknown): SeedRef[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  throw new Error("Legacy `seeds:` is removed. Use `seed: { mode: cli }`.");
}

function parseTests(raw: unknown): CheckDef[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error("tests: must be an array of object entries");
  }

  const results: CheckDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(
        "tests: entries must be objects: { id, cmd } or { name, args }",
      );
    }

    const obj = item as Record<string, unknown>;
    if (obj.type === "ai" || obj.check !== undefined) {
      throw new Error(
        "tests: AI assertions are not allowed; use deterministic cmd tests or named .test.md refs",
      );
    }

    if (typeof obj.name === "string" && obj.name.length > 0) {
      const args: Record<string, string> = {};
      if (obj.args !== undefined) {
        if (!obj.args || typeof obj.args !== "object" || Array.isArray(obj.args)) {
          throw new Error(`tests: named test "${obj.name}" args must be an object`);
        }
        for (const [key, value] of Object.entries(obj.args as Record<string, unknown>)) {
          args[key] = String(value);
        }
      }
      results.push({
        id: obj.id ? String(obj.id) : `test:${obj.name}`,
        description: obj.description ? String(obj.description) : `test:${obj.name}`,
        type: "test",
        name: obj.name,
        args,
      });
      continue;
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

    throw new Error(
      "tests: each entry must be either { id, cmd } or { name, args }",
    );
  }

  return results.length > 0 ? results : undefined;
}

function resolveNamedSeed(taskDir: string, name: string, after?: boolean): TaskMdSeed {
  // Seeds live at playbook root seeds/ only. Task-level seeds are not supported.
  const playbookDir = findPlaybookRoot(taskDir);
  if (playbookDir) {
    const shared = findSeedExecutable(getPlaybookLayout(playbookDir).seedsDir, name);
    if (shared) return { ...seedFromPath(shared), after };
  }

  // Fallback: playbook root seeds/ relative to taskDir's project
  const fallbackDir = playbookDir
    ? getPlaybookLayout(playbookDir).seedsDir
    : pathJoin(taskDir, "seeds");
  return { type: "nodejs", path: pathJoin(fallbackDir, `${name}.seed.js`), after };
}

function findSeedExecutable(dir: string, name: string): string | undefined {
  return listExecutableFiles(dir).find((file) => file.name === name)?.path;
}

function seedFromPath(path: string): TaskMdSeed {
  const ext = extname(path);
  if (ext === ".py") return { type: "python", path };
  if (ext === ".sh") return { type: "shell", path };
  return { type: "nodejs", path };
}

function findPlaybookRoot(startDir: string): string | undefined {
  let dir = startDir;
  while (dir && dir !== pathJoin(dir, "..")) {
    if (existsSync(pathJoin(dir, "playbook.yml"))) return dir;
    // Also search .converge/playbooks/ for playbook roots — needed when
    // starting from journal or artifact directories.
    const playbooksDir = pathJoin(dir, ".converge", "playbooks");
    if (existsSync(playbooksDir)) {
      try {
        for (const entry of readdirSync(playbooksDir)) {
          if (existsSync(pathJoin(playbooksDir, entry, "playbook.yml"))) return pathJoin(playbooksDir, entry);
        }
      } catch {}
    }
    dir = pathJoin(dir, "..");
  }
  return undefined;
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

function parseSeedMode(raw: unknown): { mode?: "cli" } | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const mode = obj.mode;
  if (mode === "cli") return { mode: "cli" };
  return undefined;
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
    ai: def.ai,
    executor: def.executor,
    depends_on: def.depends_on,
    blocking: def.blocking,
    inputs: def.inputs,
    outputs: def.outputs,
    tests: def.tests,
    checks: def.tests ?? def.checks,
    needs: def.needs,
    plan: def.plan,
    seeds: def.seeds,
    seed: def.seed,
    tags: def.tags,
    materials: def.materials,
    materialization: def.materialization,
    vars: Object.keys(extraVars).length > 0 ? extraVars : def.vars,
    "diagnosis-hints": def["diagnosis-hints"],
    "correction-budget": def["correction-budget"],
    "auto-converge": def["auto-converge"],
    context: def.context,
    "on-fail": def["on-fail"],
    from_seed: def.from_seed,
    body: body || undefined,
  };
}

function parseFromSeed(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "string" || raw.length === 0)
    throw new Error("from_seed: must be a non-empty string");
  return raw;
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
    throw new Error("Use tests: or checks:, not both. tests: is the canonical field.");
  }

  return {
    id: parsed.id ? String(parsed.id) : undefined,
    name: parsed.name ? String(parsed.name) : undefined,
    title: parsed.title ? String(parsed.title) : undefined,
    description: parsed.description ? String(parsed.description) : undefined,
    skills: parseStringArray(parsed.skills),
    executor: parseExecutor(parsed.executor),
    seeds: parseSeeds(parsed.seeds),
    seed: parseSeedMode(parsed.seed),
    blocking:
      typeof parsed.blocking === "boolean" ? parsed.blocking : undefined,
    depends_on: parseStringArray(parsed.depends_on),
    requires: parseStringArray(parsed.requires),
    tags: parseStringArray(parsed.tags),
    inputs: parseStringArray(parsed.inputs),
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
    from_seed: parseFromSeed(parsed.from_seed),
  };
}
