/**
 * RFC 0031: Unified Declarative Playbook Loader
 *
 * Reads tasks.jsonl (row-1 header + rows 2..N task entries) to build a TaskDag.
 * Supports two flavours via taskRef.kind:
 *   - "static" → reads TASK.md from tasks/<id>/ directory
 *   - "template" → reads TASK.md from templates/<name>/ directory and renders with params
 *
 * Replaces the legacy playbook.yml parser + discoverSpawnedChildren pipeline.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { TaskDag } from "../dag/task-dag.js";
import type { DagNode } from "../dag/dag-node.js";
import type { TaskDefinition } from "./task-definition.js";
import type { Check } from "./task-definition.js";
import { parseTaskMdString, mapTaskMdToTaskDefinition } from "./task-md-definition.js";
import {
  readUnifiedTasksFile,
  type RuntimePlaybookHeader,
  type UnifiedRuntimeTask,
} from "../task/goal/unified-tasks.ts";
import type { PlaybookDef } from "../task/playbook/types.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LoaderError {
  type: string;
  message: string;
}

export interface UnifiedDagResult {
  dag: TaskDag;
  errors: LoaderError[];
  globalChecks: Check[];
  playbookHeader: RuntimePlaybookHeader | null;
}

/* ------------------------------------------------------------------ */
/*  Main loader                                                        */
/* ------------------------------------------------------------------ */

export function buildDagFromUnifiedInventory(
  playbookDir: string,
  inventoryDir: string,
): UnifiedDagResult {
  const dag = new TaskDag();
  const errors: LoaderError[] = [];
  const globalChecks: Check[] = [];
  const idToPath = new Map<string, string>();

  const tasksFile = join(inventoryDir, "tasks.jsonl");
  let header: RuntimePlaybookHeader | null;
  let tasks: UnifiedRuntimeTask[];

  try {
    const result = readUnifiedTasksFile(tasksFile);
    header = result.header;
    tasks = result.tasks;
  } catch (err) {
    // Legacy rows found in tasks.jsonl — check for dual-format.
    const playbookYamlPath = join(playbookDir, "playbook.yml");
    if (existsSync(playbookYamlPath)) {
      errors.push({
        type: "dual_format",
        message:
          `tasks.jsonl exists at ${tasksFile} but contains legacy-format rows ` +
          `without a unified \`kind\` field, while playbook.yml also exists. ` +
          "Run `converge migrate --rfc=0031` to migrate to unified format.",
      });
      return buildDagFromLegacyPlaybook(playbookDir, errors, globalChecks, idToPath);
    }
    throw err;
  }

  if (header === null) {
    // No unified header — check for legacy playbook.yml
    const playbookYamlPath = join(playbookDir, "playbook.yml");
    if (existsSync(playbookYamlPath)) {
      // Legacy mode: fall through to old loader path (kept for migration window)
      return buildDagFromLegacyPlaybook(playbookDir, errors, globalChecks, idToPath);
    }
    return { dag, errors, globalChecks, playbookHeader: null };
  }

  // ── Dual-format rejection ─────────────────────────────────────
  const playbookYamlPath = join(playbookDir, "playbook.yml");
  if (existsSync(playbookYamlPath)) {
    errors.push({
      type: "dual_format",
      message:
        "Both playbook.yml and unified tasks.jsonl header found. " +
        "Run `converge migrate --rfc=0031` to migrate to unified format.",
    });
    return { dag, errors, globalChecks, playbookHeader: header };
  }

  // ── Populate playbook-level metadata ──────────────────────────
  dag.playbookName = header.name;

  if (header.checks) {
    globalChecks.push(...header.checks.map((c) => ({ id: c.id, cmd: c.cmd, description: c.description, type: c.type as Check["type"] })));
  }

  // ── Build DAG nodes from unified task rows ────────────────────
  for (const taskRow of tasks) {
    const { taskDef, path, id } = resolveTaskFromRow(taskRow, playbookDir, errors, idToPath);
    if (!taskDef) continue;

    const deps = taskRow.depends_on ?? taskDef.depends_on ?? [];

    const node: DagNode = {
      id,
      type: "normal",
      parents: taskRow.parent ? [taskRow.parent] : [],
      children: [],
      depends_on: deps,
      depended_on_by: [],
      taskDef: { ...taskDef, depends_on: deps },
      path,
      status: taskRow.status === "todo" ? "pending" : taskRow.status === "doing" ? "ready" : taskRow.status === "done" ? "complete" : "pending",
      virtual: false,
    };

    dag.addNode(node);
  }

  // ── Cycle detection ──────────────────────────────────────────
  const cycle = detectCycle(dag);
  if (cycle) {
    errors.push({ type: "cycle", message: `Cycle detected: ${cycle.join(" → ")}` });
  }

  return { dag, errors, globalChecks, playbookHeader: header };
}

