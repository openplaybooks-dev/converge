/**
 * Journal System Types
 *
 * Simple journal system for AI self-planning and gap tracking.
 */

import type { Gap } from "../task/gap/types.ts";

/* ------------------------------------------------------------------ */
/*  Event Types                                                       */
/* ------------------------------------------------------------------ */

export type EventType =
  | "SESSION_START"
  | "SESSION_END"
  | "ITERATION_START"
  | "ITERATION_COMPLETE"
  | "GAP_DETECTED"
  | "GAP_RESOLVED"
  | "TASK_START"
  | "TASK_COMPLETE"
  | "TASK_FAILED"
  | "EPIC_START"
  | "EPIC_COMPLETE"
  | "EPIC_FAILED"
  | "PROJECT_START"
  | "PROJECT_COMPLETE"
  | "ERROR"
  | "DECISION"
  | "RETRY"
  | "CHECK_RUN"
  | "CHECK_FAILED"
  | "GAP_RESOLVED"
  | "GAP_FIX_FAILED"
  | "TASKS_CHANGED"
  | "CLAUDEFN_START"
  | "CLAUDEFN_COMPLETE"
  | "CLAUDEFN_FAILED"
  | "PLAN_START"
  | "PLAN_COMPLETE"
  | "PLAN_FAILED"
  | "UPSTREAM_TRIGGERED"
  | "UPSTREAM_RESOLVED"
  | "UPSTREAM_FAILED"
  | "UPSTREAM_SKIPPED"
  | "STRATEGY_ATTEMPTED"
  | "STRATEGY_SUCCEEDED"
  | "STRATEGY_FAILED"
  | "TIMELINE_BEGIN"
  | "TIMELINE_FINISH"
  | "REWIND_TRIGGERED"
  | "REWIND_SUCCEEDED"
  | "REWIND_FAILED"
  // ── Pruning ───────────────────────────────────────────────────────────
  | "PRUNE_MARKER"
  // ── Before phase ──────────────────────────────────────────────────────
  | "LIFECYCLE_BEFORE_START"
  | "LIFECYCLE_BEFORE_COMPLETE"
  | "LIFECYCLE_BEFORE_FAILED"
  | "INPUT_SNAPSHOT_TAKEN"
  | "CONTEXT_DOC_BUILT"
  | "DEPENDENCY_MISSING"
  | "DEPENDENCY_SATISFIED"
  // ── After phase ───────────────────────────────────────────────────────
  | "LIFECYCLE_AFTER_START"
  | "LIFECYCLE_AFTER_COMPLETE"
  | "LIFECYCLE_AFTER_FAILED"
  | "DIFF_CAPTURED"
  | "CHECKS_RUN"
  | "CHECK_PASSED"
  | "CHECK_FAILED_DETAIL"
  | "OUTCOME_WRITTEN"
  | "BACKLOGS_COLLECTED"
  | "SUMMARY_WRITTEN"
  // ── Inner correction loop ─────────────────────────────────────────────
  | "CORRECTION_LOOP_START"
  | "CORRECTION_LOOP_EXHAUSTED"
  | "CORRECTION_ATTEMPTED"
  | "CORRECTION_DIAGNOSIS"
  | "CORRECTION_APPLIED"
  | "CORRECTION_VERIFIED"
  | "CORRECTION_FAILED"
  // ── WBS ───────────────────────────────────────────────────────────────
  | "WBS_SEED"
  // ── Extended events (controller, spawn-runner, lifecycle, repair) ────
  | "TASK_CRASH"
  | "SKILL_VALIDATION_FAILED"
  | "CLAUDEFN_PROMPT"
  | "CLAUDEFN_CRASH_RETRY"
  | "CLAUDEFN_TIMEOUT_RETRY"
  | "CHECK_SELF_HEALED"
  | "HEALTH_CHECK_ISSUES"
  | "WBS_SPAWN_BLOCKED"
  | "WBS_SPAWN_ISSUES"
  | "INCOMPLETE_PRODUCER_FIXED"
  | "PATTERN_AUTO_FIXED"
  | "AWAITING_USER_INPUT"
  | "USER_INPUT_RECEIVED"
  | "WBS_GENERATOR_FIXED"
  | "TOOL_ENVIRONMENT_REPAIRED";

/**
 * A single event in the journal log
 */
