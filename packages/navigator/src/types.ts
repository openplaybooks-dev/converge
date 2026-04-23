/**
 * Navigator Core Types
 *
 * Domain-agnostic types for the graph-driven state machine.
 * These types are generic and can be extended by domain-specific implementations.
 */

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
    durationMs: number;
    [key: string]: unknown; // Allow domain-specific result fields
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
  /** All nodes matching a status */
  getNodesByStatus(status: NodeStatus): GraphNode[];
  /** Last node that completed execution (done or failed) */
  lastExecuted(): GraphNode | undefined;
  /** Last N executed nodes in order */
  getLastN(n: number): GraphNode[];
  /** Nth node from the end of the execution order */
  nthFromEnd(n: number): GraphNode | undefined;
  /** Serialize graph to JSON */
  toJSON(): { nodes: GraphNode[]; edges: GraphEdge[] };
}

/* ------------------------------------------------------------------ */
/*  Snapshot (immutable input to every action)                         */
/* ------------------------------------------------------------------ */

/**
 * Base snapshot interface. Domain implementations should extend this
 * with their specific state fields.
 */
export interface BaseSnapshot {
  readonly iteration: number;
  readonly [key: string]: unknown; // Allow domain-specific fields
}

/* ------------------------------------------------------------------ */
/*  WalkResult (output of every action handler)                        */
/* ------------------------------------------------------------------ */

export interface WalkResult<TState = unknown> {
  action: "continue" | "done" | "bail" | "delegate";
  success?: boolean;
  reason?: string;
  /** Partial state updates to merge into snapshot */
  state?: Partial<TState>;
  /** Additional metadata (not merged into snapshot) */
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Action handler signature                                           */
/* ------------------------------------------------------------------ */

export type ActionHandler<TSnapshot extends BaseSnapshot = BaseSnapshot> = (
  snap: TSnapshot,
  graph: Readonly<Graph>,
) => Promise<WalkResult<TSnapshot>>;

/* ------------------------------------------------------------------ */
/*  Error handling                                                     */
/* ------------------------------------------------------------------ */

export type ErrorRecoveryStrategy = "retry" | "skip" | "bail";

export interface ActionError {
  error: Error;
  node: GraphNode;
  attempt: number;
}

/* ------------------------------------------------------------------ */
/*  Observability                                                      */
/* ------------------------------------------------------------------ */

export interface NavigatorMetrics {
  actionsExecuted: number;
  actionDurations: Map<string, number[]>;
  stallDetections: number;
  graphSize: { nodes: number; edges: number };
  errorCount: number;
  retryCount: number;
}

export interface NavigatorEvent {
  type: "action_start" | "action_complete" | "action_error" | "stall_detected" | "goal_satisfied";
  timestamp: string;
  data: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Goal condition — exit criteria for convergence                     */
/* ------------------------------------------------------------------ */

export interface GoalCondition<TSnapshot extends BaseSnapshot = BaseSnapshot> {
  name: string;
  check: (state: TSnapshot) => boolean;
}

/* ------------------------------------------------------------------ */
/*  Predicate function signature                                       */
/* ------------------------------------------------------------------ */

export type PredicateFn<TSnapshot extends BaseSnapshot = BaseSnapshot> = (
  snap: TSnapshot,
) => boolean;

/* ------------------------------------------------------------------ */
/*  Persistence adapter interface                                      */
/* ------------------------------------------------------------------ */

export interface PersistenceAdapter {
  load(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>;
  save(data: { nodes: GraphNode[]; edges: GraphEdge[] }): Promise<void>;
}
