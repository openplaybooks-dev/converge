/**
 * Declarative Playbook Loader — builds a TaskDag from playbook.yml ONLY.
 *
 * Pure declarative, dbt-style. No filesystem walking. No folder scanning.
 * No `children:` frontmatter parsing. No old-format fallback.
 *
 * playbook.yml is the single source of truth. Every task is declared in
 * the `tasks:` array. A task either carries inline fields (prompt, inputs,
 * outputs, checks) or references an external TASK.md via `file:`.
 *
 * The DAG is built from `depends_on` edges. Topological sort determines
 * execution order. That's it.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { TaskDag } from "../dag/task-dag.js";
import type { DagNode } from "../dag/dag-node.js";
import type { TaskDefinition } from "./task-definition.js";
import type { Check } from "./task-definition.js";
import { parseTaskMdString } from "./task-md-definition.js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LoaderError {
  type: string;
  message: string;
}

interface TaskEntry {
  id: string;
  depends_on?: string[];
  title?: string;
  description?: string;
  prompt?: string;
  inputs?: string[];
  outputs?: string[];
  skill?: string | string[];
  agent?: string;
  checks?: Check[];
  vars?: Record<string, unknown>;
  tags?: string[];
  file?: string;
}

interface PlaybookYaml {
  name?: string;
  tasks?: TaskEntry[];
  checks?: Check[];
  run?: Record<string, unknown>;
  vars?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Main loader                                                        */
/* ------------------------------------------------------------------ */

export function buildDagFromPlaybook(playbookDir: string): {
  dag: TaskDag;
  errors: LoaderError[];
  globalChecks: Check[];
} {
  const dag = new TaskDag();
  const errors: LoaderError[] = [];
  const globalChecks: Check[] = [];
  const idToPath = new Map<string, string>();

  const playbookPath = join(playbookDir, "playbook.yml");
  if (!existsSync(playbookPath)) {
    return { dag, errors, globalChecks };
  }

  const raw = readFileSync(playbookPath, "utf-8");
  const yaml = parseYaml(raw);

  if (!yaml || typeof yaml !== "object" || Array.isArray(yaml)) {
    errors.push({ type: "invalid_format", message: "playbook.yml must be a YAML mapping with a `tasks:` array" });
    return { dag, errors, globalChecks };
  }

  const pb = yaml as PlaybookYaml;

  // ── Global checks ─────────────────────────────────────────────
  if (pb.checks && Array.isArray(pb.checks)) {
    globalChecks.push(...(pb.checks as Check[]));
  }

  // ── Build nodes from tasks: array ────────────────────────────
  const entries: TaskEntry[] = (pb.tasks || []).map((t: any) => ({
    id: t.id,
    depends_on: t.depends_on,
    title: t.title,
    description: t.description,
    prompt: t.prompt,
    inputs: t.inputs,
    outputs: t.outputs,
    skill: t.skill,
    agent: t.agent,
    checks: t.checks,
    vars: t.vars,
    tags: t.tags,
    file: t.file,
  }));

  for (const entry of entries) {
    if (!entry.id) {
      errors.push({ type: "missing_id", message: "Task entry missing `id` field" });
      continue;
    }

    // Resolve task definition: inline fields, file reference, or minimal stub
    const { taskDef, path } = resolveTaskDef(entry, playbookDir, errors, idToPath);

    const node: DagNode = {
      id: entry.id,
      parents: [],
      children: [],
      depends_on: entry.depends_on ?? [],
      depended_on_by: [],
      taskDef,
      path,
      status: "pending",
      virtual: false,
    };

    dag.addNode(node);
  }

  // ── Cycle detection ──────────────────────────────────────────
  const cycle = detectCycle(dag);
  if (cycle) {
    errors.push({ type: "cycle", message: `Cycle detected: ${cycle.join(" → ")}` });
  }

  return { dag, errors, globalChecks };
}

/* ------------------------------------------------------------------ */
/*  Task definition resolution                                          */
/* ------------------------------------------------------------------ */

function resolveTaskDef(
  entry: TaskEntry,
  playbookDir: string,
  errors: LoaderError[],
  idToPath: Map<string, string>,
): { taskDef: TaskDefinition; path: string } {
  let path = join(playbookDir, entry.id, "TASK.md");
  let externalDef: Partial<TaskDefinition> = {};

  // Load external file if specified
  if (entry.file) {
    path = resolve(playbookDir, entry.file);
    externalDef = loadTaskFile(path);
  } else if (!hasInlineFields(entry)) {
    // No inline fields and no file — try convention path
    const found = findTaskPath(playbookDir, entry.id);
    if (found) {
      path = found;
      externalDef = loadTaskFile(path);
    }
  }

  // Build final definition — inline fields override external
  const taskDef: TaskDefinition = {
    id: entry.id,
    title: entry.title ?? externalDef.title ?? entry.id,
    description: entry.description ?? externalDef.description,
    prompt: entry.prompt ?? externalDef.prompt ?? "",
    inputs: entry.inputs ?? externalDef.inputs ?? [],
    outputs: entry.outputs ?? externalDef.outputs ?? [],
    checks: entry.checks ?? externalDef.checks ?? [],
    skill: entry.skill ?? (externalDef as any).skill ?? (externalDef as any).skills,
    vars: entry.vars ?? externalDef.vars,
    tags: entry.tags ?? externalDef.tags,
    agent: entry.agent,
    dependencies: entry.depends_on ?? [],
    blocking: true,
  };

  // Duplicate ID detection
  const resolved = resolve(path);
  if (idToPath.has(entry.id)) {
    const existing = idToPath.get(entry.id)!;
    if (existing !== resolved) {
      errors.push({ type: "duplicate_id", message: `Duplicate task id "${entry.id}" at "${existing}" and "${resolved}"` });
    }
  } else {
    idToPath.set(entry.id, resolved);
  }

  return { taskDef, path: resolved };
}

/** Load fields from an external TASK.md file. */
function loadTaskFile(absPath: string): Partial<TaskDefinition> {
  if (!existsSync(absPath)) return {};
  try {
    const raw = readFileSync(absPath, "utf-8");
    const parsed = parseTaskMdString(raw);
    return {
      title: parsed.title,
      description: parsed.description,
      // prompt comes from both the body (markdown content) and vars.prompt
      prompt: parsed.body || (parsed.vars as any)?.prompt || parsed.prompt,
      inputs: parsed.inputs,
      outputs: parsed.outputs,
      checks: parsed.checks as Check[] | undefined,
      skill: (parsed as any).skills || (parsed as any).skill,
      vars: parsed.vars,
      tags: parsed.tags,
    };
  } catch {
    return {};
  }
}

/** Find a TASK.md by id using multiple conventions. No folder scanning — just path checks. */
function findTaskPath(playbookDir: string, id: string): string | null {
  // Direct: <playbookDir>/<id>/TASK.md
  const direct = join(playbookDir, id, "TASK.md");
  if (existsSync(direct)) return direct;

  // tasks/ prefix: <playbookDir>/tasks/<id>/TASK.md
  const inTasks = join(playbookDir, "tasks", id, "TASK.md");
  if (existsSync(inTasks)) return inTasks;

  return null;
}

function hasInlineFields(entry: TaskEntry): boolean {
  return !!(entry.prompt || entry.title || entry.description ||
    (entry.inputs && entry.inputs.length > 0) ||
    (entry.outputs && entry.outputs.length > 0) ||
    (entry.checks && entry.checks.length > 0) ||
    entry.skill || entry.agent ||
    (entry.vars && Object.keys(entry.vars).length > 0) ||
    (entry.tags && entry.tags.length > 0));
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
