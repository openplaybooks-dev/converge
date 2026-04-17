/**
 * Navigator — Graph-Driven Convergence Loop
 *
 * One action per iteration. The graph is the checkpoint.
 *
 * Each iteration:
 *   1. Read graph (what happened so far?)
 *   2. Pick ONE buffered+applicable action
 *   3. Execute it
 *   4. Write result to graph
 *   5. Persist graph to disk
 *   6. Yield — loop back to step 1
 *
 * Resume after crash: load graph from disk → last node is done → pick next.
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type {
  Snapshot,
  WalkResult,
  ActionHandler,
  GraphNode,
  GoalCondition,
  Graph,
} from './types.ts';
import type { Unit } from '../../unit/unit.ts';
import type { TaskContext } from './task-context.ts';
import { NavigatorGraph } from './graph.ts';
import { buildInitialNodes, GOAL_CONDITIONS } from './default-graph.ts';
import { evalPredicate } from './predicates.ts';

/* ------------------------------------------------------------------ */
/*  Trace logger                                                       */
/* ------------------------------------------------------------------ */

function trace(snap: Snapshot, entry: Record<string, unknown>): void {
  const attemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
  if (!attemptDir) return;
  try {
    const logsDir = join(attemptDir, 'logs');
    mkdirSync(logsDir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      iter: snap.iteration,
      gaps: snap.gaps.length,
      stall: snap.stallCount,
      ...entry,
    });
    appendFileSync(join(logsDir, 'predicate-logs.jsonl'), line + '\n');
  } catch {
    // Best-effort
  }
}

/* ------------------------------------------------------------------ */
/*  Converge options / result                                          */
/* ------------------------------------------------------------------ */

export interface ConvergeOptions {
  unit: Unit;
  projectDir: string;
  epicId: string;
  registry: Map<string, ActionHandler>;
  taskContext: TaskContext;
  maxActions: number;
}

export interface ConvergeResult {
  success: boolean;
  reason?: string;
}

/* ------------------------------------------------------------------ */
/*  selectNext — pick the best applicable buffered node                */
/* ------------------------------------------------------------------ */

function selectNext(graph: Graph, state: Snapshot): GraphNode | null {
  const buffered = graph.getBufferedNodes();

  const applicable = buffered.filter(n => {
    const pred = n.data?.applicable as string | undefined;
    if (!pred) return true; // no precondition = always applicable
    return evalPredicate(pred, state);
  });

  if (applicable.length === 0) return null;

  // Sort by priority (higher first); stable order within same priority
  applicable.sort((a, b) => {
    const pa = (a.data?.priority as number) ?? 0;
    const pb = (b.data?.priority as number) ?? 0;
    return pb - pa;
  });

  return applicable[0];
}

/* ------------------------------------------------------------------ */
/*  Stall detection via graph reading                                  */
/* ------------------------------------------------------------------ */

function isStalled(graph: Graph): boolean {
  const recent = graph.getLastN(6);
  if (recent.length < 3) return false;

  // Same handler failed twice
  const failed = recent.filter(n => n.status === 'failed');
  const failedHandlers = failed.map(n => n.handler);
  const duplicateFailures = failedHandlers.filter(
    (h, i) => failedHandlers.indexOf(h) !== i,
  );
  if (duplicateFailures.length > 0) return true;

  // 3+ consecutive failures
  const lastThree = recent.slice(-3);
  if (lastThree.every(n => n.status === 'failed')) return true;

  return false;
}

/* ------------------------------------------------------------------ */
/*  Goal condition check                                               */
/* ------------------------------------------------------------------ */

function allSatisfied(conditions: GoalCondition[], state: Snapshot): boolean {
  return conditions.every(c => c.check(state));
}

/* ------------------------------------------------------------------ */
/*  Seed a new cycle of buffered nodes                                 */
/* ------------------------------------------------------------------ */

function startNewCycle(graph: NavigatorGraph, unit: Unit, cycle: number): void {
  const suffix = `#${cycle}`;
  const fresh = buildInitialNodes(unit);

  for (const node of fresh) {
    const cycleNode: GraphNode = {
      ...node,
      id: `${node.id}${suffix}`,
      origin: 'reactive',
    };
    graph.addNode(cycleNode);
  }
}

/* ------------------------------------------------------------------ */
/*  Rebuild state from persisted graph                                 */
/* ------------------------------------------------------------------ */

