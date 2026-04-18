/**
 * Validation Types
 *
 * Core types for the rule-based TASK.md and project validation system.
 */

import type { TaskMdShape } from "../config/task-md-definition.ts";

/** Severity levels */
export type Severity = "error" | "warning" | "info";

/** Validation layers — what aspect of the definition is checked */
export type ValidationLayer = "format" | "structure" | "syntax";

/** A single validation issue found by a rule */
export interface ValidationIssue {
  ruleId: string;
  layer: ValidationLayer;
  severity: Severity;
  message: string;
  /** File path (absolute or relative) where the issue was found */
  path?: string;
  /** YAML key or field name (e.g., "executor.type") */
  field?: string;
  /** The actual value that triggered the issue */
  actual?: unknown;
  /** What was expected */
  expected?: string;
  /** Suggested fix (human-readable) */
  fix?: string;
}

/** Result from validating a single TASK.md */
export interface TaskValidationResult {
  taskId: string;
  path: string;
  issues: ValidationIssue[];
  valid: boolean; // true if no errors (warnings/info allowed)
}

/** Result from validating a PROJECT.md file */
export interface ProjectMdValidationResult {
  path: string;
  issues: ValidationIssue[];
  valid: boolean; // true if no errors
}

/** Result from validating the entire project */
export interface ProjectValidationResult {
  tasks: TaskValidationResult[];
  projectIssues: ValidationIssue[]; // cross-task issues + PROJECT.md issues
  projectMd?: ProjectMdValidationResult; // PROJECT.md validation result (if file exists)
  totalErrors: number;
  totalWarnings: number;
  valid: boolean; // true if totalErrors === 0
}

/** A validation rule — the core unit */
export interface ValidationRule {
  id: string;
  layer: ValidationLayer;
  severity: Severity;
  description: string;
  /** Run against a single task */
  check: (task: TaskValidationInput) => ValidationIssue[];
}

/** A project-level validation rule */
export interface ProjectValidationRule {
  id: string;
  layer: ValidationLayer;
  severity: Severity;
  description: string;
  /** Run against all tasks in the project */
  check: (
    tasks: TaskValidationInput[],
    projectDir: string,
    projectMd?: Record<string, unknown>,
  ) => ValidationIssue[];
}

/** Input to validation rules — parsed TASK.md plus filesystem metadata */
export interface TaskValidationInput {
  shape: TaskMdShape;
  /** Raw frontmatter (before sub-parsers coerce values) */
  rawFrontmatter: Record<string, unknown>;
  /** Absolute path to TASK.md file */
  filePath: string;
  /** Task directory path */
  taskDir: string;
  /** Project root directory */
  projectDir: string;
}
