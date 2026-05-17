/**
 * Playbook Loader
 *
 * Discovers playbook template directories from .converge/playbooks/.
 * Each playbook is a directory containing playbook.yml + task dirs.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  getPlaybookLayout,
  isAllowedDataInTasks,
  isAllowedExecutableInTasks,
  isExecutableFile,
  isMarkdownFile,
  listFilesRecursive,
  listMarkdownFiles,
  readTextFile,
} from "./layout.ts";
import type {
  PlaybookDef,
  PlaybookInput,
  PlaybookRunConfig,
  PlaybookGoal,
  PlaybookGoalCheck,
  PlaybookGoalStatus,
  PlaybookTask,
  PlaybookSource,
  ResolvedPlaybook,
} from "./types.ts";
import type { HookDefinition } from "../../hooks/hook-definition.ts";

/* ------------------------------------------------------------------ */
/*  Directory Resolution                                               */
/* ------------------------------------------------------------------ */

function getProjectPlaybooksDir(projectDir: string): string {
  return join(projectDir, ".converge", "playbooks");
}

/* ------------------------------------------------------------------ */
/*  Duration Parsing                                                   */
/* ------------------------------------------------------------------ */

/**
 * Parse a human-readable duration string to milliseconds.
 * Supports: "30m", "2h", "90s", "1h30m", "infinite", or raw number (ms).
 */
export function parseDuration(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;

  const s = value.trim().toLowerCase();
  if (s === "infinite" || s === "infinity") return Infinity;

  // Try as raw number (ms)
  const num = Number(s);
  if (!isNaN(num)) return num;

  // Parse human-readable: "30m", "2h", "90s", "1h30m"
  let totalMs = 0;
  const pattern = /(\d+)\s*(h|m|s|ms)/g;
  let match;
  let matched = false;
  while ((match = pattern.exec(s)) !== null) {
    matched = true;
    const n = parseInt(match[1], 10);
    switch (match[2]) {
      case "h":
        totalMs += n * 3600000;
        break;
      case "m":
        totalMs += n * 60000;
        break;
      case "s":
        totalMs += n * 1000;
        break;
      case "ms":
        totalMs += n;
        break;
    }
  }

  return matched ? totalMs : undefined;
}

/* ------------------------------------------------------------------ */
/*  playbook.yml Parsing                                               */
/* ------------------------------------------------------------------ */

function parseInputs(raw: unknown): Record<string, PlaybookInput> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const result: Record<string, PlaybookInput> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      result[key] = {
        description: obj.description ? String(obj.description) : undefined,
        required: typeof obj.required === "boolean" ? obj.required : undefined,
        default: obj.default !== undefined ? String(obj.default) : undefined,
      };
    } else {
      result[key] = { description: value ? String(value) : undefined };
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Process-scoped dedup for the `run.mode is deprecated` warning. Without
 * this, every parse pass through the same playbook.yml emitted the same
 * stderr line — and validate (which loads + validates) runs the parser
 * twice, producing two identical warnings per CLI invocation.
 *
 * Cleared by tests via `_resetDeprecationDedup` (export below) to avoid
 * cross-test pollution.
 */
const _deprecationWarned = new Set<string>();
export function _resetDeprecationDedup(): void {
  _deprecationWarned.clear();
}

function parseRunConfig(raw: unknown): PlaybookRunConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const config: PlaybookRunConfig = {};

  if (obj.mode && typeof obj.mode === "string") {
    if (!_deprecationWarned.has("run.mode")) {
      console.warn(
        "⚠️  run.mode is deprecated and ignored; tasks/seeds decide when to continue.",
      );
      _deprecationWarned.add("run.mode");
    }
    config.mode = obj.mode as PlaybookRunConfig["mode"];
  }
  if (obj.maxTaskAttempts !== undefined)
    config.maxTaskAttempts = Number(obj.maxTaskAttempts);
  if (obj.workers !== undefined) config.workers = Number(obj.workers);
  if (obj.maxIterations !== undefined)
    config.maxIterations = Number(obj.maxIterations);
  if (obj.maxGoals !== undefined) config.maxGoals = Number(obj.maxGoals);
  if (typeof obj.resume === "boolean") config.resume = obj.resume;

  const duration = parseDuration(obj.maxDuration);
  if (duration !== undefined) config.maxDuration = duration;

  // Parse stall config
  if (obj.stall && typeof obj.stall === "object") {
    const stallObj = obj.stall as Record<string, unknown>;
    config.stall = {};
    if (stallObj.maxConsecutive !== undefined)
      config.stall.maxConsecutive = Number(stallObj.maxConsecutive);
    if (stallObj.backoffMs !== undefined)
      config.stall.backoffMs = Number(stallObj.backoffMs);
  }

  return Object.keys(config).length > 0 ? config : undefined;
}

