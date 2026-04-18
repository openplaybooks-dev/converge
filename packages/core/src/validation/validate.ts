/**
 * Validation Entry Points
 *
 * validateTaskMd()  — validate a single TASK.md
 * validateProject() — validate an entire project
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { glob } from "glob";
import { parseTaskMdString } from "../config/task-md-definition.ts";
import type { TaskMdShape } from "../config/task-md-definition.ts";
import type {
  TaskValidationInput,
  TaskValidationResult,
  ProjectValidationResult,
  ProjectMdValidationResult,
  ValidationIssue,
} from "./types.ts";
import { formatRules } from "./rules/format.ts";
import { structureRules } from "./rules/structure.ts";
import { syntaxRules } from "./rules/syntax.ts";
import { projectRules } from "./rules/project.ts";
import { projectMdRules } from "./rules/project-md.ts";
import type { ProjectMdValidationInput } from "./rules/project-md.ts";

/* ------------------------------------------------------------------ */
/*  Single task validation                                              */
/* ------------------------------------------------------------------ */

/**
 * Validate a single TASK.md given pre-parsed input.
 */
export function validateTaskMd(
  input: TaskValidationInput,
): TaskValidationResult {
  const allRules = [...formatRules, ...structureRules, ...syntaxRules];
  const issues: ValidationIssue[] = [];

  for (const rule of allRules) {
    issues.push(...rule.check(input));
  }

  return {
    taskId: input.shape.id || "(unknown)",
    path: input.filePath,
    issues,
    valid: issues.every((i) => i.severity !== "error"),
  };
}

/* ------------------------------------------------------------------ */
/*  Raw frontmatter parser                                              */
/* ------------------------------------------------------------------ */

/**
 * Parse raw YAML frontmatter from a TASK.md file without type coercion.
 */
function parseRawFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  try {
    const parsed = parseYaml(match[1]);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Invalid YAML
  }
  return {};
}

/* ------------------------------------------------------------------ */
/*  Build TaskValidationInput from a TASK.md file                       */
/* ------------------------------------------------------------------ */

/**
 * Build a TaskValidationInput from a TASK.md file path.
 */
async function buildInput(
  filePath: string,
  projectDir: string,
): Promise<TaskValidationInput | null> {
  if (!existsSync(filePath)) return null;

  try {
    const content = await readFile(filePath, "utf8");
    const rawFrontmatter = parseRawFrontmatter(content);
    const shape = parseTaskMdString(content);
    const taskDir = path.dirname(filePath);

    return {
      shape,
      rawFrontmatter,
      filePath,
      taskDir,
      projectDir,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  PROJECT.md validation                                               */
/* ------------------------------------------------------------------ */

/**
 * Validate a PROJECT.md file. Returns issues found in the frontmatter.
 */
export function validateProjectMd(
  input: ProjectMdValidationInput,
): ProjectMdValidationResult {
  const issues: ValidationIssue[] = [];
  for (const rule of projectMdRules) {
    issues.push(...rule.check(input));
  }
  return {
    path: input.filePath,
    issues,
    valid: issues.every((i) => i.severity !== "error"),
  };
}

/**
 * Validate a PROJECT.md file by path.
 * Convenience wrapper that reads and parses the file.
 */
export async function validateProjectMdFile(
  filePath: string,
): Promise<ProjectMdValidationResult | null> {
  if (!existsSync(filePath)) return null;

  try {
    const content = await readFile(filePath, "utf8");
    const frontmatter = parseRawFrontmatter(content);
    return validateProjectMd({ frontmatter, filePath });
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Project validation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Validate all TASK.md files in a project (and PROJECT.md if present).
 */
export async function validateProject(
  projectDir: string,
): Promise<ProjectValidationResult> {
  // Discover TASK.md files
  const mdPatterns = [
    ".converge/epics/**/*/TASK.md",
    ".converge/epics/**/*/tasks/**/TASK.md",
    ".converge/playbooks/*/tasks/**/TASK.md",
  ];

  const mdFiles: string[] = [];
  for (const pattern of mdPatterns) {
    const matches = await glob(pattern, {
      cwd: projectDir,
      absolute: true,
      ignore: [
        "**/node_modules/**",
        "**/templates/**",
        "**/examples/**",
        "**/scripts/**",
        "**/materials/**",
      ],
    });
    mdFiles.push(...matches);
  }

  // Deduplicate
  const taskFiles = [...new Set(mdFiles)];

  // Parse all tasks
  const inputs: TaskValidationInput[] = [];
  for (const filePath of taskFiles) {
    const input = await buildInput(filePath, projectDir);
    if (input) inputs.push(input);
  }

  // Validate each task
  const tasks: TaskValidationResult[] = inputs.map((input) =>
    validateTaskMd(input),
  );

  // Parse PROJECT.md frontmatter early so project rules can use it
  const projectMdPath = path.join(projectDir, ".converge", "PROJECT.md");
  let projectMdFrontmatter: Record<string, unknown> | undefined;
  if (existsSync(projectMdPath)) {
    try {
      const content = await readFile(projectMdPath, "utf8");
      projectMdFrontmatter = parseRawFrontmatter(content);
    } catch {
      // Can't read — skip
    }
  }

  // Run project-level rules
  const projectIssues: ValidationIssue[] = [];
  for (const rule of projectRules) {
    projectIssues.push(...rule.check(inputs, projectDir, projectMdFrontmatter));
  }

  // Validate PROJECT.md if present
  let projectMd: ProjectMdValidationResult | undefined;
  const projectMdResult = await validateProjectMdFile(projectMdPath);
  if (projectMdResult) {
    projectMd = projectMdResult;
    projectIssues.push(...projectMdResult.issues);
  }

  // Aggregate
  let totalErrors = projectIssues.filter((i) => i.severity === "error").length;
  let totalWarnings = projectIssues.filter(
    (i) => i.severity === "warning",
  ).length;
  for (const t of tasks) {
    totalErrors += t.issues.filter((i) => i.severity === "error").length;
    totalWarnings += t.issues.filter((i) => i.severity === "warning").length;
  }

  return {
    tasks,
    projectIssues,
    projectMd,
    totalErrors,
    totalWarnings,
    valid: totalErrors === 0,
  };
}

/**
 * Validate a single TASK.md file by path.
 * Convenience wrapper that reads and parses the file.
 */
export async function validateTaskMdFile(
  filePath: string,
  projectDir: string,
): Promise<TaskValidationResult | null> {
  const input = await buildInput(filePath, projectDir);
  if (!input) return null;
  return validateTaskMd(input);
}
