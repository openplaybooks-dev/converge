/**
 * Discovery System Types
 *
 * Types for the auto-discovery of task, epic, check, and plan files.
 * The scanner finds TypeScript files via glob patterns and registers
 * them automatically — no manual `.task()` / `.epic()` calls needed.
 */

/* ------------------------------------------------------------------ */
/*  Discovered File                                                    */
/* ------------------------------------------------------------------ */

/** The type of contribution a discovered file makes */
export type DiscoveredFileType =
  | "task"
  | "epic"
  | "check"
  | "plan"
  | "skill"
  | "agent";

/**
 * A single file found by the discovery scanner.
 */
export interface DiscoveredFile {
  /** Absolute path to the file */
  filePath: string;

  /** What kind of converge contribution this file exports */
  type: DiscoveredFileType;

  /**
   * All exports from the file (default + named).
   * The scanner checks the `default` export's shape to classify the type.
   */
  exports: Record<string, unknown>;

  /** ISO timestamp when the file was discovered */
  discoveredAt: string;
}

/* ------------------------------------------------------------------ */
/*  Discovery Result                                                   */
/* ------------------------------------------------------------------ */

/**
 * Result of a full discovery scan across all configured patterns.
 */
export interface DiscoveryResult {
  /** All successfully discovered files */
  files: DiscoveredFile[];

  /** ISO timestamp of the scan */
  timestamp: string;

  /**
   * Files that failed to load (import errors).
   * The scanner continues on errors — bad files don't block good ones.
   */
  errors: Array<{ file: string; error: string }>;

  /** The glob patterns that were scanned */
  patterns: string[];

  /** Skill dependency graph (if skills were discovered) */
  skillGraph?: any; // Will be SkillDependencyGraph
}

/* ------------------------------------------------------------------ */
/*  Watch Mode                                                         */
/* ------------------------------------------------------------------ */

/** The type of filesystem change in watch mode */
export type DiscoveryChangeType = "added" | "removed" | "modified";

/**
 * A single filesystem change detected during watch mode.
 */
export interface DiscoveryChangeEvent {
  type: DiscoveryChangeType;
  /** Absolute path to the changed file */
  file: string;
  /** Inferred contribution type for this file */
  discoveryType: DiscoveredFileType;
}
