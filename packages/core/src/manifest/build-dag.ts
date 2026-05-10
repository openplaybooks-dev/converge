/**
 * Build a TaskDag from either a compiled manifest or an in-memory playbook.
 *
 * The manifest is the single source of truth for the DAG structure.
 * No filesystem scanning — all nodes and edges come from the manifest.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadTaskFile } from "../config/declarative-loader.js";
import { TaskDag } from "../dag/task-dag.js";
import type { DagNode } from "../dag/dag-node.js";
import type { TaskDefinition } from "../config/task-definition.js";
import type { Playbook } from "../playbook.js";

export interface LoaderError {
  type: string;
  message: string;
}

/* ------------------------------------------------------------------ */
/*  buildDagFromManifest                                               */
/* ------------------------------------------------------------------ */

export function buildDagFromManifest(manifest: Record<string, unknown>): {
  dag: TaskDag;
  errors: LoaderError[];
} {
  const dag = new TaskDag();
  const errors: LoaderError[] = [];

  const nodes = (manifest.nodes ?? {}) as Record<string, Record<string, unknown>>;
  const parentMap = (manifest.parent_map ?? {}) as Record<string, string[]>;
  const childMap = (manifest.child_map ?? {}) as Record<string, string[]>;

  for (const [id, raw] of Object.entries(nodes)) {
    if (dag.nodes.has(id)) continue;

    const deps = (parentMap[id] ?? []).slice();
    const dependedOnBy = (childMap[id] ?? []).slice();
    const state = String(raw.state ?? "concrete");

    const taskDef: TaskDefinition = {
      id,
      title: (raw.title as string) ?? id,
      description: (raw.description as string) ?? "",
      inputs: Array.isArray(raw.inputs) ? (raw.inputs as string[]) : [],
      outputs: Array.isArray(raw.outputs) ? (raw.outputs as string[]) : [],
      checks: Array.isArray(raw.checks)
        ? (raw.checks as Array<{ id: string; cmd?: string }>).map((c: any) => ({
            id: c.id ?? "",
            description: c.description ?? "",
            cmd: c.cmd ?? "",
          }))
        : [],
      tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
      depends_on: deps,
      blocking: true,
      seed: (raw.seed as string) ?? undefined,
    };

    const node: DagNode = {
      id,
      type: (raw.dag_type as DagNode["type"]) ?? "normal",
      convergePassthrough: (raw.converge_passthrough as boolean) ?? undefined,
      parents: [],
      children: [],
      depends_on: deps,
      depended_on_by: dependedOnBy,
      taskDef,
      path: (raw.path as string) ?? "",
      status: state === "frontier" ? "pending" : "pending",
      virtual: state === "frontier",
    };

    dag.addNode(node);
  }

  return { dag, errors };
}

/* ------------------------------------------------------------------ */
/*  buildDagFromPlaybookObject                                         */
/* ------------------------------------------------------------------ */

/**
 * Build a `TaskDag` from an in-memory `Playbook` (no filesystem scan).
 *
 * Mirrors what `buildDagFromPlaybook` does for folder-based playbooks:
 * one `DagNode` per declared task, edges from `depends_on`, then
 * `dag.computeDepended()` populates the reverse edges.
 */
export function buildDagFromPlaybookObject(playbook: Playbook): {
  dag: TaskDag;
  errors: { type: string; message: string }[];
} {
  const dag = new TaskDag();
  dag.playbookName = playbook.def.name;
  const errors: { type: string; message: string }[] = [];

  for (const entry of playbook.def.tasks) {
    if (!entry.path) continue;
    const taskId = entry.path.includes("/") ? entry.path.split("/").pop()! : entry.path;
    const taskDef = playbook.tasks.get(taskId);
    if (!taskDef) {
      errors.push({
        type: "missing-task",
        message: `Task entry "${entry.path}" has no in-memory TaskDefinition.`,
      });
      continue;
    }
    const node: DagNode = {
      id: taskId,
      type: "normal",
      parents: [],
      children: [],
      depends_on: taskDef.depends_on ?? [],
      depended_on_by: [],
      taskDef: taskDef as TaskDefinition,
      path: `<virtual:${playbook.def.name}/${entry.path}>`,
      status: "pending",
      virtual: false,
    };
    dag.addNode(node);
  }

  splitContainerNodes(dag);
  injectRootNodes(dag, playbook.def.name);

  // Populate `depended_on_by` from `depends_on` so layer ordering works.
  for (const node of dag.nodes.values()) {
    for (const dep of node.depends_on) {
      const upstream = dag.nodes.get(dep);
      if (!upstream) {
        errors.push({
          type: "missing-dep",
          message: `Task "${node.id}" depends on unknown task "${dep}".`,
        });
        continue;
      }
      if (!upstream.depended_on_by.includes(node.id)) {
        upstream.depended_on_by.push(node.id);
      }
    }
  }

  return { dag, errors };
}

/* ------------------------------------------------------------------ */
/*  splitContainerNodes                                                */
/* ------------------------------------------------------------------ */

/**
 * Split container tasks into diverge + converge nodes.
 *
 * A container is any task that has `from_seed`, `seedFn`, or non-empty
 * `children`. Each container produces:
 * - `{id}-diverge` (type:"diverge") — runs the seed, spawns children
 * - `{id}-converge` (type:"converge") — waits for children, runs body
 *
 * Downstream nodes that depended on `{id}` are rewritten to depend on
 * `{id}-converge` so they wait for both the seed and all children.
 */
