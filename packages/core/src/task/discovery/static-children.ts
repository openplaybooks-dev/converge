/**
 * Static Children Discovery
 *
 * Scans each DAG node's directory for child TASK.md files in
 * subdirectories matching \d{2,3}-. Establishes parent-child
 * relationships automatically — no frontmatter declarations needed.
 *
 * Children automatically depend on their parent (merged with any
 * deps the child's TASK.md already declares).
 */

import { readdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseTaskMdString } from "../../config/task-md-definition.js";
import type { TaskDag } from "../../dag/task-dag.js";
import type { DagNode } from "../../dag/dag-node.js";
import type { TaskDefinition, Check } from "../../config/task-definition.js";

/**
 * Recursively scan a directory for immediate \d{2,3}- children with TASK.md.
 * Non-matching directories (e.g. "tasks/") are recursed into to find
 * TASK.md files nested deeper.
 */
function scanDir(dir: string): string[] {
  const found: string[] = [];
  if (!existsSync(dir)) return found;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!/^\d{2,3}-/.test(entry.name)) {
      found.push(...scanDir(join(dir, entry.name)));
      continue;
    }
    const taskMd = join(dir, entry.name, "TASK.md");
    if (existsSync(taskMd)) found.push(entry.name);
  }
  return found;
}

/** Load fields from a TASK.md file. */
function loadTaskFile(absPath: string): Partial<TaskDefinition> {
  if (!existsSync(absPath)) return {};
  try {
    const raw = readFileSync(absPath, "utf-8");
    const parsed = parseTaskMdString(raw);
    return {
      title: parsed.title,
      description: parsed.description,
      prompt: parsed.body || (parsed.vars as any)?.prompt || parsed.prompt,
      depends_on: parsed.depends_on,
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

/** Find a TASK.md file for a child ID anywhere under a directory. */
function findTaskMd(parentDir: string, childId: string): string | null {
  function walk(dir: string): string | null {
    if (!existsSync(dir)) return null;
    const direct = join(dir, childId, "TASK.md");
    if (existsSync(direct)) return direct;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === childId) {
        const taskMd = join(dir, entry.name, "TASK.md");
        if (existsSync(taskMd)) return taskMd;
      }
      const found = walk(join(dir, entry.name));
      if (found) return found;
    }
    return null;
  }
  return walk(parentDir);
}

/**
 * Scan each DAG node's directory recursively for TASK.md files in
 * subdirectories named \d{2,3}- — those are its children. Recursive:
 * newly added children are themselves scanned for grandchildren. The
 * loop continues until no new nodes are found.
 *
 * Each child automatically depends on its parent (merged with any
 * deps the child's TASK.md already declares).
 */
export function discoverStaticChildren(
  dag: TaskDag,
  idToPath: Map<string, string>,
): void {
  let prevCount = 0;
  while (dag.nodes.size > prevCount) {
    prevCount = dag.nodes.size;
    const nodeIds = [...dag.nodes.keys()];
    for (const nodeId of nodeIds) {
      const node = dag.nodes.get(nodeId)!;
      if (!node.path) continue;

      const nodeDir = node.path.replace(/\/TASK\.md$/, "");

      for (const childId of scanDir(nodeDir)) {
        if (dag.nodes.has(childId)) continue;

        const childTaskMd = findTaskMd(nodeDir, childId);
        if (!childTaskMd) continue;

        const def = loadTaskFile(childTaskMd);
        const childDeps = def.depends_on ?? [];
        const mergedDeps = [...new Set([nodeId, ...childDeps])];

        const taskDef: TaskDefinition = {
          id: childId,
          title: def.title ?? childId,
          description: def.description,
          prompt: def.prompt ?? "",
          inputs: def.inputs ?? [],
          outputs: def.outputs ?? [],
          checks: def.checks as Check[] ?? [],
          skill: (def as any).skill ?? (def as any).skills,
          vars: def.vars,
          tags: def.tags,
          agent: (def as any).agent,
          depends_on: mergedDeps,
          blocking: true,
        };

        const childNode: DagNode = {
          id: childId,
          parents: [nodeId],
          children: [],
          depends_on: mergedDeps,
          depended_on_by: [],
          taskDef,
          path: resolve(childTaskMd),
          status: "pending",
          virtual: false,
        };

        dag.addNode(childNode);
        idToPath.set(childId, resolve(childTaskMd));
        node.children.push(childId);
      }
    }
  }
}
