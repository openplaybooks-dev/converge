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

import type {
  BaseSnapshot,
  Graph,
  GraphNode,
  ActionHandler,
  TerminationCondition,
  WalkResult,
  PersistenceAdapter,
  ErrorRecoveryStrategy,
  ActionError,
  NavigatorMetrics,
  NavigatorEvent,
} from "./types.js";
import type { PredicateRegistry } from "./predicates.js";

/* ------------------------------------------------------------------ */
/*  Converge options / result                                          */
/* ------------------------------------------------------------------ */

export interface ConvergeOptions<TSnapshot extends BaseSnapshot = BaseSnapshot> {
  graph: Graph;
  snapshot: TSnapshot;
  registry: Map<string, ActionHandler<TSnapshot>>;
  predicates: PredicateRegistry<TSnapshot>;
  terminationConditions?: TerminationCondition<TSnapshot>[];
  persistence?: PersistenceAdapter;
  maxActions: number;
  actionTimeout?: number;
  maxRetries?: number;
  onBeforeAction?: (node: GraphNode, snap: TSnapshot) => void | Promise<void>;
  onAfterAction?: (node: GraphNode, result: WalkResult<TSnapshot>, snap: TSnapshot) => void | Promise<void>;
  onError?: (error: ActionError, snap: TSnapshot) => ErrorRecoveryStrategy | Promise<ErrorRecoveryStrategy>;
  onEvent?: (event: NavigatorEvent) => void | Promise<void>;
  onMetrics?: (metrics: NavigatorMetrics) => void | Promise<void>;
}

export interface ConvergeResult {
  success: boolean;
  reason?: string;
  iterations: number;
  actionsExecuted: number;
  metrics: NavigatorMetrics;
}

/* ------------------------------------------------------------------ */
/*  selectNext — pick the best applicable buffered node                */
/* ------------------------------------------------------------------ */

function selectNext<TSnapshot extends BaseSnapshot>(
  graph: Graph,
  state: TSnapshot,
  predicates: PredicateRegistry<TSnapshot>,
): GraphNode | null {
  const buffered = graph.getBufferedNodes();

  const applicable = buffered.filter((n) => {
    const pred = n.data?.applicable as string | undefined;
    if (!pred) return true; // no precondition = always applicable
    return predicates.eval(pred, state);
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
  const failed = recent.filter((n) => n.status === "failed");
  const failedHandlers = failed.map((n) => n.handler);
  const duplicateFailures = failedHandlers.filter(
    (h, i) => failedHandlers.indexOf(h) !== i,
  );
  if (duplicateFailures.length > 0) return true;

  // 3+ consecutive failures
  const lastThree = recent.slice(-3);
  if (lastThree.every((n) => n.status === "failed")) return true;

  return false;
}

/* ------------------------------------------------------------------ */
/*  Goal condition check                                               */
/* ------------------------------------------------------------------ */

function allSatisfied<TSnapshot extends BaseSnapshot>(
  conditions: TerminationCondition<TSnapshot>[],
  state: TSnapshot,
): boolean {
  return conditions.every((c) => c.check(state));
}

/* ------------------------------------------------------------------ */
/*  Metrics tracking                                                    */
/* ------------------------------------------------------------------ */

function createMetrics(): NavigatorMetrics {
  return {
    actionsExecuted: 0,
    actionDurations: new Map(),
    stallDetections: 0,
    graphSize: { nodes: 0, edges: 0 },
    errorCount: 0,
    retryCount: 0,
  };
}

function updateMetrics(
  metrics: NavigatorMetrics,
  handler: string,
  durationMs: number,
  graph: Graph,
): void {
  metrics.actionsExecuted++;

  if (!metrics.actionDurations.has(handler)) {
    metrics.actionDurations.set(handler, []);
  }
  metrics.actionDurations.get(handler)!.push(durationMs);

  metrics.graphSize = {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
  };
}

function emitEvent(
  onEvent: ((event: NavigatorEvent) => void | Promise<void>) | undefined,
  type: NavigatorEvent["type"],
  data: Record<string, unknown>,
): void {
  if (!onEvent) return;
  const event: NavigatorEvent = {
    type,
    timestamp: new Date().toISOString(),
    data,
  };
  void onEvent(event);
}

/* ------------------------------------------------------------------ */
/*  Action execution with timeout and error handling                   */
/* ------------------------------------------------------------------ */

async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number | undefined,
): Promise<T> {
  if (!timeoutMs) return fn();

  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Action timeout")), timeoutMs)
    ),
  ]);
}

/* ------------------------------------------------------------------ */
/*  converge — the main loop                                           */
/* ------------------------------------------------------------------ */

