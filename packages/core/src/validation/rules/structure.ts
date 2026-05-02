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
    id: "seed-script-exists",
    layer: "structure",
    severity: "error",
    description: "Seed script file must exist on disk",
    check: ({ shape, taskDir, filePath }) => {
      if (shape.seeds?.length) {
        for (const seed of shape.seeds) {
          if (seed.type !== "seed" && seed.path) {
            const resolved = path.resolve(taskDir, seed.path);
            if (!existsSync(resolved)) {
              return [
                {
                  ruleId: "seed-script-exists",
                  layer: "structure",
                  severity: "error",
                  message: `seeds.path "${seed.path}" not found`,
                  path: filePath,
                  field: "seeds.path",
                  actual: seed.path,
                  fix: `Create the file at ${resolved}`,
                },
              ];
            }
          }
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
    id: "inputs-not-self-referential",
    layer: "structure",
    severity: "warning",
    description: "Inputs and outputs should not overlap — a task should not produce what it consumes",
    check: ({ shape, filePath }) => {
      if (!shape.inputs?.length || !shape.outputs?.length) return [];
      const inputSet = new Set(shape.inputs);
      const issues: ValidationIssue[] = [];
      for (const output of shape.outputs) {
        if (inputSet.has(output)) {
          issues.push({
            ruleId: "inputs-not-self-referential",
            layer: "structure",
            severity: "warning",
            message: `"${shape.id}" lists "${output}" as both an input and an output`,
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
    id: "body-or-skill-required",
    layer: "structure",
    severity: "warning",
    description:
      "Task should have a body, prompt, skills, executor, or seeds to execute",
    check: ({ shape, filePath }) => {
      const hasBody = !!(shape.body || shape.prompt);
      const hasSkills = !!shape.skills?.length;
      const hasExecutor = !!shape.executor;
      const hasSeeds = !!shape.seeds?.length;

      if (!hasBody && !hasSkills && !hasExecutor && !hasSeeds) {
        return [
          {
            ruleId: "body-or-skill-required",
            layer: "structure",
            severity: "warning",
            message:
              "Task has no body, prompt, skills, executor, or seeds — nothing to execute",
            path: filePath,
            fix: "Add a markdown body, skills array, executor, or seeds config",
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

  // ──────────────────────────────────────────────────────────────────
  // Mixed-shape lint: a task that mixes "create new file X" checks with
  // "no occurrences of pattern Y in tree" checks will systematically need
  // ≥2 attempts to converge — the first attempt creates files, the second
  // begins the cleanup. Often takes 3–4 because the negation set shrinks
  // file-by-file. Encourage authors to split these into a creator task and
  // a cleanup task.
  // ──────────────────────────────────────────────────────────────────
  {
    id: "mixed-shape-checks",
    layer: "structure",
    severity: "warning",
    description:
      "Task mixes file-creation checks with tree-wide pattern-negation checks",
    check: ({ shape, filePath }) => {
      const checks = shape.checks as
        | Array<{ id?: string; cmd?: string }>
        | undefined;
      if (!checks || checks.length < 2) return [];

      // "Existence" check: starts with `test -f` or `test -d`, optionally
      // wrapped in a single quoted path. (Negated with `!` is excluded —
      // that's a deletion-verification check, which is itself negation.)
      const existenceRe = /^\s*test\s+-[fd]\s+/;
      // "Tree-negation" check: any of the common shapes —
      //   test -z "$(grep -r ... )"
      //   ! grep -rq ...
      //   grep -rl ... | wc -l | xargs test 0 -eq
      //   find ... -type f | wc -l | xargs test 0 -eq
      // Use a substring heuristic that captures the recursive scan + zero-result test.
      const negationRe =
        /(test\s+-z\s+"?\$\(\s*(grep|find)\s|^\s*!\s*(grep|find)\s|(grep|find)\s+-r[^|]*\|\s*wc\s+-l\s*\|\s*xargs\s+test\s+0\s+-eq)/m;

      const existenceChecks: string[] = [];
      const negationChecks: string[] = [];
      for (const c of checks) {
        const cmd = (c?.cmd ?? "").trim();
        if (!cmd) continue;
        if (existenceRe.test(cmd)) existenceChecks.push(c.id ?? "?");
        else if (negationRe.test(cmd)) negationChecks.push(c.id ?? "?");
      }

      if (existenceChecks.length === 0 || negationChecks.length === 0) {
        return [];
      }

      return [
        {
          ruleId: "mixed-shape-checks",
          layer: "structure",
          severity: "warning",
          message: `Task mixes existence checks (${existenceChecks.join(", ")}) with tree-wide negation checks (${negationChecks.join(", ")}). This shape systematically needs ≥2 attempts to converge.`,
          path: filePath,
          field: "checks",
          fix: "Split into two sibling tasks: a creator task with the existence checks, and a follow-up cleanup task with the negation checks. See troubleshooting recipe #13.",
        },
      ];
    },
  },

  // ────────────────────────────────────────────────────────────────────
  // Suspicious-regex lint for check `cmd:` strings.
  //
  // Catches two regex bugs that have bitten us in real runs:
  //   1. BSD-grep `-E` alternation containing a bare `+` between pipes
  //      (e.g. 'Done|+|installed') — this fails on macOS with a cryptic
  //      "repetition-operator operand invalid" error.
  //   2. Quantifier-as-literal mistakes — sequences of two or more `.`
  //      characters between `grep` and the pattern (e.g.
  //      `redirect..../playbooks.`) which usually meant `redirect.*'/playbooks'`
  //      but are interpreted as exact-character placeholders, causing
  //      false negatives.
  // ────────────────────────────────────────────────────────────────────
  {
    id: "suspicious-check-regex",
    layer: "structure",
    severity: "warning",
    description: "Check command contains a regex pattern that often misfires",
    check: ({ shape, filePath }) => {
      const checks = shape.checks as
        | Array<{ id?: string; cmd?: string }>
        | undefined;
      if (!checks) return [];

      const issues: ValidationIssue[] = [];
      for (const c of checks) {
        const cmd = (c?.cmd ?? "").trim();
        if (!cmd) continue;

        // Bug 1: bare + or ? between alternation pipes inside grep -E
        const bsdGrepBare = /grep\s+-[a-z]*E[a-z]*\s+['"][^'"]*\|[+?]\|/m;
        if (bsdGrepBare.test(cmd)) {
          issues.push({
            ruleId: "suspicious-check-regex",
            layer: "structure",
            severity: "warning",
            message: `Check "${c.id ?? "?"}" uses bare '+' or '?' inside a grep -E alternation. macOS BSD grep parses this as 'repetition-operator operand invalid' and the check fails at runtime.`,
            path: filePath,
            field: `checks.${c.id ?? "?"}.cmd`,
            actual: cmd,
            fix: "Either escape the literal (\\+) or replace the alternation with a character class.",
          });
        }

        // Bug 2: 2+ consecutive dots between `grep` and a path-shaped pattern
        // (excluding `..` directory traversal which is rare in checks).
        // Triggers on patterns like `redirect..../playbooks.` where `.*` was
        // intended.
        const consecDots = /grep[^|]*['"][^'"]*\.{2,}[a-zA-Z/]/m;
        if (consecDots.test(cmd) && !cmd.includes("\\.")) {
          issues.push({
            ruleId: "suspicious-check-regex",
            layer: "structure",
            severity: "warning",
            message: `Check "${c.id ?? "?"}" has 2+ consecutive '.' characters in a regex pattern. This requires that many literal characters; you probably meant '.*' or '\\.'.`,
            path: filePath,
            field: `checks.${c.id ?? "?"}.cmd`,
            actual: cmd,
            fix: "Replace consecutive dots with .* (greedy match) or \\. (literal period).",
          });
        }
      }
      return issues;
    },
  },
];
