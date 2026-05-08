/**
 * Build a TaskDag from a compiled manifest.
 *
 * The manifest is the single source of truth for the DAG structure.
 * No filesystem scanning — all nodes and edges come from the manifest.
 */

import { TaskDag } from "../dag/task-dag.js";
import type { DagNode } from "../dag/dag-node.js";
import type { TaskDefinition } from "../config/task-definition.js";

export interface LoaderError {
  type: string;
  message: string;
}

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