function parseTasks(raw: unknown): PlaybookTask[] {
  if (!Array.isArray(raw)) return [];
  const tasks: PlaybookTask[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const task: PlaybookTask = {};
    // Accept `id`, `name`, or `path` as the task identifier. `name` is a
    // legacy alias kept for backward-compat with hand-written playbook.yml
    // fixtures from earlier framework versions.
    if (obj.id) task.id = String(obj.id);
    else if (obj.name) task.id = String(obj.name);
    if (obj.path) task.path = String(obj.path);
    else if (task.id) task.path = task.id;
    // If id wasn't set explicitly but path was, derive id from path so callers
    // that round-trip definePlaybook → write → load see the same id.
    if (!task.id && task.path) task.id = task.path;
    if (obj.playbook) task.playbook = String(obj.playbook);
    if (Array.isArray(obj.depends_on)) {
      task.depends_on = obj.depends_on.map(String);
    }
    if (obj.with && typeof obj.with === "object") {
      task.with = {};
      for (const [k, v] of Object.entries(
        obj.with as Record<string, unknown>,
      )) {
        task.with[k] = String(v);
      }
    }
    if (task.path || task.playbook) tasks.push(task);
  }
  return tasks;
}

/**
 * Parse top-level playbook `checks:` — distinct from goal checks.
 * Supports three forms:
 *
 *   1. Inline cmd:        { id, cmd, description? }
 *   2. Test-ref shorthand: "test:<name>(arg=value, arg2=value)"
 *   3. Test-ref object:    { type: "test", name, args? } (optionally with id, description)
 */
