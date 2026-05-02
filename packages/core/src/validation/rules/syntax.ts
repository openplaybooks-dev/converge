/**
 * Syntax Rules
 *
 * Validate semantic issues, contradictions, and logical inconsistencies.
 */

import type { ValidationRule, ValidationIssue } from "../types.ts";

export const syntaxRules: ValidationRule[] = [
  {
    id: "executor-and-seeds-conflict",
    layer: "syntax",
    severity: "error",
    description: "executor and seeds are mutually exclusive",
    check: ({ shape, filePath }) => {
      if (shape.executor && shape.seeds?.length) {
        return [
          {
            ruleId: "executor-and-seeds-conflict",
            layer: "syntax",
            severity: "error",
            message:
              "Both `executor` and `seeds` are declared — they are mutually exclusive",
            path: filePath,
            fix: "Remove one of `executor` or `seeds`",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "executor-and-skills-conflict",
    layer: "syntax",
    severity: "warning",
    description:
      "script/function executor with skills array — skills will not be used",
    check: ({ shape, filePath }) => {
      if (
        shape.executor &&
        (shape.executor.type === "script" ||
          shape.executor.type === "function") &&
        shape.skills?.length
      ) {
        return [
          {
            ruleId: "executor-and-skills-conflict",
            layer: "syntax",
            severity: "warning",
            message: `executor.type is "${shape.executor.type}" but skills are also declared — skills will not be used`,
            path: filePath,
            field: "skills",
            fix: 'Remove skills or change executor.type to "ai"',
          },
        ];
      }
      return [];
    },
  },

  {
    id: "blocking-without-outputs",
    layer: "syntax",
    severity: "warning",
    description: "blocking: true but no outputs declared",
    check: ({ shape, filePath }) => {
      if (
        shape.blocking === true &&
        (!shape.outputs || shape.outputs.length === 0)
      ) {
        return [
          {
            ruleId: "blocking-without-outputs",
            layer: "syntax",
            severity: "warning",
            message:
              "`blocking: true` but no outputs declared — nothing to block on",
            path: filePath,
            field: "blocking",
            fix: "Add outputs or remove `blocking: true`",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "dependency-self-reference",
    layer: "syntax",
    severity: "error",
    description: "dependencies must not reference own task id",
    check: ({ shape, filePath }) => {
      if (shape.id && shape.dependencies?.includes(shape.id)) {
        return [
          {
            ruleId: "dependency-self-reference",
            layer: "syntax",
            severity: "error",
            message: `dependencies contains own id "${shape.id}"`,
            path: filePath,
            field: "dependencies",
            actual: shape.id,
            fix: "Remove self-reference from dependencies",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "duplicate-check-ids",
    layer: "syntax",
    severity: "error",
    description: "checks array must not have duplicate id values",
    check: ({ shape, filePath }) => {
      if (!shape.checks?.length) return [];
      const seen = new Set<string>();
      const issues: ValidationIssue[] = [];
      for (const c of shape.checks) {
        if (seen.has(c.id)) {
          issues.push({
            ruleId: "duplicate-check-ids",
            layer: "syntax",
            severity: "error",
            message: `Duplicate check id "${c.id}"`,
            path: filePath,
            field: "checks",
            actual: c.id,
            fix: `Rename one of the "${c.id}" checks to be unique`,
          });
        }
        seen.add(c.id);
      }
      return issues;
    },
  },

  {
    id: "duplicate-output-paths",
    layer: "syntax",
    severity: "warning",
    description: "outputs array should not have duplicate entries",
    check: ({ shape, filePath }) => {
      if (!shape.outputs?.length) return [];
      const seen = new Set<string>();
      const issues: ValidationIssue[] = [];
      for (const o of shape.outputs) {
        if (seen.has(o)) {
          issues.push({
            ruleId: "duplicate-output-paths",
            layer: "syntax",
            severity: "warning",
            message: `Duplicate output path "${o}"`,
            path: filePath,
            field: "outputs",
            actual: o,
            fix: "Remove the duplicate entry",
          });
        }
        seen.add(o);
      }
      return issues;
    },
  },

  {
    id: "check-without-cmd",
    layer: "syntax",
    severity: "info",
    description: "Check entry has no cmd (declaration-only)",
    check: ({ shape, filePath }) => {
      if (!shape.checks?.length) return [];
      const issues: ValidationIssue[] = [];
      for (const c of shape.checks) {
        if (!c.cmd) {
          issues.push({
            ruleId: "check-without-cmd",
            layer: "syntax",
            severity: "info",
            message: `Check "${c.id}" has no cmd — declaration-only`,
            path: filePath,
            field: `checks.${c.id}`,
          });
        }
      }
      return issues;
    },
  },

  {
    id: "empty-skills-array",
    layer: "syntax",
    severity: "warning",
    description: "skills is an empty array — should be omitted or populated",
    check: ({ shape, rawFrontmatter, filePath }) => {
      if (
        rawFrontmatter.skills !== undefined &&
        Array.isArray(rawFrontmatter.skills) &&
        rawFrontmatter.skills.length === 0
      ) {
        return [
          {
            ruleId: "empty-skills-array",
            layer: "syntax",
            severity: "warning",
            message: "`skills` is an empty array — omit or populate it",
            path: filePath,
            field: "skills",
            fix: "Remove the empty `skills: []` or add skill names",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "inputs-outputs-overlap",
    layer: "syntax",
    severity: "error",
    description: "Inputs and outputs must not list the same path",
    check: ({ shape, filePath }) => {
      if (!shape.inputs?.length || !shape.outputs?.length) return [];
      const inputSet = new Set(shape.inputs);
      const issues: ValidationIssue[] = [];
      for (const output of shape.outputs) {
        if (inputSet.has(output)) {
          issues.push({
            ruleId: "inputs-outputs-overlap",
            layer: "syntax",
            severity: "error",
            message: `Path "${output}" is listed in both inputs and outputs`,
            path: filePath,
            field: "outputs",
            actual: output,
            fix: "Remove the path from either inputs or outputs",
          });
        }
      }
      return issues;
    },
  },

  {
    id: "body-and-prompt-both-set",
    layer: "syntax",
    severity: "info",
    description: "Both body and prompt are set — prompt is an alias for body",
    check: ({ shape, filePath }) => {
      if (shape.body && shape.prompt) {
        return [
          {
            ruleId: "body-and-prompt-both-set",
            layer: "syntax",
            severity: "info",
            message:
              "Both `body` and `prompt` are set — `prompt` is an alias for `body`",
            path: filePath,
            fix: "Use only one of `body` (markdown section) or `prompt` (frontmatter)",
          },
        ];
      }
      return [];
    },
  },
];
