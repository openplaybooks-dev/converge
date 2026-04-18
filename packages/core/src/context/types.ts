/**
 * Context Types - Immutable Context Hierarchy
 *
 * Provides clean, immutable contexts for function-driven execution.
 * Each level (Project → Epic → Task) has isolated state with read-only
 * access to parent context.
 *
 * Context Hierarchy:
 *   ProjectContext → EpicContext → TaskContext
 */

import type { Gap, CheckResult, EvalResult } from "../gap/types.ts";
import type {
  ProjectConfig,
  EpicConfig,
  TaskConfig,
  EpicStatus,
  TaskStatus,
} from "../storage/types.ts";
import type { JournalAPI } from "../journal/types.ts";
import type { ArtifactAPI } from "../artifacts/index.ts";

/* ------------------------------------------------------------------ */
/*  Base Context                                                      */
/* ------------------------------------------------------------------ */

/**
 * Base context shared by all levels
 */
export interface BaseContext {
  /** Project root directory */
  readonly projectDir: string;

  /** .converge/ directory */
  readonly convergeDir: string;

  /** Variables accessible at this level */
  readonly vars: Readonly<Record<string, unknown>>;

  /** Filesystem operations */
  readonly fs: FileSystemAPI;

  /** Shell command execution */
  readonly shell: ShellAPI;

  /** Git operations */
  readonly git: GitAPI;

  /** Logger */
  readonly log: LoggerAPI;

  /** Artifact store — named file artifacts with key→path lookup */
  readonly artifact: ArtifactAPI;
}

/* ------------------------------------------------------------------ */
/*  Project Context                                                   */
/* ------------------------------------------------------------------ */

/**
 * Project-level context
 * Top-level context for project-wide operations
 */
export interface ProjectContext extends BaseContext {
  /** Context level */
  readonly level: "project";

  /** Project configuration */
  readonly config: Readonly<ProjectConfig>;

  /** Evaluation API */
  readonly eval: EvalAPI;

  /** Planning API */
  readonly plan: PlanAPI;

  /** Plugin API */
  readonly plugins: PluginAPI;

  /** Check execution API */
  readonly check: CheckAPI;

  /** Journal API for reading gaps and logs */
  readonly journal: JournalAPI;
}

/* ------------------------------------------------------------------ */
/*  Epic Context                                                      */
/* ------------------------------------------------------------------ */

/**
 * Epic-level context
 * Inherits from ProjectContext with epic-specific state
 */
export interface EpicContext extends BaseContext {
  /** Context level */
  readonly level: "epic";

  /** Epic ID */
  readonly epicId: string;

  /** Epic configuration */
  readonly config: Readonly<EpicConfig>;

  /** Epic runtime status */
  readonly status: Readonly<EpicStatus>;

  /** Read-only reference to parent project context */
  readonly project: Readonly<ProjectContext>;

  /** Execution stack for cursor tracking (tree traversal position) */
  readonly executionStack?: ReadonlyArray<ExecutionStackLevel>;

  /** Evaluation API (epic-scoped) */
  readonly eval: EvalAPI;

  /** Planning API (epic-scoped) */
  readonly plan: PlanAPI;

  /** Check execution API */
  readonly check: CheckAPI;

  /** Journal API for reading gaps and logs */
  readonly journal: JournalAPI;
}

/* ------------------------------------------------------------------ */
/*  Task Context                                                      */
/* ------------------------------------------------------------------ */

/**
 * Execution stack level for cursor tracking
 */
export interface ExecutionStackLevel {
  id: string;
  type: "epic" | "task" | "subtask";
  filePath: string;
  depth: number;
}

/**
 * Task-level context
 * Inherits from EpicContext with task-specific state
 */
export interface TaskContext extends BaseContext {
  /** Context level */
  readonly level: "task";

  /** Task ID */
  readonly taskId: string;

  /** Task configuration */
  readonly config: Readonly<TaskConfig>;

  /** Task runtime status */
  readonly status: Readonly<TaskStatus>;

  /** Read-only reference to parent epic context */
  readonly epic: Readonly<EpicContext>;

  /** Read-only reference to grandparent project context */
  readonly project: Readonly<ProjectContext>;

  /** Execution stack for cursor tracking (tree traversal position) */
  readonly executionStack?: ReadonlyArray<ExecutionStackLevel>;

  /** Check execution API */
  readonly check: CheckAPI;

  /** Journal API for reading gaps and logs */
  readonly journal: JournalAPI;
}

/* ------------------------------------------------------------------ */
/*  Filesystem API                                                    */
/* ------------------------------------------------------------------ */