function rebuildStateFromGraph(
  graph: NavigatorGraph,
  unit: Unit,
  projectDir: string,
  epicId: string,
  taskContext: TaskContext,
): { gaps: readonly import('../../gap/types.ts').Gap[]; previousGaps: readonly import('../../gap/types.ts').Gap[]; stallCount: number; iteration: number; lastNodeId: string | null } {
  // Walk executed nodes to find the latest gap state and stall count
  const executed = graph.getLastN(Infinity);
  let gaps: import('../../gap/types.ts').Gap[] = [];
  let previousGaps: import('../../gap/types.ts').Gap[] = [];
  let stallCount = 0;
  let iteration = 1;
  let lastNodeId: string | null = null;

  for (const node of executed) {
    if (node.result?.gaps) {
      previousGaps = [...gaps];
      gaps = node.result.gaps;
    }
    lastNodeId = node.id;
  }

  // Count completed cycles (each detect-gaps that completed = one cycle)
  const detectGapsDone = graph.getNodesByHandler('detect-gaps')
    .filter(n => n.status === 'done');
  iteration = Math.max(1, detectGapsDone.length);

  return { gaps, previousGaps, stallCount, iteration, lastNodeId };
}

/* ------------------------------------------------------------------ */
/*  converge — the main loop                                           */
/* ------------------------------------------------------------------ */

