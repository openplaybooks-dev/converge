/**
 * Structure Rules
 *
 * Validate filesystem expectations: missing files, broken references, path validity.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import type { ValidationRule, ValidationIssue } from "../types.ts";

export const structureRules: ValidationRule[] = [
  {
    id: "folder-name-matches-id",
    layer: "structure",
    severity: "warning",
    description: "Task folder name should match the task id",
    check: ({ shape, taskDir, filePath }) => {
      const folderName = path.basename(taskDir);
      if (shape.id && folderName !== shape.id) {
        return [
          {
            ruleId: "folder-name-matches-id",
            layer: "structure",
            severity: "warning",
            message: `Folder "${folderName}" does not match task id "${shape.id}"`,
            path: filePath,
            field: "id",
            actual: folderName,
            expected: shape.id,
            fix: `Rename folder to "${shape.id}" or set id to "${folderName}"`,
          },
        ];
      }
      return [];
    },
  },

  {
    id: "wbs-script-exists",
    layer: "structure",
    severity: "error",
    description: "WBS script file must exist on disk",
    check: ({ shape, taskDir, filePath }) => {
      if (shape.wbs?.path) {
        const resolved = path.resolve(taskDir, shape.wbs.path);
        if (!existsSync(resolved)) {
          return [
            {
              ruleId: "wbs-script-exists",
              layer: "structure",
              severity: "error",
              message: `wbs.path "${shape.wbs.path}" not found`,
              path: filePath,
              field: "wbs.path",
              actual: shape.wbs.path,
              fix: `Create the file at ${resolved}`,
            },
          ];
        }
      }
      return [];
    },
  },

  {
    id: "executor-script-exists",
    layer: "structure",
    severity: "error",
    description: "Script executor path must exist on disk",
    check: ({ shape, taskDir, filePath }) => {
      if (shape.executor?.type === "script" && shape.executor.path) {
        const resolved = path.resolve(taskDir, shape.executor.path);
        if (!existsSync(resolved)) {
          return [
            {
              ruleId: "executor-script-exists",
              layer: "structure",
              severity: "error",
              message: `executor.path "${shape.executor.path}" not found`,
              path: filePath,
              field: "executor.path",
              actual: shape.executor.path,
              fix: `Create the file at ${resolved}`,
            },
          ];
        }
      }
      return [];
    },
  },

  {
    id: "materials-exist",
    layer: "structure",
    severity: "warning",
    description: "Materials referenced in the task should exist on disk",
    check: ({ shape, projectDir, filePath }) => {
      if (!shape.materials?.length) return [];
      const issues: ValidationIssue[] = [];
      for (const mat of shape.materials) {
        const resolved = path.resolve(projectDir, mat);
        if (!existsSync(resolved)) {
          issues.push({
            ruleId: "materials-exist",
            layer: "structure",
            severity: "warning",
            message: `Material "${mat}" not found`,
            path: filePath,
            field: "materials",
            actual: mat,
            fix: `Create the file at ${resolved} or remove from materials`,
          });
        }
      }
      return issues;
    },
  },

  {
    id: "body-or-skill-required",
    layer: "structure",
    severity: "warning",
    description:
      "Task should have a body, prompt, skills, executor, or wbs to execute",
    check: ({ shape, filePath }) => {
      const hasBody = !!(shape.body || shape.prompt);
      const hasSkills = !!shape.skills?.length;
      const hasExecutor = !!shape.executor;
      const hasWbs = !!shape.wbs;

      if (!hasBody && !hasSkills && !hasExecutor && !hasWbs) {
        return [
          {
            ruleId: "body-or-skill-required",
            layer: "structure",
            severity: "warning",
            message:
              "Task has no body, prompt, skills, executor, or wbs — nothing to execute",
            path: filePath,
            fix: "Add a markdown body, skills array, executor, or wbs config",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "plan-output-path",
    layer: "structure",
    severity: "warning",
    description: "plan.output should be within the project directory",
    check: ({ shape, projectDir, filePath }) => {
      if (shape.plan?.output) {
        const resolved = path.resolve(projectDir, shape.plan.output);
        if (!resolved.startsWith(projectDir)) {
          return [
            {
              ruleId: "plan-output-path",
              layer: "structure",
              severity: "warning",
              message: `plan.output "${shape.plan.output}" resolves outside project directory`,
              path: filePath,
              field: "plan.output",
              actual: shape.plan.output,
              fix: "Use a relative path within the project",
            },
          ];
        }
      }
      return [];
    },
  },

  {
    id: "check-cmd-syntax",
    layer: "structure",
    severity: "warning",
    description: "Check commands should not have common shell syntax errors",
    check: ({ shape, filePath }) => {
      if (!shape.checks?.length) return [];
      const issues: ValidationIssue[] = [];
      for (const c of shape.checks) {
        if (!c.cmd) continue;
        const cmd = c.cmd.trimEnd();
        if (cmd.endsWith("&&") || cmd.endsWith("||") || cmd.endsWith("|")) {
          issues.push({
            ruleId: "check-cmd-syntax",
            layer: "structure",
            severity: "warning",
            message: `Check "${c.id}" command ends with a dangling operator`,
            path: filePath,
            field: `checks.${c.id}.cmd`,
            actual: cmd,
            fix: "Remove the trailing operator or complete the command",
          });
        }
        // Unclosed quotes
        const singleQuotes = (cmd.match(/'/g) || []).length;
        const doubleQuotes = (cmd.match(/"/g) || []).length;
        if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
          issues.push({
            ruleId: "check-cmd-syntax",
            layer: "structure",
            severity: "warning",
            message: `Check "${c.id}" command has unclosed quotes`,
            path: filePath,
            field: `checks.${c.id}.cmd`,
            actual: cmd,
            fix: "Close all quotes in the command",
          });
        }
      }
      return issues;
    },
  },
];
