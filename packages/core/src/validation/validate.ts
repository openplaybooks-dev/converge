/**
 * Validation Entry Points
 *
 * validateTaskMd()  — validate a single TASK.md
 * validateProject() — validate an entire project
 */

import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { glob } from "glob";
import { parseTaskMdString } from "../config/task-md-definition.ts";
import type {
  TaskValidationInput,
  TaskValidationResult,
  ProjectValidationResult,
  ProjectMdValidationResult,
  PlaybookValidationResult,
  AllPlaybooksValidationResult,
  ValidationIssue,
} from "./types.ts";
import { formatRules } from "./rules/format.ts";
import { structureRules } from "./rules/structure.ts";
import { syntaxRules } from "./rules/syntax.ts";
import { projectRules } from "./rules/project.ts";
import { projectMdRules } from "./rules/project-md.ts";
import type { ProjectMdValidationInput } from "./rules/project-md.ts";
import {
  allPlaybookRules,
  type PlaybookValidationContext,
} from "./rules/playbook.ts";
import {
  getPlaybookLayout,
  listFilesRecursive,
  listMarkdownFiles,
  isMarkdownFile as layoutIsMarkdown,
} from "../task/playbook/layout.ts";

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
    ".converge/playbooks/*/TASK.md",
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

/* ------------------------------------------------------------------ */
/*  Playbook Validation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Validate a single playbook against all format, structure, and integrity rules.
 *
 * This is a comprehensive check that runs BEFORE any execution to detect:
 * - Folder contract violations (executables in declarative folders, etc.)
 * - Missing TASK.md files for referenced tasks
 * - Goal file format errors (missing id, missing checks)
 * - Goal dependency graph issues (circular deps, dangling refs)
 * - Template variable inconsistencies
 * - Dangerous check commands (rm -rf, curl|sh)
 * - Unreferenced dead scripts
 * - Duplicate goal IDs
 *
 * Use this to fail fast and prevent runtime hallucinations.
 */
export function validatePlaybook(
  playbookDir: string,
  projectDir?: string,
): PlaybookValidationResult {
  const issues: ValidationIssue[] = [];
  const layout = getPlaybookLayout(playbookDir);
  const projDir = projectDir ?? path.resolve(playbookDir, "../../..");

  // Read playbook.yml
  let def: Record<string, unknown> = {};
  const ymlPath = path.join(playbookDir, "playbook.yml");
  if (existsSync(ymlPath)) {
    try {
      const raw = readFileSync(ymlPath, "utf8");
      const parsed = parseYaml(raw);
      if (parsed && typeof parsed === "object") {
        def = parsed as Record<string, unknown>;
      }
    } catch {
      issues.push({
        ruleId: "playbook-parse-error",
        layer: "format",
        severity: "error",
        message: `Cannot parse playbook.yml: invalid YAML`,
        path: ymlPath,
        fix: "Fix the YAML syntax in playbook.yml",
      });
    }
    // Attach the playbookDir for use in rules
    def._playbookDir = playbookDir;
  } else {
    issues.push({
      ruleId: "playbook-missing-yml",
      layer: "structure",
      severity: "error",
      message: `No playbook.yml found in ${playbookDir}`,
      path: playbookDir,
      fix: "Create a playbook.yml file",
    });
    // Return early — nothing more to validate
    const name = path.basename(playbookDir);
    return {
      name,
      path: playbookDir,
      issues,
      formatIssues: issues.filter((i) => i.layer === "format"),
      structureIssues: issues.filter((i) => i.layer === "structure"),
      integrityIssues: issues.filter((i) => i.layer === "integrity"),
      totalErrors: issues.filter((i) => i.severity === "error").length,
      totalWarnings: issues.filter((i) => i.severity === "warning").length,
      totalInfo: issues.filter((i) => i.severity === "info").length,
      valid: false,
    };
  }

  // Build context
  const ctx: PlaybookValidationContext = {
    playbookDir,
    projectDir: projDir,
    def,
    taskFiles: listFilesRecursive(layout.tasksDir).filter(
      (f) => path.basename(f) === "TASK.md" && layoutIsMarkdown(f),
    ),
    goalFiles: listMarkdownFiles(layout.goalsDir),
    scriptFiles: listFilesRecursive(layout.scriptsDir).filter((f) => {
      const ext = path.extname(f);
      return [".js", ".mjs", ".cjs", ".py", ".sh"].includes(ext);
    }),
    templateFiles: listMarkdownFiles(layout.templatesDir),
  };

  // Run all rules
  for (const rule of allPlaybookRules) {
    try {
      const ruleIssues = rule.check(ctx);
      issues.push(...ruleIssues);
    } catch (err: any) {
      issues.push({
        ruleId: rule.id,
        layer: rule.layer,
        severity: "error",
        message: `Rule "${rule.id}" threw an error: ${err?.message ?? String(err)}`,
        path: playbookDir,
        fix: "Fix the underlying data that caused this rule to fail",
      });
    }
  }

  const name =
    typeof def.name === "string" ? def.name : path.basename(playbookDir);

  return {
    name,
    path: playbookDir,
    issues,
    formatIssues: issues.filter((i) => i.layer === "format"),
    structureIssues: issues.filter((i) => i.layer === "structure"),
    integrityIssues: issues.filter(
      (i) => i.layer === "integrity" || (i as any).layer === "integrity",
    ),
    totalErrors: issues.filter((i) => i.severity === "error").length,
    totalWarnings: issues.filter((i) => i.severity === "warning").length,
    totalInfo: issues.filter((i) => i.severity === "info").length,
    valid: !issues.some((i) => i.severity === "error"),
  };
}

/**
 * Validate all playbooks in a project's .converge/playbooks/ directory.
 *
 * Returns a combined result across all discovered playbooks.
 */
export async function validateAllPlaybooks(
  projectDir: string,
): Promise<AllPlaybooksValidationResult> {
  const playbooksDir = path.join(projectDir, ".converge", "playbooks");
  if (!existsSync(playbooksDir)) {
    return {
      playbooks: [],
      totalErrors: 0,
      totalWarnings: 0,
      totalInfo: 0,
      valid: true,
    };
  }

  const results: PlaybookValidationResult[] = [];
  try {
    const entries = await glob("*", {
      cwd: playbooksDir,
      absolute: false,
    });
    for (const entry of entries) {
      const pbDir = path.join(playbooksDir, entry);
      // glob (the npm package) doesn't have an onlyDirectories option, so we
      // filter here: only descend into entries that have a playbook.yml.
      if (existsSync(path.join(pbDir, "playbook.yml"))) {
        results.push(validatePlaybook(pbDir, projectDir));
      }
    }
  } catch {
    // Fallback: list directories manually
    try {
      const { readdirSync } = await import("node:fs");
      for (const entry of readdirSync(playbooksDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const pbDir = path.join(playbooksDir, entry.name);
        if (existsSync(path.join(pbDir, "playbook.yml"))) {
          results.push(validatePlaybook(pbDir, projectDir));
        }
      }
    } catch {
      // Can't read directory
    }
  }

  const allIssues = results.flatMap((r) => r.issues);
  return {
    playbooks: results,
    totalErrors: results.reduce((sum, r) => sum + r.totalErrors, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.totalWarnings, 0),
    totalInfo: results.reduce((sum, r) => sum + r.totalInfo, 0),
    valid: !allIssues.some((i) => i.severity === "error"),
  };
}
