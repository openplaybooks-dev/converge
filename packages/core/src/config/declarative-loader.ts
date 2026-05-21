/**
 * Declarative Playbook Loader - builds a TaskDag from filesystem TASK.md files.
 *
 * RFC 0032 (clean break): the tasks key in playbook.yml is banned entirely.
 * All task content and graph structure come from tasks/TASK.md files.
 * The loader auto-discovers tasks by scanning the tasks/ directory.
 *
 * Spawned children (from seeds) are discovered under spawned/ directories.
 *
 * The DAG is built from depends_on edges in TASK.md frontmatter.
 * Topological sort determines execution order.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { TaskDag } from "../dag/task-dag.js";
import type { DagNode } from "../dag/dag-node.js";
import type { TaskDefinition } from "./task-definition.js";
import type { Check } from "./task-definition.js";
import { parseTaskMdString, mapTaskMdToTaskDefinition } from "./task-md-definition.js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LoaderError {
  type: string;
  message: string;
}

interface PlaybookYaml {
  name?: string;
  tasks?: unknown;
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

  const playbookName = playbookDir.split("/").pop() ?? "";
  dag.playbookName = playbookName;

  const playbookPath = join(playbookDir, "playbook.yml");
  if (!existsSync(playbookPath)) {
    // No playbook.yml — fall through to auto-discovery
  } else {
    const raw = readFileSync(playbookPath, "utf-8");
    const yaml = parseYaml(raw);

    if (!yaml || typeof yaml !== "object" || Array.isArray(yaml)) {
      errors.push({ type: "invalid_format", message: "playbook.yml must be a YAML mapping" });
      return { dag, errors, globalChecks };
    }

    const pb = yaml as PlaybookYaml;

    // ── RFC 0032: `tasks:` key is banned ──────────────────────
    if (pb.tasks !== undefined) {
      throw new Error(
        `playbook.yml contains a \`tasks:\` key. ` +
        `Inline task declarations are no longer supported (RFC 0032). ` +
        `Remove the \`tasks:\` block from playbook.yml — tasks are auto-discovered from the tasks/ folder.\n` +
        `Migration: run \`converge migrate --rfc=0032\``,
      );
    }

    // ── Global checks ─────────────────────────────────────────────
    if (pb.checks && Array.isArray(pb.checks)) {
      globalChecks.push(...(pb.checks as Check[]));
    }
  }

  // ── Auto-discover top-level tasks from tasks/ folder ─────
  const tasksDir = join(playbookDir, "tasks");
  const entries: { path: string; depends_on?: string[] }[] = [];
  if (existsSync(tasksDir)) {
    try {
      const subdirs = readdirSync(tasksDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      for (const sub of subdirs) {
        if (existsSync(join(tasksDir, sub, "TASK.md"))) {
          entries.push({ path: sub });
        }
      }
    } catch {
      // Discovery failures fall through — the run will start with
      // an empty DAG, matching behavior when tasks/ is absent.
    }
  }

  for (const entry of entries) {
    if (!entry.path) {
      throw new Error(
        "Task entry missing `path` field. " +
        "All tasks must have a TASK.md file in the tasks/ folder. " +
        "Run `converge migrate --rfc=0032` to migrate inline definitions.",
      );
    }

    // Derive task id from the last segment of the path
    const taskId = entry.path.includes("/") ? entry.path.split("/").pop()! : entry.path;

    // Resolve task definition from tasks/<id>/TASK.md (throws if missing)
    const { taskDef, path } = resolveTaskDef(entry, playbookDir, errors, idToPath);

    // The playbook entry declares graph edges; TASK.md carries task-local metadata.
    const deps = entry.depends_on ?? taskDef.depends_on ?? [];

    const node: DagNode = {
      id: taskId,
      type: "normal",
      parents: [],
      children: [],
      depends_on: deps,
      depended_on_by: [],
      taskDef: { ...taskDef, depends_on: deps },
      path,
      status: "pending",
      virtual: false,
    };

    dag.addNode(node);
  }

  // ── Spawned children discovery ───────────────────────────────
  // Walk tasks/ tree for spawned/ directories containing TASK.md
  // files. These are children materialized by seeds at runtime.
  // They become DAG nodes just like static tasks — no difference.
  discoverSpawnedChildren(dag, playbookDir, errors, idToPath);

  // ── Cycle detection ──────────────────────────────────────────
  const cycle = detectCycle(dag);
  if (cycle) {
    errors.push({ type: "cycle", message: `Cycle detected: ${cycle.join(" → ")}` });
  }

  return { dag, errors, globalChecks };
}

/**
 * Walk the tasks directory for spawned/ subdirectories and add
 * discovered TASK.md files as DAG nodes. Spawned children are
 * treated identically to static tasks — they have physical TASK.md
 * files, participate in --select, and respond to change detection.
 */
