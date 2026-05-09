/**
 * Lightweight utilities for building manifests from task trees.
 */

import type { TaskNode } from "./next-task.js";
import type { Manifest } from "@converge/core/manifest/types.js";

export function buildManifestFromTree(tree: TaskNode[], playbookName: string): Manifest {
  const nodes: Record<string, any> = {};
  for (const node of tree) {
    nodes[node.journalTaskId] = {
      id: node.journalTaskId,
      depends_on: [],
      depended_on_by: [],
      tags: [],
      checks: [],
      inputs: [],
      outputs: [],
      frontmatter_hash: "",
      body_hash: "",
      checks_hash: "",
      inputs_hash: "",
      upstream_hash: "",
      state: "concrete",
      path: node.filePath,
      seed: null,
    };
  }
  return {
    metadata: {
      playbook: playbookName,
      generated_at: new Date().toISOString(),
      converge_version: "0.1.0",
      frontier_count: 0,
    },
    nodes,
    child_map: {},
    parent_map: {},
  } as Manifest;
}
