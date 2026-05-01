/**
 * Planning System Types
 *
 * Defines interfaces for the autonomous planning engine where
 * the filesystem structure (task files) IS the plan.
 */

import type { Gap } from "../task/gap/types.ts";
import type { TaskConfig } from "../storage/types.ts";

/* ------------------------------------------------------------------ */
/*  Plan Generation Configuration                                     */
/* ------------------------------------------------------------------ */

/**
 * Configuration for AI-driven plan generation
 */
export interface PlanGenerationConfig {
  /** High-level objective description */
  objective: string;

  /** Optional constraints to guide planning */
  constraints?: {
    /** Technology stack requirements */
    tech?: string[];
    /** Architecture/style preferences */
    style?: string;
    /** Existing files to consider */
    existing?: string[];
  };

  /** Planning strategy */
  strategy?: "sequential" | "parallel" | "hybrid";

  /** Granularity of task breakdown */
  granularity?: "coarse" | "fine";

  /** Enable dynamic replanning during execution */
  adaptive?: boolean;
}

/**
 * Result of plan generation
 */
export interface PlanGenerationResult {
  /** List of created task file paths */
  files: string[];
  /** Number of tasks created */
  taskCount: number;
  /** Estimated complexity score (0-100) */
  estimatedComplexity: number;
  /** Planning rationale */
  rationale?: string;
}

/* ------------------------------------------------------------------ */
/*  Replanning Configuration                                          */
/* ------------------------------------------------------------------ */

/**
 * Result of replanning operation
 */
export interface ReplanResult {
  /** Newly created task files */
  created: string[];
  /** Modified task files */
  modified: string[];
  /** Renamed task files (old path → new path) */
  renamed: Array<{ from: string; to: string }>;
  /** Deleted task files */
  deleted: string[];
  /** Rationale for replanning decisions */
  rationale: string;
}

/**
 * Triggers for when AI should replan
 */
export enum ReplanTrigger {
  /** No progress after N iterations */
  STALLED_PROGRESS = "stalled-progress",
  /** New requirement/missing system component discovered */
  MAJOR_GAP = "major-gap",
  /** Current plan is inefficient, better approach found */
  BETTER_APPROACH = "better-approach",
  /** Architectural decision blocks current approach */
  BLOCKED_PATH = "blocked-path",
}

/**
 * Context for replanning decisions
 */
export interface ReplanContext {
  /** Current gaps detected */
  gaps: Gap[];
  /** Execution history */
  feedbackHistory: FeedbackHistory;
  /** Reason for replanning */
  trigger: ReplanTrigger;
  /** Number of iterations without progress */
  stallCount?: number;
}

/* ------------------------------------------------------------------ */
/*  Gap Filling                                                       */
/* ------------------------------------------------------------------ */

/**
 * Result of gap-filling operation
 */
export interface GapFillResult {
  /** Newly created task files to fill gaps */
  created: string[];
  /** Where in the sequence new tasks were inserted */
  insertedAfter?: string;
  /** Rationale for gap-filling decisions */
  rationale: string;
}

/**
 * Context for gap-filling
 */
export interface GapFillContext {
  /** Project objective */
  projectObjective: string;
  /** Existing task files */
  existingTasks: string[];
  /** Gaps to fill */
  gaps: Gap[];
}

/* ------------------------------------------------------------------ */
/*  Feedback History (for self-correction)                           */
/* ------------------------------------------------------------------ */

/**
 * History of task execution attempts for self-correction
 */
export interface FeedbackHistory {
  /** Task identifier */
  taskId: string;
  /** List of execution attempts */
  attempts: FeedbackAttempt[];
  /** Detected patterns in failures */
  patterns: {
    /** Errors that recur across attempts */
    recurringErrors: Map<string, number>;
    /** Gaps that persist */
    unresolvedGaps: string[];
    /** Strategies that have been tried */
    attemptedApproaches: string[];
  };
}

/**
 * Single execution attempt record
 */
export interface FeedbackAttempt {
  /** Attempt number (1-indexed) */
  number: number;
  /** When attempt occurred */
  timestamp: string;
  /** Prompt given to AI */
  prompt: string;
  /** Result of execution */
  result: {
    success: boolean;
    message?: string;
    error?: {
      message: string;
      stack?: string;
    };
  };
  /** Gaps detected during execution */
  gaps: Gap[];
  /** Validation issues from verification */
  verificationIssues?: Array<{
    message: string;
    severity: "error" | "warning";
    file?: string;
    line?: number;
  }>;
  /** How long execution took (ms) */
  duration: number;
  /** Auto-generated hints for next attempt */
  selfCorrectionHints?: string[];
}

/* ------------------------------------------------------------------ */
/*  Task File Metadata                                                */
/* ------------------------------------------------------------------ */

/**
 * Metadata extracted from task file
 */
export interface TaskFileMetadata {
  /** File path */
  filePath: string;
  /** Task definition parsed from file */
  task: TaskConfig;
  /** Priority (from numeric prefix) */
  priority: number;
  /** Whether file is valid TypeScript */
  isValid: boolean;
  /** Parse errors if invalid */
  parseErrors?: string[];
}

/* ------------------------------------------------------------------ */
/*  Task Scanner Configuration                                        */
/* ------------------------------------------------------------------ */

/**
 * Configuration for task file scanner
 */
export interface ScannerConfig {
  /** Directory containing task files */
  tasksDir: string;
  /** Directory containing check files */
  checksDir: string;
  /** Enable file watching for hot-reload */
  watch?: boolean;
  /** Automatically register discovered functions */
  autoRegister?: boolean;
  /** Debounce delay for file changes (ms) */
  debounceMs?: number;
}

/**
 * Result of scanning operation
 */
export interface ScanResult {
  /** Discovered task files */
  tasks: TaskFileMetadata[];
  /** Discovered check files */
  checks: Array<{
    file: string;
    checkId: string;
  }>;
  /** Scan timestamp */
  timestamp: string;
  /** Any errors encountered */
  errors?: string[];
}
