/**
 * Format Rules
 *
 * Validate field types, enum values, and YAML shape of TASK.md frontmatter.
 */

import type { ValidationRule, ValidationIssue } from "../types.ts";

/** Reserved TASK.md frontmatter keys (mirrors task-md-definition.ts) */
const RESERVED_KEYS = new Set([
  "id",
  "title",
  "description",
  "skills",
  "executor",
  "seed",
  "blocking",
  "dependencies",
  "tags",
  "inputs",
  "outputs",
  "checks",
  "needs",
  "agent",
  "plan",
  "planning",
  "materials",
  "diagnosis-hints",
  "correction-budget",
  "context-depth",
  "auto-converge",
  "context",
  "vars",
]);

const VALID_EXECUTOR_TYPES = new Set(["ai", "script", "function"]);
const VALID_SEED_MODES = new Set(["cli"]);

/** Levenshtein distance between two strings */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export const formatRules: ValidationRule[] = [
  {
    id: "converge-prompt-is-string",
    layer: "format",
    severity: "error",
    description:
      "converge.prompt and converge.cmd must be strings when converge is declared",
    check: ({ rawFrontmatter, filePath }) => {
      const converge = rawFrontmatter.converge;
      if (converge === undefined) return [];
      if (
        typeof converge !== "object" ||
        converge === null ||
        Array.isArray(converge)
      ) {
        return [
          {
            ruleId: "converge-prompt-is-string",
            layer: "format",
            severity: "error",
            message: "`converge` must be an object when declared",
            path: filePath,
            field: "converge",
            actual: typeof converge,
            expected: "object",
            fix: 'Use `converge: { prompt: "..." }` or `converge: { cmd: "..." }`',
          },
        ];
      }
      const prompt = (converge as Record<string, unknown>).prompt;
      const cmd = (converge as Record<string, unknown>).cmd;
      if (prompt !== undefined && typeof prompt !== "string") {
        return [
          {
            ruleId: "converge-prompt-is-string",
            layer: "format",
            severity: "error",
            message: "`converge.prompt` must be a string",
            path: filePath,
            field: "converge.prompt",
            actual: typeof prompt,
            expected: "string",
          },
        ];
      }
      if (cmd !== undefined && typeof cmd !== "string") {
        return [
          {
            ruleId: "converge-prompt-is-string",
            layer: "format",
            severity: "error",
            message: "`converge.cmd` must be a string",
            path: filePath,
            field: "converge.cmd",
            actual: typeof cmd,
            expected: "string",
          },
        ];
      }
      if (prompt === undefined && cmd === undefined) {
        return [
          {
            ruleId: "converge-prompt-is-string",
            layer: "format",
            severity: "error",
            message: "`converge` must declare `prompt` or `cmd`",
            path: filePath,
            field: "converge",
            expected: "prompt or cmd",
            fix: 'Use `converge: { prompt: "..." }` or `converge: { cmd: "..." }`',
          },
        ];
      }
      return [];
    },
  },

  {
    id: "id-required",
    layer: "format",
    severity: "error",
    description: "Task ID must not be empty",
    check: ({ shape, filePath }) => {
      if (!shape.id) {
        return [
          {
            ruleId: "id-required",
            layer: "format",
            severity: "error",
            message: "Task ID is empty",
            path: filePath,
            field: "id",
            fix: "Add an `id` field to the frontmatter (e.g., `id: 001-my-task`)",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "id-format",
    layer: "format",
    severity: "warning",
    description: "Task ID should follow NNN-kebab-case format",
    check: ({ shape, filePath }) => {
      if (!shape.id) return []; // Handled by id-required
      // NNN-kebab-case or NN-kebab-case (epic-level)
      if (/^\d+-[a-z0-9-]+$/.test(shape.id)) return [];
      return [
        {
          ruleId: "id-format",
          layer: "format",
          severity: "warning",
          message: `Task ID "${shape.id}" should follow \d+-kebab-case format (e.g., "001-my-task", "99-setup", "01-init")`,
          path: filePath,
          field: "id",
          actual: shape.id,
          expected: "NNN-kebab-case",
          fix: "Use a numeric prefix followed by kebab-case (e.g., 001-my-task)",
        },
      ];
    },
  },

  {
    id: "title-is-string",
    layer: "format",
    severity: "error",
    description: "title must be a string",
    check: ({ rawFrontmatter, filePath }) => {
      if (
        rawFrontmatter.title !== undefined &&
        typeof rawFrontmatter.title !== "string"
      ) {
        return [
          {
            ruleId: "title-is-string",
            layer: "format",
            severity: "error",
            message: "`title` must be a string",
            path: filePath,
            field: "title",
            actual: typeof rawFrontmatter.title,
            expected: "string",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "skills-is-array",
    layer: "format",
    severity: "error",
    description: "skills must be an array",
    check: ({ rawFrontmatter, filePath }) => {
      if (
        rawFrontmatter.skills !== undefined &&
        !Array.isArray(rawFrontmatter.skills)
      ) {
        return [
          {
            ruleId: "skills-is-array",
            layer: "format",
            severity: "error",
            message: "`skills` must be an array",
            path: filePath,
            field: "skills",
            actual: typeof rawFrontmatter.skills,
            expected: "array",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "depends_on-is-array",
    layer: "format",
    severity: "error",
    description: "depends_on must be an array",
    check: ({ rawFrontmatter, filePath }) => {
      if (
        rawFrontmatter.depends_on !== undefined &&
        !Array.isArray(rawFrontmatter.depends_on)
      ) {
        return [
          {
            ruleId: "depends_on-is-array",
            layer: "format",
            severity: "error",
            message: "`depends_on` must be an array",
            path: filePath,
            field: "depends_on",
            actual: typeof rawFrontmatter.depends_on,
            expected: "array",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "inputs-is-array",
    layer: "format",
    severity: "error",
    description: "inputs must be an array",
    check: ({ rawFrontmatter, filePath }) => {
      if (
        rawFrontmatter.inputs !== undefined &&
        !Array.isArray(rawFrontmatter.inputs)
      ) {
        return [
          {
            ruleId: "inputs-is-array",
            layer: "format",
            severity: "error",
            message: "`inputs` must be an array",
            path: filePath,
            field: "inputs",
            actual: typeof rawFrontmatter.inputs,
            expected: "array",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "outputs-is-array",
    layer: "format",
    severity: "error",
    description: "outputs must be an array",
    check: ({ rawFrontmatter, filePath }) => {
      if (
        rawFrontmatter.outputs !== undefined &&
        !Array.isArray(rawFrontmatter.outputs)
      ) {
        return [
          {
            ruleId: "outputs-is-array",
            layer: "format",
            severity: "error",
            message: "`outputs` must be an array",
            path: filePath,
            field: "outputs",
            actual: typeof rawFrontmatter.outputs,
            expected: "array",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "tags-is-array",
    layer: "format",
    severity: "error",
    description: "tags must be an array",
    check: ({ rawFrontmatter, filePath }) => {
      if (
        rawFrontmatter.tags !== undefined &&
        !Array.isArray(rawFrontmatter.tags)
      ) {
        return [
          {
            ruleId: "tags-is-array",
            layer: "format",
            severity: "error",
            message: "`tags` must be an array",
            path: filePath,
            field: "tags",
            actual: typeof rawFrontmatter.tags,
            expected: "array",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "materials-is-array",
    layer: "format",
    severity: "error",
    description: "materials must be an array",
    check: ({ rawFrontmatter, filePath }) => {
      if (
        rawFrontmatter.materials !== undefined &&
        !Array.isArray(rawFrontmatter.materials)
      ) {
        return [
          {
            ruleId: "materials-is-array",
            layer: "format",
            severity: "error",
            message: "`materials` must be an array",
            path: filePath,
            field: "materials",
            actual: typeof rawFrontmatter.materials,
            expected: "array",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "blocking-is-boolean",
    layer: "format",
    severity: "error",
    description: "blocking must be a boolean",
    check: ({ rawFrontmatter, filePath }) => {
      if (
        rawFrontmatter.blocking !== undefined &&
        typeof rawFrontmatter.blocking !== "boolean"
      ) {
        return [
          {
            ruleId: "blocking-is-boolean",
            layer: "format",
            severity: "error",
            message: "`blocking` must be a boolean",
            path: filePath,
            field: "blocking",
            actual: typeof rawFrontmatter.blocking,
            expected: "boolean",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "executor-type-valid",
    layer: "format",
    severity: "error",
    description: "executor.type must be ai, script, or function",
    check: ({ rawFrontmatter, filePath }) => {
      const exec = rawFrontmatter.executor;
      if (exec && typeof exec === "object") {
        const type = (exec as Record<string, unknown>).type;
        if (type !== undefined && !VALID_EXECUTOR_TYPES.has(type as string)) {
          return [
            {
              ruleId: "executor-type-valid",
              layer: "format",
              severity: "error",
              message: `executor.type "${type}" is not valid`,
              path: filePath,
              field: "executor.type",
              actual: type,
              expected: "ai | script | function",
            },
          ];
        }
      }
      return [];
    },
  },

  {
    id: "seed-type-valid",
    layer: "format",
    severity: "error",
    description: "seed.mode must be cli when seed is declared",
    check: ({ rawFrontmatter, filePath }) => {
      const seedData = rawFrontmatter.seed;
      if (seedData && typeof seedData === "object") {
        const mode = (seedData as Record<string, unknown>).mode;
        if (mode !== undefined && !VALID_SEED_MODES.has(mode as string)) {
          return [
            {
              ruleId: "seed-type-valid",
              layer: "format",
              severity: "error",
              message: `seed.mode "${mode}" is not valid`,
              path: filePath,
              field: "seed.mode",
              actual: mode,
              expected: "cli",
            },
          ];
        }
      }
      return [];
    },
  },

  {
    id: "seed-path-required",
    layer: "format",
    severity: "error",
    description: "seed must declare mode: cli when declared",
    check: ({ rawFrontmatter, filePath }) => {
      const seedData = rawFrontmatter.seed;
      if (seedData && typeof seedData === "object") {
        const obj = seedData as Record<string, unknown>;
        if (obj.mode !== "cli") {
          return [
            {
              ruleId: "seed-path-required",
              layer: "format",
              severity: "error",
              message: "`seed.mode: cli` is required when `seed` is declared",
              path: filePath,
              field: "seed.mode",
              fix: "Set `seed: { mode: cli }`",
            },
          ];
        }
      }
      return [];
    },
  },

  {
    id: "checks-shape",
    layer: "format",
    severity: "error",
    description: "checks entries must have an id field",
    check: ({ rawFrontmatter, filePath }) => {
      const checks = rawFrontmatter.checks;
      if (Array.isArray(checks)) {
        const issues: ValidationIssue[] = [];
        for (let i = 0; i < checks.length; i++) {
          const entry = checks[i];
          if (
            !entry ||
            typeof entry !== "object" ||
            !(entry as Record<string, unknown>).id
          ) {
            issues.push({
              ruleId: "checks-shape",
              layer: "format",
              severity: "error",
              message: `checks[${i}] is missing required \`id\` field`,
              path: filePath,
              field: `checks[${i}].id`,
              fix: "Each check entry needs an `id` (e.g., `- id: lint`)",
            });
          }
        }
        return issues;
      }
      return [];
    },
  },

  {
    id: "needs-shape",
    layer: "format",
    severity: "error",
    description: "needs entries must have an id field",
    check: ({ rawFrontmatter, filePath }) => {
      const needs = rawFrontmatter.needs;
      if (Array.isArray(needs)) {
        const issues: ValidationIssue[] = [];
        for (let i = 0; i < needs.length; i++) {
          const entry = needs[i];
          if (
            !entry ||
            typeof entry !== "object" ||
            !(entry as Record<string, unknown>).id
          ) {
            issues.push({
              ruleId: "needs-shape",
              layer: "format",
              severity: "error",
              message: `needs[${i}] is missing required \`id\` field`,
              path: filePath,
              field: `needs[${i}].id`,
              fix: "Each needs entry needs an `id` (e.g., `- id: build-check`)",
            });
          }
        }
        return issues;
      }
      return [];
    },
  },

  {
    id: "correction-budget-positive",
    layer: "format",
    severity: "warning",
    description: "correction-budget should be a positive number",
    check: ({ rawFrontmatter, filePath }) => {
      const budget = rawFrontmatter["correction-budget"];
      if (budget !== undefined && (typeof budget !== "number" || budget <= 0)) {
        return [
          {
            ruleId: "correction-budget-positive",
            layer: "format",
            severity: "warning",
            message: "`correction-budget` should be a positive number",
            path: filePath,
            field: "correction-budget",
            actual: budget,
            expected: "positive number",
          },
        ];
      }
      return [];
    },
  },

  {
    id: "unknown-reserved-like-key",
    layer: "format",
    severity: "info",
    description: "Frontmatter key looks like a typo of a reserved key",
    check: ({ rawFrontmatter, filePath }) => {
      const issues: ValidationIssue[] = [];
      for (const key of Object.keys(rawFrontmatter)) {
        if (RESERVED_KEYS.has(key)) continue;
        for (const reserved of RESERVED_KEYS) {
          if (levenshtein(key, reserved) <= 2 && key !== reserved) {
            issues.push({
              ruleId: "unknown-reserved-like-key",
              layer: "format",
              severity: "info",
              message: `"${key}" looks like a typo of reserved key "${reserved}"`,
              path: filePath,
              field: key,
              expected: reserved,
              fix: `Did you mean \`${reserved}\`?`,
            });
            break; // Only report closest match
          }
        }
      }
      return issues;
    },
  },
];
