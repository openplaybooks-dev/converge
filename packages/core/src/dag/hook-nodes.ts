/**
 * Hook Node Factory
 *
 * Expands hook definitions into companion DAG nodes. Modeled after the
 * seed system: a hook definition is a template; each matching task gets
 * a companion node inserted at the right topological position.
 */

import type { DagNode } from "./dag-node.ts";
import type { TaskDag } from "./task-dag.ts";
import type {
  HookDefinition,
  HookContext,
  HookExecutorFn,
} from "../hooks/hook-definition.ts";
import type { TaskDefinition } from "../config/task-definition.ts";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Expand all hook definitions into companion DAG nodes.
 *
 * For each hook, finds matching tasks in the DAG by tag/taskId filter.
 * For each match, creates a companion node and inserts it at the right
 * topological position. Companion nodes for the same task are chained
 * in hook-ID order.
 *
 * Returns the created companion nodes (already added to the DAG).
 */
export function expandHooks(hooks: HookDefinition[], dag: TaskDag): DagNode[] {
  if (!hooks || hooks.length === 0) return [];

  // Group matches by task ID: { taskId → HookDefinition[] }
  const matches = new Map<string, HookDefinition[]>();

  for (const hook of hooks) {
    for (const [taskId, taskNode] of dag.nodes) {
      // Never hook into other hook nodes (prevents infinite recursion)
      if (taskNode.type === "hook") continue;
      if (matchesFilter(hook.filter, taskNode)) {
        let list = matches.get(taskId);
        if (!list) {
          list = [];
          matches.set(taskId, list);
        }
        list.push(hook);
      }
    }
  }

  const created: DagNode[] = [];

  for (const [taskId, matchedHooks] of matches) {
    // Sort by hook ID for deterministic chaining
    matchedHooks.sort((a, b) => a.id.localeCompare(b.id));

    const taskNode = dag.nodes.get(taskId);
    if (!taskNode) continue;

    // Separate hooks by event type
    const completeHooks = matchedHooks.filter((h) => h.on === "task:complete");
    const failHooks = matchedHooks.filter((h) => h.on === "task:fail");
    const startHooks = matchedHooks.filter((h) => h.on === "task:start");

    // ── task:complete hooks → chain after the task ──────────────────
    if (completeHooks.length > 0) {
      const chain = buildHookChain(taskId, taskNode, completeHooks, dag);
      created.push(...chain);

      // Rewire: the task's original dependents now depend on the LAST
      // companion in the chain (the chain already has internal deps set).
      // Pass the first chain node ID so rewireDependents skips it.
      const lastInChain = chain[chain.length - 1];
      const firstInChain = chain[0];
      if (lastInChain) {
        rewireDependents(taskId, lastInChain.id, dag, firstInChain?.id);
      }
    }

    // ── task:fail hooks → depend on task, non-blocking ──────────────
    for (const hook of failHooks) {
      const companion = createCompanionNode(hook, taskId, taskNode, dag);
      // Skip if already in DAG (idempotent)
      if (dag.nodes.has(companion.id)) {
        created.push(dag.nodes.get(companion.id)!);
        continue;
      }
      created.push(companion);
      dag.addNode(companion);
      // No rewiring — fail hooks are non-blocking
    }

    // ── task:start hooks → chain before the task ────────────────────
    if (startHooks.length > 0) {
      const chain = buildBeforeChain(taskId, taskNode, startHooks, dag);
      created.push(...chain);
      // The task's depends_on already updated in buildBeforeChain
    }
  }

  return created;
}

/* ------------------------------------------------------------------ */
/*  Filter matching                                                    */
/* ------------------------------------------------------------------ */

function matchesFilter(
  filter: HookDefinition["filter"],
  node: DagNode,
): boolean {
  // Match by task ID
  if (filter.taskIds?.includes(node.id)) return true;

  // Match by tag — taskDef.tags is string[]
  const nodeTags: string[] = (node.taskDef as any).tags ?? [];
  if (filter.tags) {
    for (const tag of filter.tags) {
      if (nodeTags.includes(tag)) return true;
    }
  }

  return false;
}

/* ------------------------------------------------------------------ */
/*  Companion node creation                                             */
/* ------------------------------------------------------------------ */

/**
 * Create a single companion DAG node for a (hook, task) match.
 *
 * The companion node carries:
 * - A virtual path (no on-disk TASK.md)
 * - An executorFn wrapping the hook's fn
 * - The hook's blocking config
 * - depends_on set based on hook event
 */
function createCompanionNode(
  hook: HookDefinition,
  taskId: string,
  taskNode: DagNode,
  dag: TaskDag,
): DagNode {
  const companionId = `${hook.id}__${taskId}`;
  const taskTitle = taskNode.taskDef.title ?? taskId;
  const blocking =
    hook.blocking !== undefined ? hook.blocking : hook.on !== "task:fail";

  const taskDef = buildCompanionTaskDef(hook, taskId, taskTitle, blocking);

  const depends_on: string[] = [];
  if (hook.on === "task:complete" || hook.on === "task:fail") {
    depends_on.push(taskId);
  }
  // For task:start, depends_on is set in buildBeforeChain

  const node: DagNode = {
    id: companionId,
    type: "hook",
    parents: [taskId],
    children: [],
    depends_on,
    depended_on_by: [],
    taskDef,
    path: `<virtual:hook:${hook.id}>`,
    status: "pending",
    virtual: true,
  };

  return node;
}

/**
 * Build a TaskDefinition for a companion node.
 * The executorFn wraps the hook's fn, providing HookContext.
 */
