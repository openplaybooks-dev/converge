/**
 * Static Children Discovery
 *
 * Scans each DAG node's directory for child TASK.md files in
 * subdirectories matching \d{2,3}-. Establishes parent-child
 * relationships automatically — no frontmatter declarations needed.
 *
 * Children automatically depend on their parent (no manual
 * depends_on in TASK.md).
 */

import { readdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseTaskMdString } from "../../config/task-md-definition.js";
import type { TaskDag } from "../../dag/task-dag.js";
import type { DagNode } from "../../dag/dag-node.js";
import type { TaskDefinition, Check } from "../../config/task-definition.js";

/**
 * Recursively scan a directory for child TASK.md files.
 *
 * Two discovery modes:
 * 1. Direct children: directory names matching `\d{2,3}-` with TASK.md inside
 * 2. `tasks/` wrapper: any subdirectory with TASK.md inside (allows kebab-case IDs)
 *
 * Bare directories without TASK.md are recursed into one level looking for
 * nested numeric-prefixed children. The `tasks/` wrapper is always recursed
 * into regardless of its children's naming, since it's an explicit container.
 */
function scanDir(dir: string): string[] {
  const children: string[] = [];
  if (!existsSync(dir)) return [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    // Never scan seed infrastructure directories — they contain seed scripts
    // and templates that should only be materialised at runtime.
    if (entry.name === "seeds" || entry.name === "templates" || entry.name.startsWith("_")) continue;

    const taskMd = join(dir, entry.name, "TASK.md");
    const hasTaskMd = existsSync(taskMd);

    if (/^\d{2,3}-/.test(entry.name) && hasTaskMd) {
      children.push(entry.name);
    } else if (entry.name === "tasks" && !hasTaskMd) {
      // `tasks/` is a first-class child container — discover ALL subdirectories
      // with TASK.md regardless of naming (allows kebab-case IDs like work-showcase).
      children.push(...scanTasksDir(join(dir, entry.name)));
    } else if (!hasTaskMd) {
      // Recurse only into bare directories looking for numeric-prefixed children
      // one level deeper.
      const nested = scanDir(join(dir, entry.name));
      children.push(...nested.filter((n) => /^\d{2,3}-/.test(n)));
    }
    // Otherwise: directory has a TASK.md but its name doesn't match \d{2,3}-
    // and is not inside a `tasks/` wrapper — ignored. Direct kebab-case
    // children are not auto-discovered (intentional: they must be in `tasks/`).
  }

  children.sort();
  return children;
}

/**
 * Scan a `tasks/` directory and return all subdirectories that contain TASK.md.
 * Unlike scanDir, this accepts any naming convention (kebab-case allowed).
 * Used only for `tasks/` wrappers which are explicit child containers.
 */
function scanTasksDir(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const childPath = dir + "/" + entry.name + "/TASK.md";
    if (existsSync(childPath)) out.push(entry.name);
  }
  out.sort();
  return out;
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
 * Build a sibling-order map: for each childId, return the childId that
 * precedes it alphabetically (the first child gets null).
 */
function buildSiblingOrder(sortedIds: string[]): Map<string, string | null> {
  const order = new Map<string, string | null>();
  for (let i = 0; i < sortedIds.length; i++) {
    order.set(sortedIds[i], i === 0 ? null : sortedIds[i - 1]);
  }
  return order;
}

/**
 * Scan each DAG node's directory recursively for TASK.md files in
 * subdirectories named \d{2,3}- — those are its children. Recursive:
 * newly added children are themselves scanned for grandchildren. The
 * loop continues until no new nodes are found.
 *
 * Each child automatically depends on its parent. Siblings at the same
 * level are auto-chained alphabetically (RFC 0034).
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

      const taskPath = resolve(node.path);
      const nodeDir = taskPath.replace(/[\/\\]TASK\.md$/, "");
      if (taskPath !== join(nodeDir, "TASK.md")) continue;

      const childIds = scanDir(nodeDir);
      const siblingOrder = buildSiblingOrder(childIds);

      for (const childId of childIds) {
        if (dag.nodes.has(childId)) continue;

        const childTaskMd = findTaskMd(nodeDir, childId);
        if (!childTaskMd) continue;

        const def = loadTaskFile(childTaskMd);
        const prevSibling = siblingOrder.get(childId)!;

        // RFC 0034: deps = parent + previous sibling in alphabetical order
        const mergedDeps: string[] = [nodeId];
        if (prevSibling) mergedDeps.push(prevSibling);

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
          type: "normal",
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
        (node as any)._hasStaticSubtasks = true;
      }
    }
  }
}
