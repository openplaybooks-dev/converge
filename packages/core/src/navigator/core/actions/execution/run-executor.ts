/**
 * Run Executor Action
 *
 * Inject the right dispatch node for this unit.
 *
 * Dispatch priority (first match wins):
 *
 *   1. executorFn   → add 'run-executor-fn'                (in-process fn)
 *   2. loopFn       → add 'run-loop-fn'                    (in-process loop)
 *
 *   ── RFC 0022 typed modes ──
 *
 *   3. mode: spawner   → add 'run-spawner'    (body + auto-apply manifest)
 *   4. mode: converger → add 'run-converger'  (body + wave-loop halt check)
 *   5. mode: gateway   → add 'run-gateway'    (no body, sync point)
 *
 *   ── Standard fall-through paths ──
 *
 *   6. children    → add 'run-children'
 *   7. skill       → add 'run-skill'
 *   8. leaf        → no-op (repair-loop handles gaps)
 */

import type { ActionHandler } from "../../types.ts";

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

  // RFC 0022 — typed mode dispatch. Spawner/converger/gateway handlers
  // own the body+post-body lifecycle internally (they call run-skill
  // inline). Leaf falls through to the legacy paths below.
  if (unit.mode === "spawner") {
    graph.addNode({
      id: `run-spawner${suffix}`,
      handler: "run-spawner",
      status: "buffered",
      origin: "reactive",
      data: { priority: 64 },
    });
    return { action: "continue" };
  }
  if (unit.mode === "converger") {
    graph.addNode({
      id: `run-converger${suffix}`,
      handler: "run-converger",
      status: "buffered",
      origin: "reactive",
      data: { priority: 64 },
    });
    return { action: "continue" };
  }
  if (unit.mode === "gateway") {
    graph.addNode({
      id: `run-gateway${suffix}`,
      handler: "run-gateway",
      status: "buffered",
      origin: "reactive",
      data: { priority: 64 },
    });
    return { action: "continue" };
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