export interface JournalEvent {
  timestamp: string;
  eventType: EventType;
  level: "project" | "epic" | "task";
  scope: string; // project/epic/task ID
  message?: string;
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Gap Fixer Metadata                                               */
/* ------------------------------------------------------------------ */

/**
 * Metadata for gap-fixer tasks spawned by the self-healing system
 */
export interface GapFixerMetadata {
  gapId: string;
  fixerTaskId: string;
  attempt: number;
  parentTaskId: string;
  spawnedAt: string;
  completedAt?: string;
  success?: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Gap Summary                                                       */
/* ------------------------------------------------------------------ */

/**
 * Summary of gaps at a specific level
 */
export interface GapSummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  updated: string;
  gaps: Gap[];
}

/* ------------------------------------------------------------------ */
/*  Journal Reader Options                                            */
/* ------------------------------------------------------------------ */

export interface ReadLogOptions {
  /** Read last N events */
  last?: number;

  /** Skip first N events */
  offset?: number;

  /** Filter by event type */
  eventType?: EventType | EventType[];

  /** Filter by time range */
  since?: string;
  until?: string;
}

export interface SearchLogOptions {
  /** Event type(s) to search for */
  eventType: EventType | EventType[];

  /** Text pattern to match in message */
  pattern?: string | RegExp;

  /** Maximum results to return */
  limit?: number;
}

/* ------------------------------------------------------------------ */
/*  Journal API                                                       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Checklist                                                         */
/* ------------------------------------------------------------------ */

/**
 * A single verifiable item in a task's completion checklist.
 * Items come from three sources:
 *   - 'output'  — a declared output file or glob that must exist
 *   - 'check'   — an inline shell-command check that must pass
 *   - 'subtask' — a child task (discovered from same-named subdirectory)
 */
export interface ChecklistItem {
  /** Stable ID: "output:<path>", "check:<id>", "subtask:<taskId>" */
  id: string;
  /** Source of this checklist item */
  type: "output" | "check" | "subtask";
  /** Human-readable label */
  description: string;
  /** Extra detail: glob pattern, shell command, or subtask file path */
  details?: string;
  /** Whether this item has been satisfied */
  done: boolean;
  /** When this item was marked done */
  doneAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Task Status                                                       */
/* ------------------------------------------------------------------ */

/**
 * Lifecycle state of a task in the journal
 */
export type TaskStatusState =
  | "pending"
  | "running"
  | "complete"
  | "failed"
  | "skipped";

/**
 * Per-task status record written to status.json in the journal directory.
 * Mirrors the epics folder so every task has an observable status file.
 */
export interface TaskStatus {
  /** Task ID (leaf segment, e.g. "003-generate-all-screens") */
  taskId: string;
  /** Parent epic ID */
  epicId: string;
  /** Full hierarchical display path, e.g. "02-epic/003-step" */
  focusPath: string;
  /** Current lifecycle state */
  status: TaskStatusState;
  /** Human-readable task title */
  title?: string;
  /** Agent assigned to this task */
  agent?: string;
  /** True when task has yields config but no prompt */
  isYieldsOnly?: boolean;
  /** ISO timestamp when task started */
  startedAt?: string;
  /** ISO timestamp when task completed or failed */
  completedAt?: string;
  /** Elapsed milliseconds */
  durationMs?: number;
  /** How many times this task has been attempted */
  attempt: number;
  /** Gaps successfully resolved in this run */
  gapsResolved: number;
  /** Gaps that failed to resolve */
  gapsFailed: number;
  /** Files created by a yields run (relative to project root) */
  yieldsCreated?: string[];
  /** Error message if status is 'failed' */
  error?: string;
  /**
   * Completion checklist: one item per declared output, inline check, and subtask.
   * All items done → task is complete.
   * Used to find the smallest incomplete unit of work on resume.
   */
  checklist: ChecklistItem[];
}

/* ------------------------------------------------------------------ */
/*  Journal API available in task/project contexts              */
export interface JournalAPI {
  /**
   * Get current gaps (from gaps.yml)
   */
  getGaps(): Promise<Gap[]>;

  /**
   * Get gap summary (metadata only, from gaps.yml)
   */
  getSummary(): Promise<GapSummary>;

  /**
   * Read recent log events (from events.jsonl)
   */
  getRecentEvents(count?: number): Promise<JournalEvent[]>;

  /**
   * Find errors in log (from events.jsonl)
   */
  findErrors(): Promise<JournalEvent[]>;

  /**
   * Search log for specific events
   */
  searchLog(options: SearchLogOptions): Promise<JournalEvent[]>;

  /**
   * Read full log with options
   */
  readLog(options?: ReadLogOptions): Promise<JournalEvent[]>;
}
