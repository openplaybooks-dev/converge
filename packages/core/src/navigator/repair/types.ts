/**
 * Repair System — Core Types
 *
 * Defines the FixStrategy interface and supporting types for the
 * composable gap resolution pipeline.
 *
 * Design: every fix strategy is a small, independently testable class
 * that implements `canHandle()` + `tryFix()`. The pipeline calls them
 * in priority order until one succeeds or all are exhausted.
 */

import type { Gap } from "../../task/gap/types.ts";
import type { ExecutionTimeline } from "./timeline.ts";

/* ------------------------------------------------------------------ */
/*  Journal context                                                    */
/* ------------------------------------------------------------------ */

/**
 * Identifies the task whose journal should receive events.
 * Defined here (not in gap-fixer.ts) so all repair code can share it.
 */
export interface JournalContext {
  epicId: string;
  taskId: string;
}

/* ------------------------------------------------------------------ */
/*  Strategy outcome                                                   */
/* ------------------------------------------------------------------ */

/**
 * Retry mode for successful repairs - controls what happens after fix
 */
export type RetryMode =
  | "full" // Full task re-execution (new attempt) - DEFAULT
  | "validate" // Just rerun validation checks (no new attempt)
  | "none" // No retry needed (fix is self-sufficient)
  | "rerun" // Re-execute the task (e.g., after user answer received)
  | {
      // Backoff: Run dependencies first, then retry current task
      type: "backoff";
      runFirst: string[]; // Task IDs that must run before retrying current task
      reason: string; // Human-readable explanation
    };

/**
 * Strategy outcome - result of a fix attempt
 */
export type StrategyOutcome =
  | {
      success: true;
      reason: string;
      retryMode?: RetryMode; // Defaults to 'full' if omitted
      metadata?: Record<string, unknown>;
    }
  | {
      success: false;
      reason: string;
      shouldRetry?: boolean; // Controls retry within same strategy
      metadata?: Record<string, unknown>;
    };

/* ------------------------------------------------------------------ */
/*  Strategy context (passed to tryFix)                               */
/* ------------------------------------------------------------------ */

export interface StrategyContext {
  projectDir: string;
  journalCtx: JournalContext;
  timeline: ExecutionTimeline;
  /** 1-based attempt number across all strategies in this resolution call */
  attempt: number;
  /** AI context for running agents (lazy-initialized) */
  ai?: () => import("../../ai/context.ts").AIContext;
  /** Filesystem helpers (lazy-initialized) */
  filesystem?: () => FilesystemHelper;
  /** Task metadata access (lazy-initialized) */
  task?: () => TaskHelper;
}

/* ------------------------------------------------------------------ */
/*  Helper interfaces                                                 */
/* ------------------------------------------------------------------ */

/**
 * Filesystem helper for safe file operations
 * All methods are async and handle errors gracefully
 */
export interface FilesystemHelper {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDirectory(path: string, pattern?: string): Promise<string[]>;
  createSymlink(target: string, link: string): Promise<void>;
  updateSkillMd(path: string, updates: Partial<TaskDefinition>): Promise<void>;
  removeDirectory(path: string): Promise<void>;
  removeFile(path: string): Promise<void>;
}

/**
 * Task metadata helper for accessing task information
 */
export interface TaskHelper {
  getDefinition(taskId: string): Promise<TaskDefinition>;
  getLogTail(taskId: string, lines?: number): Promise<string[]>;
  getAttempts(taskId: string): Promise<AttemptRecord[]>;
  getSkillPath(taskId: string): string;
}

/**
 * Task definition (simplified from SKILL.md frontmatter)
 */
export interface TaskDefinition {
  name: string;
  inputs?: string[];
  outputs?: string[];
  checks?: Array<{
    id: string;
    cmd: string;
    description?: string;
  }>;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  FixStrategy interface                                              */
/* ------------------------------------------------------------------ */

/**
 * A single gap-fix approach. Strategies are composed by GapResolutionPipeline,
 * which calls them in order until one succeeds.
 *
 * Keep implementations small: one responsibility, one file.
 */
export interface FixStrategy {
  /** Stable, human-readable name used in attempt logs */
  readonly name: string;

  /**
   * Quick guard: should this strategy even attempt this gap?
   * Typically checks `gap.metadata.gapKind`.
   * Must be synchronous for fast filtering.
   */
  canHandle(gap: Gap): boolean;

  /**
   * Execute the strategy.
   * - Return `{ success: true }` if the gap is resolved.
   * - Return `{ success: false, reason }` to let the pipeline try the next strategy.
   * - Throw only for truly unexpected errors; prefer returning `{ success: false }`.
   */
  tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome>;

  /**
   * Called AFTER wip is fresh and BEFORE the agent runs.
   * Use to read previous attempt archives and inject failure context into the new wip.
   * @param prevAttemptDirs Sorted list of archived attempt dirs (01/, 02/, etc.)
   */
  preTask?(
    gap: Gap,
    ctx: StrategyContext,
    prevAttemptDirs: string[],
  ): Promise<void>;

  /**
   * Called AFTER tryFix returns.
   * Use to write LEARN.md or other feedback files for the next attempt.
   */
  postTask?(
    gap: Gap,
    ctx: StrategyContext,
    outcome: StrategyOutcome,
  ): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Attempt record                                                     */
/* ------------------------------------------------------------------ */

/** Persisted to `attempts.jsonl` for observability and test assertions. */
export interface AttemptRecord {
  gapId: string;
  strategyName: string;
  /** 1-based */
  attempt: number;
  startedAt: string;
  durationMs: number;
  outcome: StrategyOutcome;
}

/* ------------------------------------------------------------------ */
/*  Resolution result                                                  */
/* ------------------------------------------------------------------ */

/** Returned by `GapResolutionPipeline.resolve()`. */
export interface Resolution {
  success: boolean;
  /** Name of the strategy that succeeded, if any. */
  strategyName?: string;
  attempts: AttemptRecord[];
  durationMs: number;
  /** Retry mode from successful strategy - controls what happens next */
  retryMode?: RetryMode;
  /** Metadata from successful strategy (e.g., completion signals) */
  metadata?: Record<string, unknown>;
}