function discoverSpawnedChildren(
  dag: TaskDag,
  playbookDir: string,
  errors: LoaderError[],
  idToPath: Map<string, string>,
): void {
  const tasksDir = join(playbookDir, "tasks");

  // Also scan spawned/ at playbook root (seed-spawned children of root TASK.md)
  const rootSpawnedDir = join(playbookDir, "spawned");

  const walk = (dir: string, parentId: string | null): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = join(dir, entry.name);

      if (entry.name === "spawned") {
        // This is a spawned-children container — each subdirectory is a task
        for (const child of readdirSync(full, { withFileTypes: true })) {
          if (!child.isDirectory()) continue;
          const taskMdPath = join(full, child.name, "TASK.md");
          if (!existsSync(taskMdPath)) continue;

          const def = loadTaskFile(taskMdPath);
          const taskDef: TaskDefinition = {
            id: child.name,
            title: def.title ?? child.name,
            description: def.description,
            prompt: def.prompt ?? "",
            inputs: def.inputs ?? [],
            outputs: def.outputs ?? [],
            checks: def.checks as Check[] ?? [],
            skill: (def as any).skill ?? (def as any).skills,
            vars: def.vars,
            tags: def.tags,
            agent: (def as any).agent,
            depends_on: def.depends_on ?? [],
            blocking: true,
          };

          if (dag.nodes.has(child.name)) continue;

          const node: DagNode = {
            id: child.name,
            type: "normal",
            parents: parentId ? [parentId] : [],
            children: [],
            depends_on: taskDef.depends_on ?? [],
            depended_on_by: [],
            taskDef,
            path: resolve(taskMdPath),
            status: "pending",
            virtual: false,
          };

          dag.addNode(node);
        }
      } else {
        // Recurse into non-spawned directories
        walk(full, entry.name);
      }
    }
  };

  const scanSpawnedDir = (spawnedDir: string, parentId: string | null): void => {
    if (!existsSync(spawnedDir)) return;
    for (const child of readdirSync(spawnedDir, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      const taskMdPath = join(spawnedDir, child.name, "TASK.md");
      if (!existsSync(taskMdPath)) continue;

      const def = loadTaskFile(taskMdPath);
      const taskDef: TaskDefinition = {
        id: child.name,
        title: def.title ?? child.name,
        description: def.description,
        prompt: def.prompt ?? "",
        inputs: def.inputs ?? [],
        outputs: def.outputs ?? [],
        checks: def.checks as Check[] ?? [],
        skill: (def as any).skill ?? (def as any).skills,
        vars: def.vars,
        tags: def.tags,
        agent: (def as any).agent,
        depends_on: def.depends_on ?? [],
        blocking: true,
      };

      if (dag.nodes.has(child.name)) continue;

      const node: DagNode = {
        id: child.name,
        type: "normal",
        parents: parentId ? [parentId] : [],
        children: [],
        depends_on: taskDef.depends_on ?? [],
        depended_on_by: [],
        taskDef,
        path: resolve(taskMdPath),
        status: "pending",
        virtual: false,
      };

      dag.addNode(node);
      idToPath.set(child.name, resolve(taskMdPath));
    }
  };

  if (existsSync(tasksDir)) {
    walk(tasksDir, null);
  }

  // Scan root-level spawned/ directory (children of the playbook's root TASK.md)
  scanSpawnedDir(rootSpawnedDir, "root-diverge");
}

/* ------------------------------------------------------------------ */
/*  Task definition resolution                                          */
/* ------------------------------------------------------------------ */

/**
 * Resolve a task entry from playbook.yml to a TaskDefinition.
 *
 * RFC 0032: The playbook.yml entry is a graph reference only. The actual
 * task content lives in tasks/<id>/TASK.md. Throws if TASK.md is missing.
 */
function resolveTaskDef(
  entry: { path: string; depends_on?: string[] },
  playbookDir: string,
  errors: LoaderError[],
  idToPath: Map<string, string>,
): { taskDef: TaskDefinition; path: string } {
  const taskId = entry.path.includes("/") ? entry.path.split("/").pop()! : entry.path;
  const path = join(playbookDir, "tasks", taskId, "TASK.md");

  if (!existsSync(path)) {
    throw new Error(
      `Task "${taskId}" has no TASK.md file at ${path}. ` +
      `All tasks must have a TASK.md file in the tasks/ folder. ` +
      `Run \`converge migrate --rfc=0032\` to create missing TASK.md files.`,
    );
  }

  const externalDef = loadTaskFile(path);
  const taskDef: TaskDefinition = {
    id: taskId,
    title: externalDef.title ?? taskId,
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
    depends_on: entry.depends_on ?? externalDef.depends_on ?? [],
    materialization: externalDef.materialization,
    onFail: externalDef.onFail,
    blocking: true,
  };

  // Duplicate ID detection
  const resolved = resolve(path);
  if (idToPath.has(taskId)) {
    const existing = idToPath.get(taskId)!;
    if (existing !== resolved) {
      throw new Error(`Duplicate task id "${taskId}" at "${existing}" and "${resolved}"`);
    }
  } else {
    idToPath.set(taskId, resolved);
  }

  return { taskDef, path: resolved };
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
      // prompt comes from both the body (markdown content) and vars.prompt
      prompt: mapped.prompt || (parsed.vars as any)?.prompt || parsed.prompt,
    };
  } catch {
    return {};
  }
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
