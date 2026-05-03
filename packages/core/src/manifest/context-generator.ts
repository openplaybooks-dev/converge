import { atomicWriteFile } from "../checkpoint/atomic-write.js";
import { join } from "node:path";
import type { Manifest, ManifestNode } from "./types.js";

export interface TaskContext {
  id: string;
  parents: string[];
  children: string[];
  depends_on: string[];
  depended_on_by: string[];
  siblings: string[];
  path?: string;
}

function getNodePath(node: ManifestNode): string | undefined {
  if (node.state === "concrete") {
    return node.path;
  }
  return undefined;
}

function getSiblings(nodeId: string, manifest: Manifest): string[] {
  const parents = manifest.parent_map[nodeId] ?? [];
  if (parents.length === 0) return [];

  const parentId = parents[0];
  const children = manifest.child_map[parentId] ?? [];
  return children.filter((id) => id !== nodeId);
}

export function buildTaskContext(
  nodeId: string,
  manifest: Manifest,
): TaskContext | null {
  const node = manifest.nodes[nodeId];
  if (!node) return null;

  return {
    id: node.id,
    parents: manifest.parent_map[nodeId] ?? [],
    children: manifest.child_map[nodeId] ?? [],
    depends_on: node.depends_on,
    depended_on_by: node.depended_on_by,
    siblings: getSiblings(nodeId, manifest),
    path: getNodePath(node),
  };
}

export async function generateTaskContext(
  executionDir: string,
  executionId: string,
  taskId: string,
  manifest: Manifest,
): Promise<void> {
  const context = buildTaskContext(taskId, manifest);
  if (!context) {
    throw new Error(`Task not found in manifest: ${taskId}`);
  }

  const contextPath = join(
    executionDir,
    executionId,
    "tasks",
    taskId,
    "context.json",
  );
  await atomicWriteFile(contextPath, JSON.stringify(context, null, 2));
}

export async function generateAllTaskContexts(
  executionDir: string,
  executionId: string,
  manifest: Manifest,
): Promise<void> {
  await Promise.all(
    Object.keys(manifest.nodes).map((taskId) =>
      generateTaskContext(executionDir, executionId, taskId, manifest),
    ),
  );
}