/**
 * Filesystem operations available in context
 */
export interface FileSystemAPI {
  /** Read file content */
  read(path: string): Promise<string>;

  /** Write file content */
  write(path: string, content: string): Promise<void>;

  /** Check if file/directory exists */
  exists(path: string): Promise<boolean>;

  /** List files in directory */
  list(path: string, pattern?: string): Promise<string[]>;

  /** Create directory */
  mkdir(path: string): Promise<void>;

  /** Delete file/directory */
  rm(path: string, recursive?: boolean): Promise<void>;

  /** Copy file/directory */
  copy(src: string, dest: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Shell API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Shell command execution
 */
export interface ShellAPI {
  /** Execute shell command */
  exec(command: string, options?: ShellExecOptions): Promise<ShellResult>;

  /** Execute shell command and stream output */
  stream(command: string, options?: ShellExecOptions): Promise<void>;
}

export interface ShellExecOptions {
  /** Working directory */
  cwd?: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** Command timeout (ms) */
  timeout?: number;

  /** Capture stdout/stderr */
  capture?: boolean;
}

export interface ShellResult {
  /** Exit code */
  exitCode: number;

  /** Standard output */
  stdout: string;

  /** Standard error */
  stderr: string;

  /** Whether command succeeded (exitCode === 0) */
  success: boolean;
}

/* ------------------------------------------------------------------ */
/*  Git API                                                           */
/* ------------------------------------------------------------------ */

/**
 * Git operations
 */
export interface GitAPI {
  /** Get current commit hash */
  getCurrentCommit(): Promise<string>;

  /** Get current branch name */
  getCurrentBranch(): Promise<string>;

  /** Check if working tree is clean */
  isClean(): Promise<boolean>;

  /** Get list of modified files */
  getModifiedFiles(): Promise<string[]>;

  /** Get file diff */
  getDiff(file: string): Promise<string>;

  /** Commit changes */
  commit(message: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Logger API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Logging operations
 */
export interface LoggerAPI {
  /** Log debug message */
  debug(message: string, meta?: Record<string, unknown>): void;

  /** Log info message */
  info(message: string, meta?: Record<string, unknown>): void;

  /** Log warning message */
  warn(message: string, meta?: Record<string, unknown>): void;

  /** Log error message */
  error(message: string, meta?: Record<string, unknown>): void;

  /** Create child logger with prefix */
  child(prefix: string): LoggerAPI;
}

/* ------------------------------------------------------------------ */
/*  Evaluation API                                                    */
/* ------------------------------------------------------------------ */

/**
 * Gap evaluation operations
 */
export interface EvalAPI {
  /** Run all checks and detect gaps */
  detectGaps(): Promise<EvalResult>;

  /** Run specific checks */
  runChecks(checks: string[]): Promise<CheckResult[]>;

  /** Get current gaps */
  getCurrentGaps(): Promise<Gap[]>;

  /** Compare current state to target invariants */
  compareInvariants(invariants: string[]): Promise<Gap[]>;
}

/* ------------------------------------------------------------------ */
/*  Planning API                                                      */
/* ------------------------------------------------------------------ */

/**
 * Planning operations
 */
export interface PlanAPI {
  /** Generate tasks from gaps */
  generateTasks(gaps: Gap[]): Promise<TaskConfig[]>;

  /** Get next actionable tasks */
  getNextTasks(): Promise<TaskConfig[]>;

  /** Check if epic is complete (all gaps resolved) */
  isComplete(): Promise<boolean>;

  /**
   * Get absolute path to a plan file from another task
   * @param relativePath - Relative path like '../001-analyze-data-models/plan.md'
   * @returns Absolute path to the plan file
   */
  getPlanPath(relativePath: string): string;
}

/* ------------------------------------------------------------------ */
/*  Check API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Check execution (task-level only)
 */
export interface CheckAPI {
  /** Run a specific check */
  run(checkName: string): Promise<CheckResult>;

  /** Run all configured checks for this task */
  runAll(): Promise<CheckResult[]>;

  /** Validate task outputs */
  validateOutputs(): Promise<CheckResult>;
}

/* ------------------------------------------------------------------ */
/*  Plugin API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Plugin operations (project-level only)
 */
export interface PluginAPI {
  /** Get loaded plugins */
  getLoaded(): string[];

  /** Check if plugin is loaded */
  has(pluginName: string): boolean;

  /** Get plugin configuration */
  getConfig(pluginName: string): Record<string, unknown> | undefined;

  /** Get checks contributed by plugins */
  getChecks(): Record<string, unknown>;

  /** Get task types contributed by plugins */
  getTaskTypes(): string[];
}
