/**
 * Navigator Graph — Types
 *
 * Graph-driven state machine model: nodes have lifecycle status,
 * edges record transitions. The graph is the single source of truth
 * for execution state, history, and crash-safe checkpointing.
 */

import type { Gap } from "../../gap/types.ts";
import type { Unit } from "../../unit/unit.ts";
import type { RetryMode } from "../types.ts";
import type { TaskContext } from "./task-context.ts";

/* ------------------------------------------------------------------ */
/*  Node lifecycle                                                     */
/* ------------------------------------------------------------------ */

export type NodeStatus =
  | "buffered"
  | "executing"
  | "done"
  | "failed"
  | "skipped";
export type NodeOrigin = "initial" | "planned" | "reactive";

/* ------------------------------------------------------------------ */
/*  Snapshot (immutable input to every action)                         */
/* ------------------------------------------------------------------ */

export interface Snapshot {
  readonly unit: Unit;
  readonly gaps: readonly Gap[];
  readonly iteration: number;
  readonly previousGaps: readonly Gap[];
  readonly stallCount: number;
  readonly projectDir: string;
  readonly epicId: string;
  readonly taskContext?: TaskContext;
  /** Last action outcome — used by plan-level predicates */
  readonly lastActionSucceeded?: boolean;
  readonly lastActionName?: string | null;
  readonly lastActionRetryMode?: RetryMode;
}

/* ------------------------------------------------------------------ */
/*  Graph types                                                        */
/* ------------------------------------------------------------------ */

/** A node — action with lifecycle status */
export interface GraphNode {
  id: string;
  handler: string;
  status: NodeStatus;
  /** Who created this node */
  origin: NodeOrigin;
  /** Result after execution */
  result?: {
    action: "continue" | "done" | "bail" | "delegate";
    success?: boolean;
    reason?: string;
    gaps?: Gap[];
    durationMs: number;
  };
  /** Arbitrary metadata: applicable predicate key, priority, strategy params */
  data?: Record<string, unknown>;
}

/** An edge — transition between nodes */
export interface GraphEdge {
  from: string;
  to: string;
  iteration: number;
  ts: string;
}

/** Graph interface — readable and writable by all participants */
export interface Graph {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];

  addNode(node: GraphNode): void;
  hasNode(id: string): boolean;
  getNode(id: string): GraphNode | undefined;
  addEdge(from: string, to: string, meta?: { iteration?: number }): void;

  /** All nodes with status 'buffered' */
  getBufferedNodes(): GraphNode[];
  /** All nodes matching a handler name */
  getNodesByHandler(handler: string): GraphNode[];
  /** Last node that completed execution (done or failed) */
  lastExecuted(): GraphNode | undefined;
  /** Last N executed nodes in order */
  getLastN(n: number): GraphNode[];
  /** Nth node from the end of the execution order */
  nthFromEnd(n: number): GraphNode | undefined;
}

/* ------------------------------------------------------------------ */
/*  WalkResult (output of every action handler)                        */
/* ------------------------------------------------------------------ */

export interface WalkResult {
  action: "continue" | "done" | "bail" | "delegate";
  success?: boolean;
  reason?: string;
  retryMode?: RetryMode;
  gaps?: Gap[];
  previousGaps?: Gap[];
  stallCount?: number;
  /** Children to execute when action is 'delegate' */
  delegateChildren?: Unit[];
}

/* ------------------------------------------------------------------ */
/*  Action handler signature                                           */
/* ------------------------------------------------------------------ */

export type ActionHandler = (
  snap: Snapshot,
  graph: Graph,
) => Promise<WalkResult>;

/* ------------------------------------------------------------------ */
/*  Goal condition — exit criteria for convergence                     */
/* ------------------------------------------------------------------ */

export interface GoalCondition {
  name: string;
  check: (state: Snapshot) => boolean;
}
