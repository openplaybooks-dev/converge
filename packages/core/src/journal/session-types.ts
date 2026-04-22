/**
 * Session Logging Types
 *
 * Types for session-level logging that captures complete orchestration runs.
 */

import type { Gap } from "../task/gap/types.ts";

/* ------------------------------------------------------------------ */
/*  Session Event Types                                               */
/* ------------------------------------------------------------------ */

export type SessionEventType =
  | "SESSION_START"
  | "SESSION_END"
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
  | "TASK_EXECUTION_COMPLETE";

/**
 * Session-level event
 */
export interface SessionEvent {
  timestamp: string;
  eventType: SessionEventType;
  message?: string;
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Session Metadata                                                  */
/* ------------------------------------------------------------------ */

/**
 * Session configuration
 */
export interface SessionConfig {
  maxIterations: number;
  maxAttemptsPerTask?: number;
}

/**
 * Session outcomes
 */
export interface SessionOutcomes {
  totalIterations: number;
  tasksCompleted: number;
  tasksFailed: number;
  gapsResolved: number;
  convergenceAchieved: boolean;
}

/**
 * Session environment info
 */
export interface SessionEnvironment {
  nodeVersion: string;
  platform: string;
}

/**
 * Session status
 */
export type SessionStatus =
  | "running"
  | "complete"
  | "stalled"
  | "error"
  | "cancelled";

/**
 * Complete session metadata
 */
export interface SessionMetadata {
  sessionId: string;
  projectName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: SessionStatus;
  config: SessionConfig;
  outcomes?: SessionOutcomes;
  environment: SessionEnvironment;
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
/*  Session Hooks                                                     */
/* ------------------------------------------------------------------ */

/**
 * Session start hook context
 */
export interface SessionStartContext {
  sessionId: string;
  projectName: string;
  config: SessionConfig;
}

/**
 * Session iteration hook context
 */
export interface SessionIterationContext {
  sessionId: string;
  iteration: number;
  progress: ProgressSnapshot;
}

/**
 * Session complete hook context
 */
export interface SessionCompleteContext {
  sessionId: string;
  outcomes: SessionOutcomes;
  metadata: SessionMetadata;
}

/**
 * Session hooks configuration
 */
export interface SessionHooks {
  "session:start"?: (ctx: SessionStartContext) => void | Promise<void>;
  "session:iteration"?: (ctx: SessionIterationContext) => void | Promise<void>;
  "session:complete"?: (ctx: SessionCompleteContext) => void | Promise<void>;
}
