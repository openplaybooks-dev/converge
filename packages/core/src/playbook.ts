/**
 * Playbook builders.
 *
 * One in-memory shape, two sources:
 *   - `definePlaybook(...)` — built in code.
 *   - `loadPlaybookFromFolder(...)` — parsed from a `.converge/playbooks/<slug>/`
 *     folder containing `playbook.yml` + `tasks/<id>/TASK.md`.
 *
 * Both produce the same `Playbook` object. The runtime (`run(...)`) cannot
 * tell them apart.
 *
 * `writePlaybookToFolder(...)` is the inverse — used by the planner-playbook
 * to materialize a freshly-planned playbook to disk.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  parsePlaybookYml,
  loadPlaybook as discoverLoadPlaybook,
} from "./task/playbook/loader.js";
import type {
  PlaybookDef,
  PlaybookInput,
  PlaybookGoal,
  PlaybookRunConfig,
  PlaybookTask,
} from "./task/playbook/types.js";
import type { TaskDefinition } from "./config/task-definition.js";
import type { HookDefinition } from "./hooks/hook-definition.js";

// `taskDef()` is the canonical builder. Returns a `TaskDefinitionBuilder`
// which `.build()`s to a `TaskDefinition`. Use this for tasks inside
// `definePlaybook(...)`.
export { taskDef, seeds, tests } from "./config/task-definition.js";
export type { TaskDefinition, SeedSpec, TestSpec } from "./config/task-definition.js";
export type {
  PlaybookDef,
  PlaybookInput,
  PlaybookGoal,
  PlaybookRunConfig,
  PlaybookTask,
} from "./task/playbook/types.js";

/* ------------------------------------------------------------------ */
/*  Playbook shape                                                     */
/* ------------------------------------------------------------------ */

/**
 * The unified in-memory shape used by the runtime.
 *
 * `def` is the playbook contract (name, inputs, task entries, run config) —
 * the same shape `playbook.yml` parses into. `tasks` is the per-task
 * definitions referenced by `def.tasks`, keyed by id, used when the
 * playbook is built in code (no `tasks/<id>/TASK.md` files on disk).
 * `dir` is set when the playbook came from a folder; the runtime uses it
 * to read TASK.md files.
 */
export interface Playbook {
  def: PlaybookDef;
  /** Per-task definitions for code-defined playbooks (no on-disk TASK.md). */
  tasks: Map<string, TaskDefinition>;
  /** Source folder, set by `loadPlaybookFromFolder`. */
  dir?: string;
}

export interface DefinePlaybookConfig {
  name: string;
  description?: string;
  key?: string;
  inputs?: Record<string, PlaybookInput>;
  run?: PlaybookRunConfig;
  /**
   * Tasks. Each task is either a `TaskDefinition` (built via `taskDef()`)
   * or a `PlaybookTask` reference (id + depends_on, for cases where the
   * task's body is supplied separately).
   */
  tasks: TaskDefinition[];
  /** Playbook-level goals — measurable completion conditions. */
  goals?: PlaybookGoal[];
  /**
   * Hook definitions — match tasks by tag, create companion DAG nodes
   * at the right topological position.
   */
  hooks?: HookDefinition[];
}

/**
 * Build a playbook in code. The returned `Playbook` is interchangeable
 * with one loaded from a folder — `run(playbook, opts)` accepts both.
 */
export function definePlaybook(config: DefinePlaybookConfig): Playbook {
  const tasks = new Map<string, TaskDefinition>();
  const playbookTasks: PlaybookTask[] = [];

  for (const t of config.tasks) {
    if (!t.id) {
      throw new Error("definePlaybook: every task must have an id");
    }
    tasks.set(t.id, t);
    playbookTasks.push({
      id: t.id,
      path: t.id,
      depends_on:
        Array.isArray(t.depends_on) && t.depends_on.length > 0
          ? t.depends_on
          : undefined,
    });
  }

  const def: PlaybookDef = {
    name: config.name,
    description: config.description,
    key: config.key,
    inputs: config.inputs,
    run: config.run,
    tasks: playbookTasks,
    goals: config.goals,
    hooks: config.hooks,
  };

  return { def, tasks };
}

/* ------------------------------------------------------------------ */
/*  Folder I/O                                                         */
/* ------------------------------------------------------------------ */

