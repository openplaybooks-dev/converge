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
import type {
  PlaybookDef,
  PlaybookInput,
  PlaybookRunConfig,
  PlaybookCheck,
  PlaybookTask,
  PlaybookSource,
  ResolvedPlaybook,
} from "./types.ts";

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

function parseRunConfig(raw: unknown): PlaybookRunConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const config: PlaybookRunConfig = {};

  if (obj.mode && typeof obj.mode === "string") {
    // Backward compat: map deprecated mode names
    const modeMap: Record<string, PlaybookRunConfig["mode"]> = {
      autonomous: "oneoff",
      evolve: "converge",
      // "step" is no longer a playbook mode — it's CLI-only (--step)
    };
    if (modeMap[obj.mode]) {
      console.warn(`⚠️  Deprecated mode "${obj.mode}" — use "${modeMap[obj.mode]}" instead.`);
      config.mode = modeMap[obj.mode];
    } else if (["oneoff", "converge", "loop", "dispatch"].includes(obj.mode)) {
      config.mode = obj.mode as PlaybookRunConfig["mode"];
    }
  }
  if (obj.maxTaskAttempts !== undefined)
    config.maxTaskAttempts = Number(obj.maxTaskAttempts);
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

function parseChecks(raw: unknown): PlaybookCheck[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const checks: PlaybookCheck[] = [];
  for (const item of raw) {
    // String shorthand: "test:freshness(path=output.txt)"
    if (typeof item === "string") {
      if (item.startsWith("test:")) {
        const parsed = parseTestRefString(item);
        if (!parsed) {
          throw new Error(
            `Malformed playbook test reference: "${item}". Expected format: test:<name> or test:<name>(key=val,...)`,
          );
        }
        checks.push({
          id: `test:${parsed.name}`,
          type: "test",
          name: parsed.name,
          args: parsed.args,
        });
      }
      continue;
    }

    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;

    // Object form: { id, description, type: test, name, args }
    if (obj.type === "test") {
      if (!obj.name || typeof obj.name !== "string") {
        throw new Error(
          `Playbook check with type: "test" must have a "name" field`,
        );
      }
      const name = String(obj.name);
      const args: Record<string, string> = {};
      if (obj.args && typeof obj.args === "object") {
        for (const [k, v] of Object.entries(obj.args as Record<string, unknown>)) {
          args[k] = String(v);
        }
      }
      const entry: PlaybookCheck = {
        id: obj.id ? String(obj.id) : `test:${name}`,
        type: "test",
        name,
        args,
      };
      if (obj.description) entry.description = String(obj.description);
      checks.push(entry);
      continue;
    }

    if (!obj.id) continue;
    const id = String(obj.id);
    const type = obj.type === "ai" ? "ai" : "cmd";

    if (type === "ai") {
      if (!obj.check || typeof obj.check !== "string") {
        throw new Error(
          `Playbook check "${id}" has type: ai but is missing required "check:" field (the natural-language assertion).`,
        );
      }
      if (obj.cmd) {
        throw new Error(
          `Playbook check "${id}" sets both "cmd" and "type: ai". Use one or the other.`,
        );
      }
      const entry: PlaybookCheck = { id, type: "ai", check: String(obj.check) };
      if (obj.description) entry.description = String(obj.description);
      if (obj.agent) entry.agent = String(obj.agent);
      if (obj.model) entry.model = String(obj.model);
      if (obj.timeoutMs !== undefined) entry.timeoutMs = Number(obj.timeoutMs);
      checks.push(entry);
    } else if (obj.cmd) {
      const entry: PlaybookCheck = { id, cmd: String(obj.cmd) };
      if (obj.description) entry.description = String(obj.description);
      checks.push(entry);
    }
  }
  return checks.length > 0 ? checks : undefined;
}

function parseTestRefString(
  raw: string,
): { name: string; args: Record<string, string> } | null {
  const match = raw.match(/^test:([^(]+)(?:\(([^)]*)\))?$/);
  if (!match) return null;
  const name = match[1].trim();
  if (!name) return null;
  const args: Record<string, string> = {};
  if (match[2]) {
    for (const pair of match[2].split(",")) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) {
        throw new Error(
          `Malformed test args in "${raw}": expected key=val, got "${trimmed}"`,
        );
      }
      args[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
  return { name, args };
}

function parseTasks(raw: unknown): PlaybookTask[] {
  if (!Array.isArray(raw)) return [];
  const tasks: PlaybookTask[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const task: PlaybookTask = {};
    if (obj.path) task.path = String(obj.path);
    else if (obj.id) task.path = String(obj.id);
    if (obj.playbook) task.playbook = String(obj.playbook);
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
 * Parse playbook.yml from a template directory.
 */
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

  return {
    name,
    description: parsed.description ? String(parsed.description) : undefined,
    key: parsed.key ? String(parsed.key) : undefined,
    inputs: parseInputs(parsed.inputs),
    tasks: parseTasks(parsed.tasks),
    run: parseRunConfig(parsed.run),
    checks: parseChecks(parsed.checks),
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

  // tasks/ directory or root TASK.md must exist (except for converge/loop/dispatch mode which creates tasks dynamically)
  if (def.run?.mode !== "converge" && def.run?.mode !== "loop" && def.run?.mode !== "dispatch") {
    const tasksDir = join(templateDir, "tasks");
    const rootTaskMd = join(templateDir, "TASK.md");
    if (!existsSync(tasksDir) && !existsSync(rootTaskMd)) {
      errors.push(`No tasks/ directory or root TASK.md found at ${templateDir}`);
    }
  }

  // Validate run config
  if (
    def.run?.mode &&
    !["oneoff", "converge", "loop", "dispatch"].includes(def.run.mode)
  ) {
    errors.push(
      `Invalid run mode: "${def.run.mode}" (expected: oneoff, converge, loop)`,
    );
  }

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