export async function converge(opts: ConvergeOptions): Promise<ConvergeResult> {
  const { unit, projectDir, epicId, registry, taskContext, maxActions } = opts;

  // 1. Load graph from disk or create new
  const walkerState = await taskContext.loadWalkerState();
  let graph: NavigatorGraph;
  let cycle: number;
  let lastNodeId: string | null = null;

  if (walkerState && walkerState.nodes.length > 0) {
    graph = NavigatorGraph.fromJSON({
      nodes: walkerState.nodes,
      edges: walkerState.edges,
    });
    const rebuilt = rebuildStateFromGraph(graph, unit, projectDir, epicId, taskContext);
    cycle = rebuilt.iteration;
    lastNodeId = rebuilt.lastNodeId;
  } else {
    graph = new NavigatorGraph();
    cycle = 1;
  }

  // 2. Seed initial buffered nodes (idempotent)
  const initialNodes = buildInitialNodes(unit);
  for (const node of initialNodes) {
    graph.addNode(node);
  }

  // 3. Persist initial state
  await taskContext.saveWalkerState({
    iteration: cycle,
    stallCount: 0,
    nodes: graph.toJSON().nodes,
    edges: graph.toJSON().edges,
  });

  // 4. Build initial snapshot
  let gaps: import('../../gap/types.ts').Gap[] = [];
  let previousGaps: import('../../gap/types.ts').Gap[] = [];
  let stallCount = walkerState?.stallCount ?? 0;

  // If resuming, rebuild gap state from graph
  if (walkerState && walkerState.nodes.length > 0) {
    const rebuilt = rebuildStateFromGraph(graph, unit, projectDir, epicId, taskContext);
    gaps = [...rebuilt.gaps];
    previousGaps = [...rebuilt.previousGaps];
    stallCount = rebuilt.stallCount;
  }

  // 5. Main convergence loop — one action per pass
  let actionCount = graph.nodes.filter(n =>
    n.status === 'done' || n.status === 'failed',
  ).length;

  while (actionCount < maxActions) {
    const snap: Snapshot = {
      unit,
      gaps,
      iteration: cycle,
      previousGaps,
      stallCount,
      projectDir,
      epicId,
      taskContext,
    };

    // Goal condition check (skip if no detection has been done yet)
    const detectionsComplete = graph.getNodesByHandler('detect-gaps')
      .some(n => n.status === 'done');
    // Also check that signal-done has run (or is not applicable) before declaring success.
    // This ensures the completion handler properly marks the task as done in checkpoint/journal.
    // Without this, the goal condition check bypasses signal-done for no-inputs/no-outputs tasks.
    const signalDoneNode = graph.getNodesByHandler('signal-done').find(n => n.status === 'done');
    const signalDoneNotApplicable = !graph.getBufferedNodes().some(n => n.handler === 'signal-done');
    if (detectionsComplete && allSatisfied(GOAL_CONDITIONS, snap)) {
      // Only declare success if signal-done has actually run, or there's no signal-done to run
      if (signalDoneNode || signalDoneNotApplicable) {
        taskContext.logOutcome(cycle, 'done', 'All goal conditions satisfied');
        return { success: true, reason: 'All goal conditions satisfied' };
      }
      // Otherwise let signal-done run first before checking goal conditions again
    }

    // Pick next action
    let next = selectNext(graph, snap);

    if (!next) {
      // No applicable buffered nodes — try starting a new cycle
      if (gaps.length > 0) {
        cycle++;
        startNewCycle(graph, unit, cycle);
        next = selectNext(graph, { ...snap, iteration: cycle });
      }

      if (!next) {
        // Check if we've actually converged despite no applicable actions
        if (detectionsComplete && gaps.length === 0) {
          taskContext.logOutcome(cycle, 'done', 'Converged');
          return { success: true, reason: 'Converged' };
        }
        taskContext.logOutcome(cycle, 'bail', 'No applicable action');
        return { success: false, reason: 'No applicable action' };
      }
    }

    // Execute ONE action
    const handlerName = next.handler;
    const handler = registry.get(handlerName);

    if (!handler) {
      trace(snap, { node: 'action', handler: handlerName, error: 'unknown' });
      next.status = 'failed';
      next.result = {
        action: 'bail',
        reason: `Unknown handler: ${handlerName}`,
        durationMs: 0,
      };
      taskContext.logOutcome(cycle, 'bail', `Unknown handler: ${handlerName}`);
      return { success: false, reason: `Unknown handler: ${handlerName}` };
    }

    next.status = 'executing';
    trace(snap, { node: 'action', handler: handlerName, status: 'start' });

    const t0 = Date.now();
    const result = await handler(snap, graph);
    const durationMs = Date.now() - t0;

    // Record result on the node
    next.status = (result.action === 'bail')
      ? 'failed'
      : 'done';
    next.result = {
      action: result.action,
      success: result.success,
      reason: result.reason,
      gaps: result.gaps,
      durationMs,
    };

    trace(snap, {
      node: 'action',
      handler: handlerName,
      status: 'done',
      result: result.action,
      ...(result.reason ? { reason: result.reason } : {}),
      ...(result.gaps ? { newGaps: result.gaps.length } : {}),
    });

    taskContext.logAction(cycle, handlerName, result.action, durationMs, result.reason);

    // Record the transition edge
    graph.addEdge(lastNodeId ?? '_start', next.id, { iteration: cycle });
    lastNodeId = next.id;

    // Apply result to state
    if (result.gaps) {
      previousGaps = [...gaps];
      gaps = result.gaps;
    }
    if (result.previousGaps) {
      previousGaps = [...result.previousGaps];
    }
    if (result.stallCount !== undefined) {
      stallCount = result.stallCount;
    }

    // Persist — crash-safe checkpoint
    await taskContext.saveWalkerState({
      iteration: cycle,
      stallCount,
      nodes: graph.toJSON().nodes,
      edges: graph.toJSON().edges,
    });

    actionCount++;

    // Handle terminal actions
    if (result.action === 'done') {
      taskContext.logOutcome(cycle, 'done', result.reason);
      return { success: result.success ?? true, reason: result.reason };
    }

    if (result.action === 'bail') {
      taskContext.logOutcome(cycle, 'bail', result.reason);
      return { success: false, reason: result.reason };
    }

    if (result.action === 'delegate' && result.delegateChildren) {
      const children = result.delegateChildren;
      console.log(`\n📦 Delegating to ${children.length} child task(s)...`);
      let completed = 0;
      for (const child of children) {
        const ok = await child.run();
        if (ok) completed++;
        console.log(`   [${completed}/${children.length}] ${child.id}: ${ok ? '✅' : '❌'}`);
      }
      taskContext.logOutcome(cycle, 'delegate', `${completed}/${children.length} children completed`);
      // Continue — detect-gaps in next cycle will check if parent's gaps are resolved
    }

    // Stall detection
    if (isStalled(graph)) {
      taskContext.logOutcome(cycle, 'bail', 'Stalled — repeated failures');
      return { success: false, reason: 'Stalled — repeated failures' };
    }
  }

  taskContext.logOutcome(cycle, 'max-iterations');
  console.log(`\n❌ Max actions (${maxActions}) reached`);
  const { findGaps } = await import('../../unit/find-gaps.ts');
  const finalGaps = await findGaps(unit);
  for (const gap of finalGaps) {
    console.log(`  - ${gap.type}: ${gap.description}`);
  }
  return { success: false, reason: 'Max actions reached' };
}