/**
 * Parse a folder layout (`playbook.yml` + `tasks/<id>/TASK.md`) into the
 * same in-memory `Playbook` shape `definePlaybook` produces.
 *
 * The runtime reads TASK.md bodies on demand at execute time (via
 * `Unit.fromPath`), so this loader doesn't need to populate `tasks` —
 * the source folder is the source of truth and `dir` points to it.
 */
export async function loadPlaybookFromFolder(dir: string): Promise<Playbook> {
  if (!existsSync(dir)) {
    throw new Error(`loadPlaybookFromFolder: ${dir} does not exist`);
  }
  const def = await parsePlaybookYml(dir);
  return { def, tasks: new Map(), dir };
}

/**
 * Discover a playbook by name from a project directory's
 * `.converge/playbooks/`. Convenience wrapper around the existing
 * `loadPlaybook` discovery helper.
 */
export async function loadPlaybookByName(
  name: string,
  projectDir: string,
): Promise<Playbook | null> {
  const source = await discoverLoadPlaybook(name, projectDir);
  if (!source) return null;
  return { def: source.def, tasks: new Map(), dir: source.templateDir };
}

/**
 * Serialize an in-memory `Playbook` to a folder. Emits `playbook.yml`
 * and one `tasks/<id>/TASK.md` per task. Used by the planner-playbook's
 * final task to materialize the produced playbook on disk.
 *
 * Tasks built via `taskDef().run(fn)` (executor functions) cannot be
 * serialized — their body is JS, not markdown. This writer skips the
 * body for such tasks and emits frontmatter only; the produced folder
 * is suitable for tasks whose bodies are agent prompts.
 */