function buildCompanionTaskDef(
  hook: HookDefinition,
  taskId: string,
  taskTitle: string,
  blocking: boolean,
): TaskDefinition {
  const hookFn: HookExecutorFn = hook.fn;

  const executorFn = async (fakeCtx: any) => {
    const projectDir: string = fakeCtx.projectDir ?? process.cwd();

    const hookCtx: HookContext = {
      taskId,
      taskTitle,
      hookId: hook.id,
      projectDir,
      shell: (cmd: string) => {
        return new Promise((resolve) => {
          const { exec } = require("node:child_process");
          exec(
            cmd,
            { cwd: projectDir, maxBuffer: 10 * 1024 * 1024 },
            (error: any, stdout: any, stderr: any) => {
              resolve({
                stdout: stdout?.toString() ?? "",
                stderr: stderr?.toString() ?? "",
                exitCode: error?.code ?? (error ? 1 : 0),
              });
            },
          );
        });
      },
      log: {
        info: (msg: string) =>
          fakeCtx.log?.info(`[hook:${hook.id}] ${msg}`) ??
          console.log(`[hook:${hook.id}] ${msg}`),
        warn: (msg: string) =>
          fakeCtx.log?.warn(`[hook:${hook.id}] ${msg}`) ??
          console.warn(`[hook:${hook.id}] ${msg}`),
        error: (msg: string) =>
          fakeCtx.log?.error(`[hook:${hook.id}] ${msg}`) ??
          console.error(`[hook:${hook.id}] ${msg}`),
      },
      vars: fakeCtx.vars ?? {},
    };

    await hookFn(hookCtx);
  };

  return {
    id: `${hook.id}__${taskId}`,
    title: `${hook.title ?? hook.id} (after: ${taskTitle})`,
    executorFn,
    blocking,
  } as TaskDefinition;
}

/* ------------------------------------------------------------------ */
/*  Chain building                                                     */
/* ------------------------------------------------------------------ */

/**
 * Build a chain of companion nodes for `task:complete` hooks.
 *
 * Chain: task → H1 → H2 → ... → Hn
 * Each H depends on the previous node. The LAST node (Hn) is what
 * the task's original dependents will be rewired to.
 */
function buildHookChain(
  taskId: string,
  taskNode: DagNode,
  hooks: HookDefinition[],
  dag: TaskDag,
): DagNode[] {
  const chain: DagNode[] = [];
  let prevId = taskId;

  for (const hook of hooks) {
    const companion = createCompanionNode(hook, taskId, taskNode, dag);
    // Override depends_on to chain from the previous node
    companion.depends_on = [prevId];

    // Skip if already in DAG (idempotent)
    if (dag.nodes.has(companion.id)) {
      prevId = companion.id;
      chain.push(dag.nodes.get(companion.id)!);
      continue;
    }

    chain.push(companion);
    dag.addNode(companion);
    prevId = companion.id;
  }

  return chain;
}

/**
 * Build a chain of companion nodes for `task:start` hooks.
 *
 * Chain: Hn → ... → H1 → task
 * H1 depends on task's original dependencies.
 * The task is rewired to depend on Hn (the last start hook).
 */
function buildBeforeChain(
  taskId: string,
  taskNode: DagNode,
  hooks: HookDefinition[],
  dag: TaskDag,
): DagNode[] {
  const chain: DagNode[] = [];
  // Reverse: last hook runs closest to the task
  const reversed = [...hooks].reverse();

  for (const hook of reversed) {
    const companion = createCompanionNode(hook, taskId, taskNode, dag);
    companion.depends_on = [...taskNode.depends_on];

    if (dag.nodes.has(companion.id)) {
      chain.push(dag.nodes.get(companion.id)!);
      continue;
    }

    chain.push(companion);
    dag.addNode(companion);
  }

  // The task now depends on the last hook in the chain
  if (chain.length > 0) {
    const lastHook = chain[chain.length - 1];
    // Update the task node's depends_on (only if not already set)
    const alreadyWired =
      taskNode.depends_on.length === 1 &&
      taskNode.depends_on[0] === lastHook.id;
    if (!alreadyWired) {
      taskNode.depends_on = [lastHook.id];
      if (!lastHook.depended_on_by.includes(taskId)) {
        lastHook.depended_on_by.push(taskId);
      }
    }
  }

  return chain;
}

/* ------------------------------------------------------------------ */
/*  Dependency rewiring                                                */
/* ------------------------------------------------------------------ */

/**
 * Rewire all nodes that depended on `fromId` to instead depend on `toId`.
 * Skips `skipId` (the first node in a hook chain, which legitimately depends on fromId).
 * Updates both depends_on and depended_on_by on affected nodes.
 */
function rewireDependents(
  fromId: string,
  toId: string,
  dag: TaskDag,
  skipId?: string,
): void {
  for (const [, node] of dag.nodes) {
    if (node.id === toId || node.id === fromId) continue;
    if (node.id === skipId) continue; // don't rewire the first hook in the chain
    const idx = node.depends_on.indexOf(fromId);
    if (idx === -1) continue;

    // Replace the dep
    node.depends_on[idx] = toId;

    // Update depended_on_by on both nodes
    const fromNode = dag.nodes.get(fromId);
    if (fromNode) {
      const outIdx = fromNode.depended_on_by.indexOf(node.id);
      if (outIdx !== -1) fromNode.depended_on_by.splice(outIdx, 1);
    }

    const toNode = dag.nodes.get(toId);
    if (toNode && !toNode.depended_on_by.includes(node.id)) {
      toNode.depended_on_by.push(node.id);
    }
  }
}