/**
 * Resolve a task definition from a unified row.
 * Static rows → read TASK.md from taskRef.dir
 * Template rows → read TASK.md from templates/<name>/, optionally render with params
 */
function resolveTaskFromRow(
  row: UnifiedRuntimeTask,
  playbookDir: string,
  errors: LoaderError[],
  idToPath: Map<string, string>,
): { taskDef: TaskDefinition | null; path: string; id: string } {
  if (row.taskRef.kind === "static") {
    const taskDir = row.taskRef.dir;
    const taskMdPath = join(taskDir, "TASK.md");

    if (!existsSync(taskMdPath)) {
      errors.push({
        type: "missing_task",
        message: `TASK.md not found at ${taskMdPath}`,
      });
      return { taskDef: null, path: taskMdPath, id: row.id };
    }

    const externalDef = loadTaskFile(taskMdPath);
    const taskDef: TaskDefinition = {
      id: row.id,
      title: row.title ?? externalDef.title ?? row.id,
      description: externalDef.description,
      prompt: externalDef.prompt ?? "",
      inputs: externalDef.inputs ?? [],
      outputs: externalDef.outputs ?? [],
      checks: externalDef.checks ?? [],
      skill: (externalDef as any).skill ?? (externalDef as any).skills,
      vars: externalDef.vars,
      tags: externalDef.tags,
      agent: (externalDef as any).agent,
      ai: (externalDef as any).ai,
      depends_on: row.depends_on ?? externalDef.depends_on ?? [],
      materialization: externalDef.materialization,
      onFail: externalDef.onFail,
      blocking: true,
    };

    idToPath.set(row.id, taskMdPath);
    return { taskDef, path: taskMdPath, id: row.id };
  }

  if (row.taskRef.kind === "template") {
    const templateDir = join(playbookDir, "templates", row.taskRef.name);
    const taskMdPath = join(templateDir, "TASK.md");

    if (!existsSync(taskMdPath)) {
      errors.push({
        type: "missing_template",
        message: `Template TASK.md not found at ${taskMdPath}`,
      });
      return { taskDef: null, path: taskMdPath, id: row.id };
    }

    const externalDef = loadTaskFile(taskMdPath);

    // Render vars with params if provided
    const rawPrompt = externalDef.prompt ?? "";
    const renderedPrompt = typeof rawPrompt === "string"
      ? rawPrompt.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          if (row.params && key in row.params) {
            return String(row.params[key]);
          }
          return match;
        })
      : rawPrompt;
    const renderedVars = { ...externalDef.vars };
    if (row.params) {
      for (const [key, value] of Object.entries(row.params)) {
        if (renderedVars) {
          (renderedVars as any)[key] = value;
        }
      }
    }

    const taskDef: TaskDefinition = {
      id: row.id,
      title: row.title ?? externalDef.title ?? row.id,
      description: externalDef.description,
      prompt: renderedPrompt,
      inputs: externalDef.inputs ?? [],
      outputs: externalDef.outputs ?? [],
      checks: externalDef.checks ?? [],
      skill: (externalDef as any).skill ?? (externalDef as any).skills,
      vars: renderedVars,
      tags: externalDef.tags,
      agent: (externalDef as any).agent,
      ai: (externalDef as any).ai,
      depends_on: row.depends_on ?? externalDef.depends_on ?? [],
      materialization: externalDef.materialization,
      onFail: externalDef.onFail,
      blocking: true,
    };

    idToPath.set(row.id, taskMdPath);
    return { taskDef, path: taskMdPath, id: row.id };
  }

  errors.push({
    type: "unknown_task_ref",
    message: `Unknown taskRef kind for task ${row.id}`,
  });
  return { taskDef: null, path: "", id: row.id };
}

