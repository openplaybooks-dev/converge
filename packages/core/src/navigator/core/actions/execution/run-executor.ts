/**
 * Run Executor Action
 * 
 * Inject the right dispatch node for this unit.
 */

import type { ActionHandler } from "../../types.ts";

/**
 * Inspects the unit and adds the appropriate execution node to the graph
 * as a buffered node. Each node is individually resumable.
 *
 * Dispatch priority (first match wins):
 *   executorFn → add 'run-executor-fn'
 *   loopFn     → add 'run-loop-fn'
 *   seedFn      → done (resolve-seed already handled it)
 *   children   → add 'run-children'  (discovers + delegates)
 *   skill      → add 'run-skill'
 *   leaf       → no-op (repair-loop handles gaps)
 */
export const runExecutor: ActionHandler = async (snap, graph) => {
  const unit = snap.unit;
  const suffix = snap.iteration > 1 ? `#${snap.iteration}` : "";

  if (unit.executorFn) {
    graph.addNode({
      id: `run-executor-fn${suffix}`,
      handler: "run-executor-fn",
      status: "buffered",
      origin: "reactive",
      data: { priority: 64 },
    });
    return { action: "continue" };
  }
  if (unit.loopFn) {
    graph.addNode({
      id: `run-loop-fn${suffix}`,
      handler: "run-loop-fn",
      status: "buffered",
      origin: "reactive",
      data: { priority: 64 },
    });
    return { action: "continue" };
  }
  // Pre-seed tasks have already been seeded — nothing more to execute.
  // After-seed tasks must still execute their body/skill before the seed runs.
  if (unit.seedFn && !unit.seedAfter) {
    return { action: "done", success: true, reason: "Seed already seeded" };
  }

  // Discover children lazily
  if (!unit.children) {
    // children now discovered via declarative children: declarations in TASK.md
    const discoverChildren = async (u: any, visited: string[]) => { return []; };
    unit.children = await discoverChildren(unit, []);
  }
  if (unit.children.length > 0) {
    graph.addNode({
      id: `run-children${suffix}`,
      handler: "run-children",
      status: "buffered",
      origin: "reactive",
      data: { priority: 64 },
    });
    return { action: "continue" };
  }

  const { resolveSkill } = await import("../../../../task/unit/resolve.ts");
  if (resolveSkill(unit)) {
    graph.addNode({
      id: `run-skill${suffix}`,
      handler: "run-skill",
      status: "buffered",
      origin: "reactive",
      data: { priority: 64 },
    });
    return { action: "continue" };
  }

  // Leaf without skill — repair-loop handles gap fixing
  return { action: "continue" };
};
