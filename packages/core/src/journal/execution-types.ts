/**
 * Execution Logging Types
 *
 * Types for execution-level logging that captures complete orchestration runs.
 */


/* ------------------------------------------------------------------ */
/*  Execution Event Types                                             */
/* ------------------------------------------------------------------ */

export type ExecutionEventType =
  | "EXECUTION_START"
  | "EXECUTION_END"
  | "ITERATION_START"
  | "ITERATION_COMPLETE"
  | "TASK_SELECTED"
  | "TASK_ATTEMPT_START"
  | "TASK_ATTEMPT_COMPLETE"
  | "UPSTREAM_TRIGGERED"
  | "GAP_DETECTED"
  | "STRATEGY_ATTEMPTED"
  | "CONVERGENCE_ACHIEVED"
  | "CONVERGENCE_STALLED"
  | "TOOL_CALL"
  | "TOOL_RESULT"
  | "AI_OUTPUT"
  | "GAP_RESOLVED"
  | "TASK_EXECUTION_COMPLETE"
  // Single-target DAG model events
  | "PROGRESS"
  | "NODE_START"
  | "NODE_COMPLETE"
  | "NODE_FAIL"
  | "ATTEMPT_START"
  | "ATTEMPT_COMPLETE"
  | "UPSTREAM"
  | "CHECK_FAIL"
  | "CHECK_PASS"
  | "RETRY"
  | "TOOL_USE"
  | "AI_ACTIVITY";

/**
 * Execution-level event
 */
export interface ExecutionEvent {
  timestamp: string;
  eventType: ExecutionEventType;
  message?: string;
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Execution Metadata                                                */
/* ------------------------------------------------------------------ */

/**
 * Execution configuration
 */
export interface ExecutionConfig {
  maxIterations: number;
  maxAttemptsPerTask?: number;
}

/**
 * Execution outcomes
 */
export interface ExecutionOutcomes {
  totalIterations: number;
  /** Tasks satisfied at end of run (executed this round + already cached). */
  tasksCompleted: number;
  tasksFailed: number;
  gapsResolved: number;
  convergenceAchieved: boolean;
  /** Total tasks in the DAG (executed + cached + failed + pending). */
  tasksTotal?: number;
  /** Tasks that were already satisfied at run start and never executed. */
  tasksCached?: number;
  /** Tasks the executor actually invoked this run. */
  tasksExecuted?: number;
}

/**
 * Execution environment info
 */
export interface ExecutionEnvironment {
  nodeVersion: string;
  platform: string;
}

/**
 * Execution status
 */
export type ExecutionStatus =
  | "running"
  | "complete"
  | "stalled"
  | "error"
  | "cancelled";

/**
 * Complete execution metadata
 */
export interface ExecutionMetadata {
  executionId: string;
  projectName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: ExecutionStatus;
  config: ExecutionConfig;
  outcomes?: ExecutionOutcomes;
  environment: ExecutionEnvironment;
}

/* ------------------------------------------------------------------ */
/*  Progress Snapshot                                                 */
/* ------------------------------------------------------------------ */

/**
 * Current task info in progress snapshot
 */
export interface CurrentTaskInfo {
  id: string;
  epic: string;
  attempt: number;
  status: "running" | "completed" | "failed";
}

/**
 * Gap info in progress snapshot
 */
export interface GapInfo {
  type: string;
  task: string;
  count: number;
}

/**
 * Iteration progress snapshot
 */
export interface ProgressSnapshot {
  iteration: number;
  timestamp: string;
  tasksComplete: number;
  tasksTotal: number;
  currentTask?: CurrentTaskInfo;
  gaps: GapInfo[];
}

/* ------------------------------------------------------------------ */
/*  Execution Hooks                                                   */
/* ------------------------------------------------------------------ */

/**
 * Execution start hook context
 */
export interface ExecutionStartContext {
  executionId: string;
  projectName: string;
  config: ExecutionConfig;
}

/**
 * Execution iteration hook context
 */
export interface ExecutionIterationContext {
  executionId: string;
  iteration: number;
  progress: ProgressSnapshot;
}

/**
 * Execution complete hook context
 */
export interface ExecutionCompleteContext {
  executionId: string;
  outcomes: ExecutionOutcomes;
  metadata: ExecutionMetadata;
}

/**
 * Execution hooks configuration
 */
export interface ExecutionHooks {
  "execution:start"?: (ctx: ExecutionStartContext) => void | Promise<void>;
  "execution:iteration"?: (ctx: ExecutionIterationContext) => void | Promise<void>;
  "execution:complete"?: (ctx: ExecutionCompleteContext) => void | Promise<void>;
}