export function splitContainerNodes(dag: TaskDag): void {
  const containers: { id: string; node: DagNode; hasBody: boolean }[] = [];
  for (const [id, node] of dag.nodes) {
    const td = node.taskDef as any;
    const hasBody = !!(td?.body || td?.prompt);
    // Never re-split already-split nodes
    if (node.type === "diverge" || node.type === "converge") continue;
    // Do not split dynamic seedFn source nodes: the runtime executes their
    // Seed directly and registers spawned children into the live DAG. Splitting
    // them here creates a stale converge node that cannot know future children.
    const hasSeed = !!td?.from_seed;
    // NOTE: node.children tracks both DAG reverse-edges (downstream
    // dependents) AND filesystem subtask children (populated by
    // discoverStaticChildren). Splitting a container with downstream
    // dependents that are NOT its subtask children would create cycles,
    // so only split when the children are actual subtasks.
    //
    // Split containers that have seeds (need a diverge to run the seed
    // and a converge to wait for spawned children) AND containers with
    // static children discovered by discoverStaticChildren (need a
    // converge node that waits for children before running the body).
    const hasStaticSubtasks = !!(node as any)._hasStaticSubtasks;
    if (hasSeed || hasStaticSubtasks) {
      containers.push({ id, node, hasBody });
    }
  }

  for (const { id, node, hasBody } of containers) {
    const divergeId = `${id}-diverge`;
    const convergeId = `${id}-converge`;

    // Rename original node to diverge (it holds the seed)
    dag.nodes.delete(id);
    node.id = divergeId;
    node.type = "diverge";
    dag.nodes.set(divergeId, node);

    // Always create converge node. If the body is empty, it's a
    // passthrough — completes immediately when it becomes ready.
    const td = node.taskDef as any;
    const convergeNode: DagNode = {
      id: convergeId,
      type: "converge",
      convergePassthrough: !hasBody,
      parents: [],
      children: [],
      depends_on: [...node.children],
      depended_on_by: [],
      taskDef: { ...td, from_seed: undefined, seedFn: undefined },
      path: node.path,
      status: "pending",
      virtual: node.virtual,
    };
    dag.addNode(convergeNode);

    // Rewrite downstream deps: children (static subtasks) depend on the
    // diverge (runs first, before children execute). Non-child dependents
    // (downstream tasks like 03-validate) depend on the converge (runs
    // after children, producing the converged output).
    for (const n of dag.nodes.values()) {
      if (n.id === divergeId || n.id === convergeId) continue;
      for (let i = 0; i < n.depends_on.length; i++) {
        if (n.depends_on[i] !== id) continue;
        const isChild = node.children.includes(n.id);
        n.depends_on[i] = isChild ? divergeId : convergeId;
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  injectRootNodes                                                    */
/* ------------------------------------------------------------------ */

/**
 * Add root-diverge and root-converge bookend nodes to the DAG.
 *
 * - `root-diverge` has no dependencies and runs first.
 * - `root-converge` depends on all terminal tasks (nothing downstream of them).
 *
 * Every playbook gets these two nodes. They ensure the DAG has a single
 * entry and exit point.
 */
export function injectRootNodes(dag: TaskDag, playbookName: string, playbookDir?: string): void {
  const rootDivergeId = "root-diverge";
  const rootConvergeId = "root-converge";

  // Check for root TASK.md at playbookDir/TASK.md
  let rootTaskDef: TaskDefinition | undefined;
  let rootPath: string | undefined;
  if (playbookDir) {
    const rootTaskMd = join(playbookDir, "TASK.md");
    if (existsSync(rootTaskMd)) {
      const def = loadTaskFile(rootTaskMd);
      rootTaskDef = {
        id: rootDivergeId,
        title: def.title ?? playbookName,
        description: def.description,
        // No prompt on diverge — the body runs in the converge phase.
        // Setting prompt here causes the diverge to skip seed execution.
        inputs: def.inputs ?? [],
        outputs: def.outputs ?? [],
        checks: def.checks as any[] ?? [],
        skill: (def as any).skill ?? (def as any).skills,
        vars: def.vars,
        tags: def.tags,
        agent: (def as any).agent,
        depends_on: def.depends_on ?? [],
        seed: (def as any).seed ?? (def as any).seeds,
        blocking: true,
      };
      rootPath = rootTaskMd;
    }
  }

  dag.addNode({
    id: rootDivergeId,
    type: "diverge",
    parents: [],
    children: [],
    depends_on: [],
    depended_on_by: [],
    taskDef: rootTaskDef ?? { id: rootDivergeId, title: "Root", description: "Playbook root diverge" } as TaskDefinition,
    path: rootPath ?? `<virtual:${playbookName}/root>`,
    status: "pending",
    virtual: false,
  });

  const consumedIds = new Set<string>();
  for (const node of dag.nodes.values()) {
    for (const dep of node.depends_on) consumedIds.add(dep);
  }
  const terminalIds: string[] = [];
  for (const id of dag.nodes.keys()) {
    if (id !== rootDivergeId && !consumedIds.has(id)) {
      terminalIds.push(id);
    }
  }

  dag.addNode({
    id: rootConvergeId,
    type: "converge",
    convergePassthrough: true,
    parents: [],
    children: [],
    depends_on: terminalIds,
    depended_on_by: [],
    taskDef: { id: rootConvergeId, title: "Root Converge", description: "Playbook convergence" } as TaskDefinition,
    path: `<virtual:${playbookName}/root>`,
    status: "pending",
    virtual: false,
  });
}

/* ------------------------------------------------------------------ */
/*  hashPlaybook                                                       */
/* ------------------------------------------------------------------ */

export function hashPlaybook(playbookDir: string): string {
  const hash = createHash("sha256");
  const ymlPath = join(playbookDir, "playbook.yml");
  if (existsSync(ymlPath)) {
    hash.update(readFileSync(ymlPath, "utf-8"));
  }
  return `sha256:${hash.digest("hex")}`;
}