/** Load fields from an external TASK.md file. */
export function loadTaskFile(absPath: string): Partial<TaskDefinition> {
  if (!existsSync(absPath)) return {};
  try {
    const raw = readFileSync(absPath, "utf-8");
    const parsed = parseTaskMdString(raw);
    const taskDir = dirname(absPath);
    const taskId = basename(taskDir);
    const mapped = mapTaskMdToTaskDefinition(parsed, parsed.body ?? "", taskId, taskDir);
    return {
      ...mapped,
      prompt: mapped.prompt || (parsed.vars as any)?.prompt || parsed.prompt,
    };
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/*  Legacy fallback (kept for migration window)                        */
/* ------------------------------------------------------------------ */

/**
 * Legacy playbook.yml parser — kept only for the migration window.
 * Will be removed in v2.0 when dual-format support is dropped.
 *
 * RFC 0032 (clean break): the `tasks:` key is banned from playbook.yml.
 * Tasks are auto-discovered from the `tasks/` folder only.
 */
export function buildDagFromLegacyPlaybook(
  playbookDir: string,
  errors: LoaderError[],
  globalChecks: Check[],
  idToPath: Map<string, string>,
): { dag: TaskDag; errors: LoaderError[]; globalChecks: Check[]; playbookHeader: null } {
  const dag = new TaskDag();
  const playbookPath = join(playbookDir, "playbook.yml");

  if (!existsSync(playbookPath)) {
    return { dag, errors, globalChecks, playbookHeader: null };
  }

  const raw = readFileSync(playbookPath, "utf-8");
  const yaml = parseYaml(raw);

  if (!yaml || typeof yaml !== "object" || Array.isArray(yaml)) {
    errors.push({
      type: "invalid_format",
      message: "playbook.yml must be a YAML mapping",
    });
    return { dag, errors, globalChecks, playbookHeader: null };
  }

  const pb = yaml as PlaybookDef;
  dag.playbookName = pb.name ?? "";

  // ── RFC 0032: `tasks:` key is banned ──────────────────────
  if (pb.tasks !== undefined) {
    throw new Error(
      `playbook.yml contains a \`tasks:\` key. ` +
      `Inline task declarations are no longer supported (RFC 0032). ` +
      `Remove the \`tasks:\` block from playbook.yml — tasks are auto-discovered from the tasks/ folder.\n` +
      `Migration: run \`converge migrate --rfc=0032\``,
    );
  }

  if (pb.checks) {
    globalChecks.push(...pb.checks.map((c) => ({ id: c.id, cmd: c.cmd, description: c.description, type: c.type as Check["type"] })));
  }

  // ── Auto-discover top-level tasks from tasks/ folder ─────
  const tasksDir = join(playbookDir, "tasks");
  const entries: { path: string; depends_on?: string[] }[] = [];
  if (existsSync(tasksDir)) {
    try {
      const subdirs = readdirSync(tasksDir, { withFileTypes: true })
        .filter((d: any) => d.isDirectory())
        .map((d: any) => d.name);
      for (const sub of subdirs) {
        if (existsSync(join(tasksDir, sub, "TASK.md"))) {
          entries.push({ path: sub });
        }
      }
    } catch {
      // Discovery failures fall through
    }
  }

  for (const entry of entries) {
    const taskId = entry.path.includes("/") ? entry.path.split("/").pop()! : entry.path;
    const taskMdPath = join(playbookDir, "tasks", entry.path, "TASK.md");

    if (!existsSync(taskMdPath)) {
      throw new Error(
        `Task "${taskId}" has no TASK.md file at ${taskMdPath}. ` +
        `All tasks must have a TASK.md file in the tasks/ folder. ` +
        `Run \`converge migrate --rfc=0032\` to create missing TASK.md files.`,
      );
    }

    const externalDef = loadTaskFile(taskMdPath);
    const taskDef: TaskDefinition = {
      id: taskId,
      title: externalDef.title ?? taskId,
      description: externalDef.description,
      prompt: externalDef.prompt ?? "",
      inputs: externalDef.inputs ?? [],
      outputs: externalDef.outputs ?? [],
      checks: externalDef.checks ?? [],
      skill: (externalDef as any).skill,
      vars: externalDef.vars,
      tags: externalDef.tags,
      agent: (externalDef as any).agent,
      ai: (externalDef as any).ai,
      depends_on: entry.depends_on ?? externalDef.depends_on ?? [],
      materialization: externalDef.materialization,
      onFail: externalDef.onFail,
      blocking: true,
    };

    idToPath.set(taskId, taskMdPath);

    const node: DagNode = {
      id: taskId,
      type: "normal",
      parents: [],
      children: [],
      depends_on: taskDef.depends_on ?? [],
      depended_on_by: [],
      taskDef,
      path: taskMdPath,
      status: "pending",
      virtual: false,
    };

    dag.addNode(node);
  }

  const cycle = detectCycle(dag);
  if (cycle) {
    errors.push({ type: "cycle", message: `Cycle detected: ${cycle.join(" → ")}` });
  }

  return { dag, errors, globalChecks, playbookHeader: null };
}

/* ------------------------------------------------------------------ */
/*  Cycle detection                                                    */
/* ------------------------------------------------------------------ */

function detectCycle(dag: TaskDag): string[] | null {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const id of dag.nodes.keys()) color.set(id, WHITE);

  function dfs(id: string, path: string[]): string[] | null {
    color.set(id, GRAY);
    path.push(id);
    for (const neighborId of dag.nodes.get(id)!.depends_on || []) {
      const c = color.get(neighborId);
      if (c === undefined) continue;
      if (c === GRAY) {
        const start = path.indexOf(neighborId);
        return [...path.slice(start), neighborId];
      }
      if (c === WHITE) {
        const result = dfs(neighborId, path);
        if (result) return result;
      }
    }
    path.pop();
    color.set(id, BLACK);
    return null;
  }

  for (const id of dag.nodes.keys()) {
    if (color.get(id) === WHITE) {
      const result = dfs(id, []);
      if (result) return result;
    }
  }
  return null;
}
