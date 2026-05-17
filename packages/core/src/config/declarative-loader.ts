/**
 * Declarative Playbook Loader — builds a TaskDag from playbook.yml + filesystem.
 *
 * playbook.yml declares top-level tasks. Children are discovered automatically
 * by scanning `tasks/` subdirectories of each parent — no explicit subtask
 * declarations needed.
 *
 * Spawned children (from seeds) are discovered under `spawned/` directories.
 *
 * The DAG is built from `depends_on` edges. Topological sort determines
 * execution order.
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

interface TaskEntry {
  path: string;
  title?: string;
  description?: string;
  prompt?: string;
  depends_on?: string[];
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

  const playbookName = playbookDir.split("/").pop() ?? "";
  dag.playbookName = playbookName;

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
  // Accept any of `path`, `id`, or `name` as the task identifier — `name`
  // is a legacy alias from earlier framework versions.
  let entries: TaskEntry[] = (pb.tasks || []).map((t: any) => ({
    path: t.path ?? t.id ?? t.name,
    title: t.title,
    description: t.description,
    prompt: t.prompt,
    depends_on: t.depends_on,
    inputs: t.inputs,
    outputs: t.outputs,
    skill: t.skill,
    agent: t.agent,
    ai: t.ai,
    checks: t.checks,
    vars: t.vars,
    tags: t.tags,
    file: t.file,
  }));

  // ── Auto-discover top-level tasks when `tasks:` is empty ─────
  // When playbook.yml omits the `tasks:` block (a "generic playbook"
  // pattern where the DAG is determined entirely by TASK.md depends_on
  // frontmatter and runtime spawns), scan `<playbookDir>/tasks/*/TASK.md`
  // and synthesize entries from the directory names. Children of these
  // top-level tasks are still picked up by `discoverStaticChildren` in
  // a later pass — this only adds the roots.
  if (entries.length === 0) {
    const tasksDir = join(playbookDir, "tasks");
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
        // Discovery failures fall through to the empty-DAG branch
        // below — the run will still start with just root- nodes,
        // matching today's behavior when both tasks: and tasks/ are absent.
      }
    }
  }

  for (const entry of entries) {
    if (!entry.path) {
      errors.push({ type: "missing_path", message: "Task entry missing `path` field" });
      continue;
    }

    // Derive task id from the last segment of the path
    const taskId = entry.path.includes("/") ? entry.path.split("/").pop()! : entry.path;

    // Resolve task definition: inline fields, file reference, or TASK.md at path
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

function resolveTaskDef(
  entry: TaskEntry,
  playbookDir: string,
  errors: LoaderError[],
  idToPath: Map<string, string>,
): { taskDef: TaskDefinition; path: string } {
  const taskId = entry.path.includes("/") ? entry.path.split("/").pop()! : entry.path;
  let path = resolveTaskPath(playbookDir, entry.path);
  let externalDef: Partial<TaskDefinition> = {};

  // Load external file if specified
  if (entry.file) {
    path = resolve(playbookDir, entry.file);
    externalDef = loadTaskFile(path);
  } else {
    // Always try to load TASK.md when it exists — it may carry fields
    // (ai:, checks:, vars:) not present in the playbook.yml inline entry.
    if (existsSync(path)) {
      externalDef = loadTaskFile(path);
    } else {
      // Fall back to flat lookup in tasks/ directory
      const found = findTaskPath(playbookDir, taskId);
      if (found) {
        path = found;
        externalDef = loadTaskFile(path);
      }
    }
  }

  // Build final definition — inline fields override external
  const taskDef: TaskDefinition = {
    id: taskId,
    title: entry.title ?? externalDef.title ?? taskId,
    description: entry.description ?? externalDef.description,
    prompt: entry.prompt ?? externalDef.prompt ?? "",
    inputs: entry.inputs ?? externalDef.inputs ?? [],
    outputs: entry.outputs ?? externalDef.outputs ?? [],
    checks: entry.checks ?? externalDef.checks ?? [],
    skill: entry.skill ?? (externalDef as any).skill ?? (externalDef as any).skills,
    vars: entry.vars ?? externalDef.vars,
    tags: entry.tags ?? externalDef.tags,
    agent: entry.agent ?? (externalDef as any).agent,
    ai: (entry as any).ai ?? (externalDef as any).ai,
    depends_on: entry.depends_on ?? externalDef.depends_on ?? [],
    seedFn: externalDef.seedFn,
    materialization: externalDef.materialization,
    onFail: externalDef.onFail,
    seed: (externalDef as any).seed,
    blocking: true,
  };

  // Duplicate ID detection
  const resolved = resolve(path);
  if (idToPath.has(taskId)) {
    const existing = idToPath.get(taskId)!;
    if (existing !== resolved) {
      errors.push({ type: "duplicate_id", message: `Duplicate task id "${taskId}" at "${existing}" and "${resolved}"` });
    }
  } else {
    idToPath.set(taskId, resolved);
  }

  return { taskDef, path: resolved };
}

/** Resolve a playbook path like "01-analyze/01a-extract" to "tasks/01-analyze/tasks/01a-extract/TASK.md" */
function resolveTaskPath(playbookDir: string, taskPath: string): string {
  const segments = taskPath.split("/");
  return join(playbookDir, "tasks", segments.join("/tasks/"), "TASK.md");
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