export async function writePlaybookToFolder(
  pb: Playbook,
  dir: string,
): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "playbook.yml"), buildPlaybookYaml(pb.def), "utf-8");

  if (pb.def.tasks.length === 0) return;
  const tasksRoot = join(dir, "tasks");
  await mkdir(tasksRoot, { recursive: true });

  for (const entry of pb.def.tasks) {
    if (!entry.path) continue;
    const taskId = entry.path.includes("/") ? entry.path.split("/").pop()! : entry.path;
    const taskDir = join(tasksRoot, entry.path.replace(/\//g, "/tasks/"));
    await mkdir(taskDir, { recursive: true });
    const def = pb.tasks.get(taskId);
    await writeFile(
      join(taskDir, "TASK.md"),
      buildTaskMarkdown(taskId, def, entry),
      "utf-8",
    );
  }
}

/* ------------------------------------------------------------------ */
/*  YAML / Markdown emit                                               */
/* ------------------------------------------------------------------ */

function buildPlaybookYaml(def: PlaybookDef): string {
  const lines: string[] = [];
  lines.push(`name: ${yamlInlineString(def.name)}`);
  if (def.description) {
    lines.push(`description: ${yamlInlineString(def.description)}`);
  }
  if (def.key) {
    lines.push(`key: ${yamlInlineString(def.key)}`);
  }
  if (def.inputs && Object.keys(def.inputs).length > 0) {
    lines.push("inputs:");
    for (const [name, input] of Object.entries(def.inputs)) {
      lines.push(`  ${name}:`);
      if (input.default !== undefined)
        lines.push(`    default: ${yamlInlineString(String(input.default))}`);
      if (input.required) lines.push(`    required: true`);
      if (input.description)
        lines.push(`    description: ${yamlInlineString(input.description)}`);
    }
  }
  if (def.run) {
    lines.push("run:");
    if (def.run.mode)
      lines.push(`  mode: ${yamlInlineString(def.run.mode)}`);
    if (typeof def.run.maxTaskAttempts === "number")
      lines.push(`  maxTaskAttempts: ${def.run.maxTaskAttempts}`);
    if (typeof def.run.workers === "number")
      lines.push(`  workers: ${def.run.workers}`);
    if (typeof def.run.maxIterations === "number")
      lines.push(`  maxIterations: ${def.run.maxIterations}`);
    if (typeof def.run.maxDuration === "number")
      lines.push(`  maxDuration: ${def.run.maxDuration}`);
    if (def.run.resume) lines.push(`  resume: true`);
  }
  lines.push("");
  lines.push("tasks:");
  for (const t of def.tasks) {
    lines.push(`  - path: ${yamlInlineString(t.path ?? "")}`);
    if (Array.isArray(t.depends_on) && t.depends_on.length > 0) {
      lines.push(
        `    depends_on: [${t.depends_on.map(yamlInlineString).join(", ")}]`,
      );
    }
  }
  if (def.checks && def.checks.length > 0) {
    lines.push("");
    lines.push("checks:");
    for (const c of def.checks) {
      lines.push(`  - id: ${yamlInlineString(c.id)}`);
      lines.push(`    cmd: ${yamlInlineString(c.cmd)}`);
      if (c.type) lines.push(`    type: ${yamlInlineString(c.type)}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function buildTaskMarkdown(
  id: string,
  def: TaskDefinition | undefined,
  entry: PlaybookTask,
): string {
  const title = def?.title ?? id;
  const description = def?.description ?? "";
  const inputs = def?.inputs ?? [];
  const outputs = def?.outputs ?? [];
  const checks = def?.checks ?? [];
  const tags = def?.tags ?? [];
  const deps = def?.depends_on ?? [];

  const front: string[] = ["---"];
  front.push(`id: ${yamlInlineString(id)}`);
  front.push(`title: ${yamlInlineString(title)}`);
  if (description) front.push(`description: ${yamlInlineString(description)}`);
  if (def?.skill) {
    const skill = Array.isArray(def.skill) ? def.skill.join(",") : def.skill;
    front.push(`skill: ${yamlInlineString(skill)}`);
  }
  if (def?.agent) front.push(`agent: ${yamlInlineString(def.agent)}`);
  if (inputs.length > 0) {
    front.push("inputs:");
    for (const v of inputs) front.push(`  - ${yamlInlineString(v)}`);
  }
  if (outputs.length > 0) {
    front.push("outputs:");
    for (const v of outputs) front.push(`  - ${yamlInlineString(v)}`);
  }
  if (checks.length > 0) {
    front.push("checks:");
    for (const c of checks as any[]) {
      const cId = typeof c === "string" ? c : c.id;
      if (!cId) continue;
      front.push(`  - id: ${yamlInlineString(cId)}`);
      if (typeof c === "object") {
        if (c.type) front.push(`    type: ${yamlInlineString(c.type)}`);
        if (c.cmd) front.push(`    cmd: ${yamlInlineString(c.cmd)}`);
        if (c.check) front.push(`    check: ${yamlInlineString(c.check)}`);
        if (c.description)
          front.push(`    description: ${yamlInlineString(c.description)}`);
      }
    }
  }
  if (deps.length > 0) {
    front.push("depends_on:");
    for (const d of deps) front.push(`  - ${yamlInlineString(d)}`);
  }
  if (tags.length > 0) {
    front.push("tags:");
    for (const t of tags) front.push(`  - ${yamlInlineString(t)}`);
  }
  front.push("---", "");

  const body: string[] = [`# ${title}`, ""];
  const prompt = typeof def?.prompt === "string" ? def.prompt : "";
  body.push(
    prompt ||
      description ||
      "Describe what this task produces, the inputs it consumes, and how its output is verified.",
  );
  body.push("");

  return front.join("\n") + body.join("\n");
}

function yamlInlineString(v: string): string {
  if (v === "") return '""';
  if (
    /^[A-Za-z0-9_./@][A-Za-z0-9 _.,;'/()&@\-+!?%*=]*$/.test(v) &&
    !/[#]/.test(v) &&
    !/: /.test(v) &&
    !/^(true|false|null|yes|no|on|off|~)$/i.test(v)
  ) {
    return v;
  }
  return JSON.stringify(v);
}

/* ------------------------------------------------------------------ */
/*  Re-exports for direct disk access                                  */
/* ------------------------------------------------------------------ */

/**
 * Walk a folder tree under `dir/tasks` and collect every TASK.md path.
 * Useful when a consumer needs to enumerate the task contracts a
 * folder-based playbook ships with.
 */
export async function listTaskFiles(dir: string): Promise<string[]> {
  const tasksDir = join(dir, "tasks");
  if (!existsSync(tasksDir)) return [];
  const result: string[] = [];
  await walk(tasksDir, result);
  return result;
}

async function walk(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.name === "TASK.md") out.push(full);
  }
}

/**
 * Read a TASK.md from disk (utility — `run()` uses `Unit.fromPath`
 * directly, but consumers like the studio's plan-review surface may
 * want raw access).
 */
export async function readTaskMd(taskMdPath: string): Promise<string> {
  return readFile(taskMdPath, "utf-8");
}