export async function converge<TSnapshot extends BaseSnapshot = BaseSnapshot>(
  opts: ConvergeOptions<TSnapshot>,
): Promise<ConvergeResult> {
  const {
    graph,
    snapshot: initialSnapshot,
    registry,
    predicates,
    terminationConditions = [],
    persistence,
    maxActions,
    actionTimeout,
    maxRetries = 0,
    onBeforeAction,
    onAfterAction,
    onError,
    onEvent,
    onMetrics,
  } = opts;

  let snap = { ...initialSnapshot };
  let actionCount = 0;
  let lastNodeId: string | null = null;
  const metrics = createMetrics();
  const retryAttempts = new Map<string, number>();

  // Load persisted state if available
  if (persistence) {
    const loaded = await persistence.load();
    if (loaded) {
      graph.nodes.length = 0;
      graph.edges.length = 0;
      loaded.nodes.forEach((n) => graph.addNode(n));
      loaded.edges.forEach((e) => graph.addEdge(e.from, e.to, { iteration: e.iteration }));

      const lastNode = graph.lastExecuted();
      if (lastNode) {
        lastNodeId = lastNode.id;
      }
    }
  }

  // Count already executed actions
  const alreadyExecuted = graph.nodes.filter(
    (n) => n.status === "done" || n.status === "failed",
  ).length;
  actionCount = alreadyExecuted;

  // Main convergence loop — one action per pass
  while (actionCount < maxActions) {
    // Goal condition check
    if (terminationConditions.length > 0 && allSatisfied(terminationConditions, snap)) {
      emitEvent(onEvent, "termination_satisfied", { iterations: snap.iteration });

      if (onMetrics) {
        await onMetrics(metrics);
      }

      return {
        success: true,
        reason: "All termination conditions satisfied",
        iterations: snap.iteration,
        actionsExecuted: actionCount,
        metrics,
      };
    }

    // Pick next action
    const next = selectNext(graph, snap, predicates);

    if (!next) {
      if (onMetrics) {
        await onMetrics(metrics);
      }

      return {
        success: false,
        reason: "No applicable action",
        iterations: snap.iteration,
        actionsExecuted: actionCount,
        metrics,
      };
    }

    // Execute ONE action
    const handlerName = next.handler;
    const handler = registry.get(handlerName);

    if (!handler) {
      next.status = "failed";
      next.result = {
        action: "bail",
        reason: `Unknown handler: ${handlerName}`,
        durationMs: 0,
      };

      if (onMetrics) {
        await onMetrics(metrics);
      }

      return {
        success: false,
        reason: `Unknown handler: ${handlerName}`,
        iterations: snap.iteration,
        actionsExecuted: actionCount,
        metrics,
      };
    }

    next.status = "executing";

    if (onBeforeAction) {
      await onBeforeAction(next, snap);
    }

    emitEvent(onEvent, "action_start", { nodeId: next.id, handler: handlerName });

    const t0 = Date.now();
    let result: WalkResult<TSnapshot>;
    let executionError: Error | null = null;

    try {
      result = await executeWithTimeout(
        () => handler(snap, graph),
        actionTimeout,
      );
    } catch (error) {
      executionError = error as Error;
      metrics.errorCount++;

      emitEvent(onEvent, "action_error", {
        nodeId: next.id,
        handler: handlerName,
        error: executionError.message,
      });

      // Handle error with retry logic
      const attempt = (retryAttempts.get(next.id) || 0) + 1;
      retryAttempts.set(next.id, attempt);

      let strategy: ErrorRecoveryStrategy = "bail";

      if (onError) {
        strategy = await onError(
          { error: executionError, node: next, attempt },
          snap,
        );
      }

      if (strategy === "retry" && attempt <= maxRetries) {
        metrics.retryCount++;
        next.status = "buffered"; // Reset to buffered for retry
        continue; // Skip to next iteration - don't record result
      }

      if (strategy === "skip") {
        next.status = "skipped";
        next.result = {
          action: "continue",
          reason: `Skipped after error: ${executionError.message}`,
          durationMs: Date.now() - t0,
        };
        result = next.result as WalkResult<TSnapshot>;
      } else {
        // bail
        next.status = "failed";
        result = {
          action: "bail",
          reason: `Error: ${executionError.message}`,
        };
      }
    }

    const durationMs = Date.now() - t0;

    // Record result on the node
    next.status = result.action === "bail" ? "failed" : "done";
    next.result = {
      ...result,
      action: result.action,
      success: result.success,
      reason: result.reason,
      durationMs,
    };

    updateMetrics(metrics, handlerName, durationMs, graph);

    emitEvent(onEvent, "action_complete", {
      nodeId: next.id,
      handler: handlerName,
      action: result.action,
      durationMs,
    });

    if (onAfterAction) {
      await onAfterAction(next, result, snap);
    }

    // Record the transition edge
    graph.addEdge(lastNodeId ?? "_start", next.id, { iteration: snap.iteration });
    lastNodeId = next.id;

    // Apply result to snapshot (merge state updates)
    if (result.state) {
      snap = { ...snap, ...result.state };
    }

    // Persist — crash-safe checkpoint
    if (persistence) {
      await persistence.save(graph.toJSON());
    }

    actionCount++;

    // Handle terminal actions
    if (result.action === "done") {
      if (onMetrics) {
        await onMetrics(metrics);
      }

      return {
        success: result.success ?? true,
        reason: result.reason,
        iterations: snap.iteration,
        actionsExecuted: actionCount,
        metrics,
      };
    }

    if (result.action === "bail") {
      if (onMetrics) {
        await onMetrics(metrics);
      }

      return {
        success: false,
        reason: result.reason,
        iterations: snap.iteration,
        actionsExecuted: actionCount,
        metrics,
      };
    }

    // Stall detection
    if (isStalled(graph)) {
      metrics.stallDetections++;
      emitEvent(onEvent, "stall_detected", { iterations: snap.iteration });

      if (onMetrics) {
        await onMetrics(metrics);
      }

      return {
        success: false,
        reason: "Stalled — repeated failures",
        iterations: snap.iteration,
        actionsExecuted: actionCount,
        metrics,
      };
    }
  }

  if (onMetrics) {
    await onMetrics(metrics);
  }

  return {
    success: false,
    reason: "Max actions reached",
    iterations: snap.iteration,
    actionsExecuted: actionCount,
    metrics,
  };
}
