/**
 * Declarative Playbook Loader - builds a TaskDag from filesystem TASK.md files.
 *
 * RFC 0032 (clean break): the tasks key in playbook.yml is banned entirely.
 * All task content and graph structure come from tasks/TASK.md files.
 * The loader auto-discovers tasks by scanning the tasks/ directory.
 *
 * Spawned children (from seeds) are discovered under spawned/ directories.
 *
 * RFC 0034: depends_on is removed from public API. Tasks at the same
 * directory level are auto-chained alphabetically; children depend on
 * their parent. Topological sort determines execution order.
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
/*  Auto-chaining helper                                               */
/* ------------------------------------------------------------------ */

/**
 * Build a sibling-order map: for each taskId, return the taskId that
 * precedes it alphabetically (the first task gets an empty string).
 * The caller uses this to wire depends_on chains within a level.
 */
function buildSiblingOrder(sortedIds: string[]): Map<string, string> {
  const order = new Map<string, string>();
  for (let i = 0; i < sortedIds.length; i++) {
    order.set(sortedIds[i], i === 0 ? "" : sortedIds[i - 1]);
  }
  return order;
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
  const entryPaths: string[] = [];
  if (existsSync(tasksDir)) {
    try {
      const subdirs = readdirSync(tasksDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      for (const sub of subdirs) {
        if (existsSync(join(tasksDir, sub, "TASK.md"))) {
          entryPaths.push(sub);
        }
      }
    } catch {
      // Discovery failures fall through — the run will start with
      // an empty DAG, matching behavior when tasks/ is absent.
    }
  }

  // Auto-chain top-level tasks alphabetically (RFC 0034)
  const sortedIds = [...entryPaths].sort((a, b) => a.localeCompare(b));
  const siblingOrder = buildSiblingOrder(sortedIds);

  for (const entryPath of entryPaths) {
    const taskId = entryPath.includes("/") ? entryPath.split("/").pop()! : entryPath;

    // Resolve task definition from tasks/<id>/TASK.md (throws if missing)
    const { taskDef, path } = resolveTaskDef(entryPath, playbookDir, errors, idToPath);

    // RFC 0034: depends_on is auto-wired from sibling order, not read from TASK.md
    const prevSibling = siblingOrder.get(taskId) ?? "";
    const deps = prevSibling ? [prevSibling] : [];

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
  discoverSpawnedChildren(dag, playbookDir, errors, idToPath);

  return { dag, errors, globalChecks };
}

/**
 * Walk the tasks directory recursively, discovering nested tasks/
 * subdirectories and spawned/ directories. Adds TASK.md files as DAG nodes.
 *
 * RFC 0034: siblings within each tasks/ directory are auto-chained
 * alphabetically; children also depend on their parent.
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

  /**
   * Walk a directory looking for:
   * - `spawned/` subdirectories: each sub-dir with TASK.md is a child
   * - `tasks/` subdirectories: each sub-dir with TASK.md is a child task
   * - Other subdirectories: recurse to find deeper nesting
   */
  const walk = (dir: string, parentId: string | null): void => {
    if (!existsSync(dir)) return;

    // Collect child dirs at this level (from spawned/ or tasks/ subdirectories)
    const childDirs: string[] = [];
    const childSources: Array<{ dir: string; name: string; type: "spawned" | "tasks" }> = [];

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "seeds" || entry.name === "templates" || entry.name.startsWith("_")) continue;

      const full = join(dir, entry.name);

      if (entry.name === "spawned" || entry.name === "tasks") {
        const sourceType = entry.name === "spawned" ? "spawned" : "tasks";
        for (const child of readdirSync(full, { withFileTypes: true })) {
          if (!child.isDirectory()) continue;
          const taskMdPath = join(full, child.name, "TASK.md");
          if (!existsSync(taskMdPath)) continue;
          if (dag.nodes.has(child.name)) continue;
          childDirs.push(child.name);
          childSources.push({ dir: full, name: child.name, type: sourceType });
        }
      } else {
        // Recurse into non-container directories
        walk(full, entry.name);
      }
    }

    // Auto-chain discovered children alphabetically + parent dep
    const sorted = [...childDirs].sort((a, b) => a.localeCompare(b));
    const siblingOrder = buildSiblingOrder(sorted);

    for (const src of childSources) {
      const taskMdPath = join(src.dir, src.name, "TASK.md");
      const def = loadTaskFile(taskMdPath);
      const prevSibling = siblingOrder.get(src.name) ?? "";

      // RFC 0034: deps = parent + previous sibling in alphabetical order
      const deps: string[] = [];
      if (parentId) deps.push(parentId);
      if (prevSibling) deps.push(prevSibling);

      const taskDef: TaskDefinition = {
        id: src.name,
        title: def.title ?? src.name,
        description: def.description,
        prompt: def.prompt ?? "",
        inputs: def.inputs ?? [],
        outputs: def.outputs ?? [],
        checks: def.checks as Check[] ?? [],
        skill: (def as any).skill ?? (def as any).skills,
        vars: def.vars,
        tags: def.tags,
        agent: (def as any).agent,
        depends_on: deps,
        blocking: true,
      };

      const node: DagNode = {
        id: src.name,
        type: "normal",
        parents: parentId ? [parentId] : [],
        children: [],
        depends_on: deps,
        depended_on_by: [],
        taskDef,
        path: resolve(taskMdPath),
        status: "pending",
        virtual: false,
      };

      dag.addNode(node);
      idToPath.set(src.name, resolve(taskMdPath));

      // Recurse into this child's own tasks/ subdirectory
      const childTaskDir = join(src.dir, src.name, "tasks");
      const childSpawnedDir = join(src.dir, src.name, "spawned");
      if (existsSync(childTaskDir)) walk(childTaskDir, src.name);
      if (existsSync(childSpawnedDir)) scanSpawnedDir(childSpawnedDir, src.name);
    }
  };

  const scanSpawnedDir = (spawnedDir: string, parentId: string | null): void => {
    if (!existsSync(spawnedDir)) return;
    const childDirs: string[] = [];
    for (const child of readdirSync(spawnedDir, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      const taskMdPath = join(spawnedDir, child.name, "TASK.md");
      if (!existsSync(taskMdPath)) continue;
      if (dag.nodes.has(child.name)) continue;
      childDirs.push(child.name);
    }

    const sorted = [...childDirs].sort((a, b) => a.localeCompare(b));
    const siblingOrder = buildSiblingOrder(sorted);

    for (const childName of sorted) {
      const taskMdPath = join(spawnedDir, childName, "TASK.md");
      const def = loadTaskFile(taskMdPath);
      const prevSibling = siblingOrder.get(childName) ?? "";

      const deps: string[] = [];
      if (parentId) deps.push(parentId);
      if (prevSibling) deps.push(prevSibling);

      const taskDef: TaskDefinition = {
        id: childName,
        title: def.title ?? childName,
        description: def.description,
        prompt: def.prompt ?? "",
        inputs: def.inputs ?? [],
        outputs: def.outputs ?? [],
        checks: def.checks as Check[] ?? [],
        skill: (def as any).skill ?? (def as any).skills,
        vars: def.vars,
        tags: def.tags,
        agent: (def as any).agent,
        depends_on: deps,
        blocking: true,
      };

      const node: DagNode = {
        id: childName,
        type: "normal",
        parents: parentId ? [parentId] : [],
        children: [],
        depends_on: deps,
        depended_on_by: [],
        taskDef,
        path: resolve(taskMdPath),
        status: "pending",
        virtual: false,
      };

      dag.addNode(node);
      idToPath.set(childName, resolve(taskMdPath));

      // Recurse into child's own tasks/spawned
      const childTaskDir = join(spawnedDir, childName, "tasks");
      const childSpawnedDir = join(spawnedDir, childName, "spawned");
      if (existsSync(childTaskDir)) walk(childTaskDir, childName);
      if (existsSync(childSpawnedDir)) scanSpawnedDir(childSpawnedDir, childName);
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
 *
 * RFC 0034: depends_on is NOT read from TASK.md frontmatter. The caller
 * wires dependencies via sibling auto-chaining.
 */
function resolveTaskDef(
  entryPath: string,
  playbookDir: string,
  errors: LoaderError[],
  idToPath: Map<string, string>,
): { taskDef: TaskDefinition; path: string } {
  const taskId = entryPath.includes("/") ? entryPath.split("/").pop()! : entryPath;
  const path = join(playbookDir, "tasks", taskId, "TASK.md");

  if (!existsSync(path)) {
    throw new Error(
      `Task "${taskId}" has no TASK.md file at ${path}. ` +
      `All tasks must have a TASK.md file in the tasks/ folder. ` +
      `Run \`converge migrate --rfc=0032\` to create missing TASK.md files.`,
    );
  }

  const externalDef = loadTaskFile(path);
  // RFC 0034: depends_on is wired by caller (auto-chaining), not from TASK.md
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
    depends_on: [], // wired by caller
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