function parsePlaybookChecks(
  raw: unknown,
): Array<{
  id: string;
  cmd?: string;
  type?: "test" | "cmd";
  name?: string;
  args?: Record<string, string>;
  description?: string;
}> | undefined {
  if (!Array.isArray(raw)) return undefined;
  const checks: Array<{
    id: string;
    cmd?: string;
    type?: "test" | "cmd";
    name?: string;
    args?: Record<string, string>;
    description?: string;
  }> = [];

  for (const item of raw) {
    // Form 2: shorthand string — "test:<name>(k=v, ...)"
    if (typeof item === "string") {
      const m = item.match(/^test:([\w-]+)(?:\((.*)\))?$/);
      if (!m) {
        throw new Error(
          `playbook checks: shorthand must match "test:<name>(args)"; got: ${item}`,
        );
      }
      const name = m[1];
      const argsRaw = m[2] ?? "";
      const args: Record<string, string> = {};
      if (argsRaw.trim().length > 0) {
        for (const pair of argsRaw.split(",")) {
          const eq = pair.indexOf("=");
          if (eq < 1) {
            throw new Error(
              `playbook checks: shorthand arg must be "key=value"; got: ${pair}`,
            );
          }
          args[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
        }
      }
      checks.push({
        id: `test:${name}`,
        type: "test",
        name,
        args,
      });
      continue;
    }

    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;

    // Form 3: { type: test, name, args? }
    if (obj.type === "test") {
      const name = obj.name ? String(obj.name) : "";
      if (!name) {
        throw new Error(
          `playbook checks: type:test entries must have a "name" field`,
        );
      }
      const args: Record<string, string> = {};
      if (obj.args && typeof obj.args === "object" && !Array.isArray(obj.args)) {
        for (const [k, v] of Object.entries(obj.args as Record<string, unknown>)) {
          args[k] = String(v);
        }
      }
      checks.push({
        id: obj.id ? String(obj.id) : `test:${name}`,
        type: "test",
        name,
        args,
        description: obj.description ? String(obj.description) : undefined,
      });
      continue;
    }

    // Form 1: inline cmd
    if (obj.id && obj.cmd) {
      checks.push({
        id: String(obj.id),
        cmd: String(obj.cmd),
        description: obj.description ? String(obj.description) : undefined,
      });
      continue;
    }
  }

  return checks.length > 0 ? checks : undefined;
}

function parseGoalChecks(raw: unknown): PlaybookGoalCheck[] {
  if (!Array.isArray(raw)) return [];
  const checks: PlaybookGoalCheck[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (!obj.id || !obj.cmd) continue;
    checks.push({
      id: String(obj.id),
      description: obj.description ? String(obj.description) : undefined,
      cmd: String(obj.cmd),
    });
  }
  return checks;
}

function parseGoalStatus(raw: unknown): PlaybookGoalStatus | undefined {
  if (
    raw === "candidate" ||
    raw === "active" ||
    raw === "rejected" ||
    raw === "stalled"
  ) {
    return raw;
  }
  return undefined;
}

function parseGoals(raw: unknown): PlaybookGoal[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const goals: PlaybookGoal[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (!obj.id || !obj.description) continue;
    const checks = parseGoalChecks(obj.checks);
    goals.push({
      id: String(obj.id),
      description: String(obj.description),
      parent: obj.parent ? String(obj.parent) : undefined,
      depends_on: Array.isArray(obj.depends_on)
        ? obj.depends_on.map(String)
        : undefined,
      status: parseGoalStatus(obj.status),
      source: obj.source && typeof obj.source === "object"
        ? obj.source as Record<string, unknown>
        : undefined,
      metadata: obj.metadata && typeof obj.metadata === "object"
        ? obj.metadata as Record<string, unknown>
        : undefined,
      checks,
    });
  }
  return goals.length > 0 ? goals : undefined;
}

function parseGoalMd(raw: string, filePath: string): PlaybookGoal | undefined {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  let parsed: Record<string, unknown> = {};
  let body = raw.trim();

  if (match) {
    const frontmatter = parseYaml(match[1]) as unknown;
    if (frontmatter && typeof frontmatter === "object") {
      parsed = frontmatter as Record<string, unknown>;
    }
    body = (match[2] ?? "").trim();
  }

  const id = parsed.id ? String(parsed.id) : basenameWithoutGoalSuffix(filePath);
  const description = parsed.description
    ? String(parsed.description)
    : body;
  if (!id || !description) return undefined;

  const checks = parseGoalChecks(parsed.tests ?? parsed.checks);
  return {
    id,
    description,
    parent: parsed.parent ? String(parsed.parent) : undefined,
    depends_on: Array.isArray(parsed.depends_on)
      ? parsed.depends_on.map(String)
      : undefined,
    status: parseGoalStatus(parsed.status),
    source: { type: "goal-md", path: filePath },
    metadata: parsed.metadata && typeof parsed.metadata === "object"
      ? parsed.metadata as Record<string, unknown>
      : undefined,
    checks,
  };
}

function basenameWithoutGoalSuffix(filePath: string): string {
  return filePath
    .split(/[\\/]/)
    .pop()!
    .replace(/\.(goal|GOAL)\.md$/, "")
    .replace(/\.md$/, "");
}

function loadGoalMdFiles(templateDir: string): PlaybookGoal[] {
  const layout = getPlaybookLayout(templateDir);
  const goals: PlaybookGoal[] = [];
  for (const filePath of listMarkdownFiles(layout.goalsDir)) {
    const goal = parseGoalMd(readTextFile(filePath), filePath);
    if (goal) goals.push(goal);
  }
  return goals;
}

function mergePlaybookGoals(
  inlineGoals: PlaybookGoal[] | undefined,
  fileGoals: PlaybookGoal[],
): PlaybookGoal[] | undefined {
  const byId = new Map<string, PlaybookGoal>();
  for (const goal of fileGoals) byId.set(goal.id, goal);
  for (const goal of inlineGoals ?? []) byId.set(goal.id, goal);
  const merged = [...byId.values()];
  return merged.length > 0 ? merged : undefined;
}

/**
 * Parse playbook.yml from a template directory.
 */
/**
 * Parse hooks from YAML into HookDefinition objects.
 * Handles builtin references and shell-command hooks.
 */
function parseHooks(raw: unknown): HookDefinition[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const hooks: HookDefinition[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;

    const id = e.id ? String(e.id) : undefined;
    if (!id) continue;

    const on = e.on as HookDefinition["on"];
    if (!on || !["task:start", "task:complete", "task:fail"].includes(on)) continue;

    const filter: HookDefinition["filter"] = {};
    if (Array.isArray(e.tags)) {
      filter.tags = e.tags.map(String);
    }
    if (Array.isArray((e.filter as any)?.tags)) {
      filter.tags = ((e.filter as any).tags as any[]).map(String);
    }
    if (Array.isArray(e.taskIds)) {
      filter.taskIds = e.taskIds.map(String);
    }

    // Resolve fn from builtin reference or shell command
    const fnRaw = (e as any).fn;
    let fn: HookDefinition["fn"] | undefined;
    let config: Record<string, unknown> | undefined;

    if (typeof fnRaw === "object" && fnRaw !== null) {
      if (typeof fnRaw.builtin === "string") {
        // Store builtin name in config for deferred resolution at expand time
        config = { ...(fnRaw.config ?? {}), __builtin: fnRaw.builtin };
        fn = async () => {}; // placeholder, replaced at expand time
      } else if (typeof fnRaw.shell === "string") {
        fn = async (ctx) => {
          await ctx.shell(fnRaw.shell as string);
        };
      }
    }

    if (!fn) continue; // skip hooks without a resolvable fn

    hooks.push({
      id,
      on,
      filter,
      fn,
      config,
      blocking: typeof e.blocking === "boolean" ? e.blocking : undefined,
    } as HookDefinition);
  }

  return hooks.length > 0 ? hooks : undefined;
}

export async function parsePlaybookYml(
  templateDir: string,
): Promise<PlaybookDef> {
  const ymlPath = join(templateDir, "playbook.yml");

  if (!existsSync(ymlPath)) {
    throw new Error(`No playbook.yml found in ${templateDir}`);
  }

  const raw = await readFile(ymlPath, "utf8");
  const parsed = parseYaml(raw) as Record<string, unknown>;

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Invalid playbook definition: ${ymlPath}`);
  }

  const name = parsed.name
    ? String(parsed.name)
    : dirname(templateDir).split("/").pop() || "unknown";

  // Every playbook needs a tasks/ directory or root TASK.md — except converge/loop mode (creates tasks dynamically)
  const mode = parsed.run && typeof parsed.run === "object"
    ? (parsed.run as Record<string, unknown>).mode : undefined;
  if (mode !== "evolve" && mode !== "converge" && mode !== "loop" && mode !== "dispatch"
    && !existsSync(join(templateDir, "tasks")) && !existsSync(join(templateDir, "TASK.md"))) {
    throw new Error(`Playbook "${name}" has no tasks/ directory or root TASK.md`);
  }

  const inlineGoals = parseGoals(parsed.goals);
  const fileGoals = loadGoalMdFiles(templateDir);

  return {
    name,
    description: parsed.description ? String(parsed.description) : undefined,
    seed_api_version:
      typeof parsed.seed_api_version === "number"
        ? parsed.seed_api_version
        : undefined,
    key: parsed.key ? String(parsed.key) : undefined,
    inputs: parseInputs(parsed.inputs),
    goals: mergePlaybookGoals(inlineGoals, fileGoals),
    tasks: parseTasks(parsed.tasks),
    run: parseRunConfig(parsed.run),
    hooks: parseHooks(parsed.hooks),
    checks: parsePlaybookChecks(parsed.checks),
  };
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Validate a playbook definition for structural correctness.
 */
export function validatePlaybook(
  def: PlaybookDef,
  templateDir: string,
): string[] {
  const errors: string[] = [];
  const layout = getPlaybookLayout(templateDir);

  const rootTaskMd = join(templateDir, "TASK.md");
  if (!existsSync(layout.tasksDir) && !existsSync(rootTaskMd)) {
    errors.push(`No tasks/ directory or root TASK.md found at ${templateDir}`);
  }

  for (const dir of [layout.tasksDir, layout.templatesDir, layout.goalsDir]) {
    for (const file of listFilesRecursive(dir)) {
      if (isMarkdownFile(file)) continue;
      // Under tasks/, allow nested executable namespaces (seeds/,
      // scripts/, checks/), seed-marker files (seed.js, *.seed.js),
      // executable files co-located with a sibling TASK.md (iter-28),
      // and structured-data files (.json/.yaml/.csv/.txt) co-located
      // with a sibling TASK.md (iter-28).
      //
      // Every shipping playbook uses these patterns; the rule used to
      // reject them as 51-plus false-positive errors per playbook
      // (see iter-26 baby-app validation, iter-27 partial fix).
      if (
        dir === layout.tasksDir &&
        (isAllowedExecutableInTasks(file, dir) ||
          isAllowedDataInTasks(file, dir))
      ) {
        continue;
      }
      errors.push(
        `Declarative playbook folder "${dir}" may only contain markdown files: ${file}`,
      );
    }
  }

  for (const dir of [layout.scriptsDir, layout.checksDir, layout.seedsDir]) {
    for (const file of listFilesRecursive(dir)) {
      if (isExecutableFile(file)) continue;
      // Iter-28: allow companion markdown (SEED.md, README.md, nested
      // TASK.md templates) inside executable namespaces. Seeds and
      // scripts routinely have prose documentation and child task
      // templates next to their executables; rejecting those was a
      // false positive against the actual authoring conventions.
      if (isMarkdownFile(file)) continue;
      errors.push(
        `Executable playbook folder "${dir}" may only contain .js/.mjs/.cjs/.py/.sh files: ${file}`,
      );
    }
  }

  // run.mode is deprecated and ignored. Keep accepting it for old playbooks,
  // but do not validate or branch behavior on it. Tasks/seeds/checks decide
  // when work continues or stops.

  return errors;
}

/* ------------------------------------------------------------------ */
/*  Discovery                                                          */
/* ------------------------------------------------------------------ */

async function discoverFromDir(
  dir: string,
  builtin: boolean,
): Promise<PlaybookSource[]> {
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const sources: PlaybookSource[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const templateDir = join(dir, entry.name);
    if (!existsSync(join(templateDir, "playbook.yml"))) continue;

    try {
      const def = await parsePlaybookYml(templateDir);
      sources.push({ def, templateDir, builtin });
    } catch (err: any) {
      console.warn(
        `   Warning: Failed to load playbook ${templateDir}: ${err.message}`,
      );
    }
  }

  return sources;
}

/**
 * Get the converge package skills directory.
 * Mirrors the logic in commands-skills.ts.
 */
function getConvergeSkillsDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);

  // If we're in dist/ (built), go up 1 level to package root
  // If we're in src/playbook/ (development), go up 2 levels to package root
  const packageRoot = currentDir.includes("/dist")
    ? resolve(currentDir, "..")
    : resolve(currentDir, "../..");

  return join(packageRoot, "skills");
}

/**
 * Discover playbooks from each skill's playbooks directory.
 * These are marked as builtin.
 */
async function discoverFromSkills(): Promise<PlaybookSource[]> {
  const skillsDir = getConvergeSkillsDir();
  if (!existsSync(skillsDir)) return [];

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const sources: PlaybookSource[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const playbooksDir = join(skillsDir, entry.name, "playbooks");
    const found = await discoverFromDir(playbooksDir, true);
    sources.push(...found);
  }

  return sources;
}

/**
 * Discover all available playbooks.
 * Searches skill playbooks (builtins) and .converge/playbooks/ (project).
 * Project playbooks override builtins by name.
 */
export async function discoverPlaybooks(
  projectDir: string,
): Promise<PlaybookSource[]> {
  const dirs = await Promise.all([
    discoverFromSkills(),
    discoverFromDir(getProjectPlaybooksDir(projectDir), false),
  ]);

  // Later entries override earlier ones by name
  const byName = new Map<string, PlaybookSource>();
  for (const sources of dirs) {
    for (const src of sources) {
      byName.set(src.def.name, src);
    }
  }

  return Array.from(byName.values());
}

/**
 * Load a specific playbook by name.
 */
export async function loadPlaybook(
  name: string,
  projectDir: string,
): Promise<PlaybookSource | null> {
  const all = await discoverPlaybooks(projectDir);
  return all.find((p) => p.def.name === name) || null;
}

/* ------------------------------------------------------------------ */
/*  Variable Resolution                                                */
/* ------------------------------------------------------------------ */

/**
 * Substitute ${varName} placeholders in a string.
 */
export function substituteVars(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

/**
 * Resolve a playbook with input variables.
 * Validates required inputs and applies defaults.
 */
export function resolvePlaybook(
  source: PlaybookSource,
  inputVars: Record<string, string>,
): ResolvedPlaybook {
  const { def, templateDir } = source;
  const vars: Record<string, string> = {};

  // Apply defaults, then overrides
  if (def.inputs) {
    for (const [key, input] of Object.entries(def.inputs)) {
      if (inputVars[key] !== undefined) {
        vars[key] = inputVars[key];
      } else if (input.default !== undefined) {
        vars[key] = input.default;
      } else if (input.required) {
        throw new Error(
          `Required input "${key}" not provided for playbook "${def.name}"`,
        );
      }
    }
  }

  // Include extra vars not declared in inputs
  for (const [key, value] of Object.entries(inputVars)) {
    if (!(key in vars)) vars[key] = value;
  }

  // Resolve ${var} in defaults that reference other vars
  for (const [key, value] of Object.entries(vars)) {
    vars[key] = substituteVars(value, vars);
  }

  // Derive epicId from playbook name + key input value
  const keyInput =
    def.key ||
    (def.inputs &&
      Object.entries(def.inputs).find(([, v]) => v.required)?.[0]) ||
    undefined;
  const keyValue = keyInput ? vars[keyInput] : undefined;

  // epicId is the per-run identifier used for journal paths and checkpoint keys.
  // For a keyed playbook we suffix the key value so concurrent runs on
  // different inputs don't collide. For a keyless playbook the epicId is just
  // the playbook name — stable across re-runs, which keeps journal paths at
  // `journal/{playbook}/...` instead of burying them under a timestamped
  // subdir.
  const epicId = keyValue
    ? `${def.name}-${keyValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`
    : def.name;

  return { def, vars, epicId, templateDir };
}
