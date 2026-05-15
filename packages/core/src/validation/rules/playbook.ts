/**
 * Playbook Validation Rules
 *
 * Comprehensive structural validation for playbooks. Detects common
 * misconfigurations, missing files, circular dependencies, and structural
 * issues BEFORE runtime — fail fast, prevent hallucinations.
 *
 * Rules are split into layers:
 *   format   — field types, enum values, YAML shape
 *   structure — filesystem expectations, cross-references, dependencies
 *   integrity — goal graph health, template consistency, script reachability
 */

import { existsSync, readdirSync } from "node:fs";
import { join, basename, dirname, extname, resolve, sep } from "node:path";
import type {
  ValidationIssue,
  Severity,
  ValidationLayer,
} from "../types.ts";
import { readTextFile } from "../../task/playbook/layout.ts";

/* ------------------------------------------------------------------ */
/*  Shared Utilities                                                    */
/* ------------------------------------------------------------------ */

/** Check if a path looks like it has glob characters */
function hasGlobs(s: string): boolean {
  return /[*?[\]{]/.test(s);
}

/** Recursively list all files under a directory */
function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const result: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else result.push(p);
    }
  }
  walk(dir);
  return result.sort();
}

/** Check if a file at the given path is executable (by extension) */
const EXECUTABLE_EXTS = new Set([".js", ".mjs", ".cjs", ".py", ".sh"]);
const MARKDOWN_EXTS = new Set([".md", ".markdown"]);

function isExecutable(fp: string): boolean {
  return EXECUTABLE_EXTS.has(extname(fp).toLowerCase());
}
function isMarkdown(fp: string): boolean {
  return MARKDOWN_EXTS.has(extname(fp).toLowerCase());
}

/* ------------------------------------------------------------------ */
/*  Frontmatter parser (simple, no yaml dep)                           */
/* ------------------------------------------------------------------ */

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm: Record<string, unknown> = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey: string | null = null;
  let currentArray: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("- ")) {
      if (currentKey) currentArray.push(trimmed.substring(2).trim());
      continue;
    }
    const ci = trimmed.indexOf(":");
    if (ci > 0) {
      if (currentKey && currentArray.length) { fm[currentKey] = currentArray; currentArray = []; }
      currentKey = trimmed.substring(0, ci).trim();
      let val = trimmed.substring(ci + 1).trim();
      if (val === "true") fm[currentKey] = true;
      else if (val === "false") fm[currentKey] = false;
      else if (/^\d+(\.\d+)?$/.test(val)) fm[currentKey] = parseFloat(val);
      else {
        val = val.replace(/^['"](.*)['"]$/, "$1");
        fm[currentKey] = val;
      }
    }
  }
  if (currentKey && currentArray.length) fm[currentKey] = currentArray;
  return fm;
}

/* ------------------------------------------------------------------ */
/*  Rule type for playbook validation                                  */
/* ------------------------------------------------------------------ */

export interface PlaybookValidationContext {
  /** Absolute path to the playbook root directory */
  playbookDir: string;
  /** Absolute path to the project root */
  projectDir: string;
  /** Parsed playbook.yml frontmatter */
  def: Record<string, unknown>;
  /** All TASK.md files under tasks/ (absolute paths) */
  taskFiles: string[];
  /** All .goal.md files under goals/ (absolute paths) */
  goalFiles: string[];
  /** All executable files under scripts/ */
  scriptFiles: string[];
  /** All executable files under checks/ */
  checkFiles: string[];
  /** All executable files under seeds/ */
  seedFiles: string[];
  /** All markdown files under templates/ */
  templateFiles: string[];
}

export interface PlaybookValidationRule {
  id: string;
  layer: ValidationLayer | "integrity";
  severity: Severity;
  description: string;
  check: (ctx: PlaybookValidationContext) => ValidationIssue[];
}

/* ════════════════════════════════════════════════════════════════════ */
/*  FORMAT RULES                                                         */
/* ════════════════════════════════════════════════════════════════════ */

export const playbookFormatRules: PlaybookValidationRule[] = [
  {
    id: "playbook-name-required",
    layer: "format",
    severity: "error",
    description: "playbook.yml must have a `name` field",
    check: ({ def, playbookDir }) => {
      if (!def.name || typeof def.name !== "string") {
        return [{
          ruleId: "playbook-name-required",
          layer: "format",
          severity: "error",
          message: `playbook.yml at ${playbookDir} is missing a \`name\` field`,
          path: join(playbookDir, "playbook.yml"),
          field: "name",
          fix: 'Add `name: "my-playbook"` to playbook.yml',
        }];
      }
      return [];
    },
  },
  {
    id: "playbook-tasks-valid",
    layer: "format",
    severity: "error",
    description: "playbook.yml tasks must be an array of objects with `path` or `id`",
    check: ({ def, playbookDir }) => {
      if (def.tasks === undefined) return [];
      if (!Array.isArray(def.tasks)) {
        return [{
          ruleId: "playbook-tasks-valid",
          layer: "format",
          severity: "error",
          message: "`tasks` must be an array",
          path: join(playbookDir, "playbook.yml"),
          field: "tasks",
          fix: "Wrap tasks in a YAML list: tasks:\n  - path: my-task",
        }];
      }
      const issues: ValidationIssue[] = [];
      for (let i = 0; i < (def.tasks as unknown[]).length; i++) {
        const t = (def.tasks as unknown[])[i];
        if (!t || typeof t !== "object") {
          issues.push({
            ruleId: "playbook-tasks-valid",
            layer: "format",
            severity: "error",
            message: `tasks[${i}] is not an object`,
            path: join(playbookDir, "playbook.yml"),
            field: `tasks[${i}]`,
            fix: "Each task entry must be an object with `path` or `id`",
          });
        } else if (!(t as Record<string, unknown>).path && !(t as Record<string, unknown>).id) {
          issues.push({
            ruleId: "playbook-tasks-valid",
            layer: "format",
            severity: "error",
            message: `tasks[${i}] is missing \`path\` or \`id\``,
            path: join(playbookDir, "playbook.yml"),
            field: `tasks[${i}]`,
            fix: 'Add `path: "my-task"` to the task entry',
          });
        }
      }
      return issues;
    },
  },
  {
    id: "playbook-seed-api-version-valid",
    layer: "format",
    severity: "error",
    description: "playbook.yml seed_api_version must be 0 or 1 when declared",
    check: ({ def, playbookDir }) => {
      if (def.seed_api_version === undefined) return [];
      if (def.seed_api_version === 0 || def.seed_api_version === 1) return [];
      return [{
        ruleId: "playbook-seed-api-version-valid",
        layer: "format",
        severity: "error",
        message: "`seed_api_version` must be 0 or 1",
        path: join(playbookDir, "playbook.yml"),
        field: "seed_api_version",
        fix: "Set `seed_api_version: 1` for strict CLI seeding, or remove the field",
      }];
    },
  },
  {
    id: "playbook-goals-valid",
    layer: "format",
    severity: "error",
    description: "playbook.yml goals must be an array of valid goal objects",
    check: ({ def, playbookDir }) => {
      if (def.goals === undefined) return [];
      if (!Array.isArray(def.goals)) {
        return [{
          ruleId: "playbook-goals-valid",
          layer: "format",
          severity: "error",
          message: "`goals` must be an array",
          path: join(playbookDir, "playbook.yml"),
          field: "goals",
          fix: "Wrap goals in a YAML list",
        }];
      }
      const issues: ValidationIssue[] = [];
      for (let i = 0; i < (def.goals as unknown[]).length; i++) {
        const g = (def.goals as unknown[])[i];
        if (!g || typeof g !== "object") {
          issues.push({
            ruleId: "playbook-goals-valid",
            layer: "format",
            severity: "error",
            message: `goals[${i}] is not an object`,
            path: join(playbookDir, "playbook.yml"),
            field: `goals[${i}]`,
          });
          continue;
        }
        const goal = g as Record<string, unknown>;
        if (!goal.id) {
          issues.push({
            ruleId: "playbook-goals-valid",
            layer: "format",
            severity: "error",
            message: `goals[${i}] is missing \`id\``,
            path: join(playbookDir, "playbook.yml"),
            field: `goals[${i}].id`,
          });
        }
        if (!goal.description) {
          issues.push({
            ruleId: "playbook-goals-valid",
            layer: "format",
            severity: "error",
            message: `goals[${i}] ("${goal.id ?? "?"}") is missing \`description\``,
            path: join(playbookDir, "playbook.yml"),
            field: `goals[${i}].description`,
          });
        }
        // Validate checks shape
        if (goal.checks !== undefined) {
          if (!Array.isArray(goal.checks)) {
            issues.push({
              ruleId: "playbook-goals-valid",
              layer: "format",
              severity: "error",
              message: `goals[${i}].checks must be an array`,
              path: join(playbookDir, "playbook.yml"),
              field: `goals[${i}].checks`,
            });
          } else {
            for (let j = 0; j < (goal.checks as unknown[]).length; j++) {
              const c = (goal.checks as unknown[])[j];
              if (!c || typeof c !== "object") {
                issues.push({
                  ruleId: "playbook-goals-valid",
                  layer: "format",
                  severity: "error",
                  message: `goals[${i}].checks[${j}] is not an object`,
                  path: join(playbookDir, "playbook.yml"),
                  field: `goals[${i}].checks[${j}]`,
                });
              } else {
                const check = c as Record<string, unknown>;
                if (!check.id) {
                  issues.push({
                    ruleId: "playbook-goals-valid",
                    layer: "format",
                    severity: "error",
                    message: `goals[${i}].checks[${j}] missing \`id\``,
                    path: join(playbookDir, "playbook.yml"),
                    field: `goals[${i}].checks[${j}].id`,
                  });
                }
                if (!check.cmd) {
                  issues.push({
                    ruleId: "playbook-goals-valid",
                    layer: "format",
                    severity: "error",
                    message: `goals[${i}].checks[${j}] missing \`cmd\``,
                    path: join(playbookDir, "playbook.yml"),
                    field: `goals[${i}].checks[${j}].cmd`,
                  });
                }
              }
            }
          }
        }
      }
      return issues;
    },
  },
];

/* ════════════════════════════════════════════════════════════════════ */
/*  STRUCTURE RULES                                                      */
/* ════════════════════════════════════════════════════════════════════ */

export const playbookStructureRules: PlaybookValidationRule[] = [
  // ── Folder contract enforcement ──────────────────────────────────
  {
    id: "executable-folder-contract",
    layer: "structure",
    severity: "error",
    description: "Executable folders (scripts/, checks/, seeds/) must only contain executable files",
    check: ({ playbookDir }) => {
      const issues: ValidationIssue[] = [];
      for (const sub of ["scripts", "checks", "seeds"]) {
        const dir = join(playbookDir, sub);
        for (const file of listFiles(dir)) {
          if (!isExecutable(file)) {
            issues.push({
              ruleId: "executable-folder-contract",
              layer: "structure",
              severity: "error",
              message: `Executable folder "${sub}/" may only contain .js/.mjs/.cjs/.py/.sh files, found "${basename(file)}"`,
              path: file,
              fix: `Remove non-executable file from ${sub}/ or convert to an executable format`,
            });
          }
        }
      }
      return issues;
    },
  },
  {
    id: "declarative-folder-contract",
    layer: "structure",
    severity: "error",
    description: "Declarative folders (tasks/, goals/, templates/) must only contain markdown files",
    check: ({ playbookDir }) => {
      const issues: ValidationIssue[] = [];
      for (const sub of ["tasks", "goals", "templates"]) {
        const dir = join(playbookDir, sub);
        for (const file of listFiles(dir)) {
          if (!isMarkdown(file)) {
            // Allow executable files inside tasks/**/seeds/ subdirectories.
            // Task-level seeds (e.g. tasks/build/seeds/epoch.seed.js)
            // are a valid framework pattern — they're discovered by the scanner
            // via the ".converge/playbooks/*/tasks/**/seeds/**/*.seed.md" glob.
            if (sub === "tasks" && file.includes(`${sep}seeds${sep}`)) continue;
            issues.push({
              ruleId: "declarative-folder-contract",
              layer: "structure",
              severity: "error",
              message: `Declarative folder "${sub}/" may only contain .md/.markdown files, found "${basename(file)}"`,
              path: file,
              fix: `Remove non-markdown file from ${sub}/ or move to a scripts/, checks/, seeds/ folder (task-level seeds/ subdirectories under tasks/ are allowed)`,
            });
          }
        }
      }
      return issues;
    },
  },

  // ── Task directory integrity ─────────────────────────────────────
  {
    id: "task-referenced-exists",
    layer: "structure",
    severity: "error",
    description: "Every task referenced in playbook.yml must have a corresponding TASK.md",
    check: ({ def, playbookDir, taskFiles }) => {
      const issues: ValidationIssue[] = [];
      const tasks = def.tasks as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(tasks)) return [];
      const taskPaths = new Set(taskFiles.map((f) => {
        // Extract the task path relative to tasks/
        const rel = f.substring(join(playbookDir, "tasks").length + 1);
        return dirname(rel); // e.g., "build" from "tasks/build/TASK.md"
      }));
      for (const t of tasks) {
        const path = (t.path ?? t.id) as string | undefined;
        if (!path) continue;
        if (!taskPaths.has(path) && !taskPaths.has(path.replace("/tasks/", "/"))) {
          // Also check direct match and the full path
          const expected = join(playbookDir, "tasks", path, "TASK.md");
          if (!existsSync(expected)) {
            issues.push({
              ruleId: "task-referenced-exists",
              layer: "structure",
              severity: "error",
              message: `Task "${path}" referenced in playbook.yml has no tasks/${path}/TASK.md`,
              path: join(playbookDir, "playbook.yml"),
              field: `tasks[path="${path}"]`,
              fix: `Create tasks/${path}/TASK.md or remove from playbook.yml`,
            });
          }
        }
      }
      return issues;
    },
  },

  // ── Goal file format ─────────────────────────────────────────────
  {
    id: "seed-api-hard-cutover",
    layer: "structure",
    severity: "error",
    description: "Legacy seeds are removed; tasks must use seed.mode=cli when seed is declared",
    check: ({ def, taskFiles }) => {
      const issues: ValidationIssue[] = [];

      for (const taskPath of taskFiles) {
        const content = readTextFile(taskPath);
        const hasLegacySeeds = /(^|\n)\s*seeds:\s*/m.test(content);
        const hasCliSeedMode = /(^|\n)\s*seed:\s*\n[^\n]*\n?\s*mode:\s*cli\b/m.test(content)
          || /(^|\n)\s*seed:\s*\{[^}]*mode:\s*cli[^}]*\}/m.test(content);
        const hasAnySeed = /(^|\n)\s*seed:\s*/m.test(content);

        if (hasLegacySeeds) {
          issues.push({
            ruleId: "seed-api-hard-cutover",
            layer: "structure",
            severity: "error",
            message: "Legacy `seeds:` is removed",
            path: taskPath,
            field: "seeds",
            fix: "Use `seed: { mode: cli }` and emit `converge spawn ...` commands from TASK body",
          });
        }

        if (hasAnySeed && !hasCliSeedMode) {
          issues.push({
            ruleId: "seed-api-hard-cutover",
            layer: "structure",
            severity: "error",
            message: "`seed:` must use `mode: cli`",
            path: taskPath,
            field: "seed.mode",
            fix: "Set `seed: { mode: cli }`",
          });
        }

        if (hasLegacySeeds && hasCliSeedMode) {
          issues.push({
            ruleId: "seed-api-hard-cutover",
            layer: "structure",
            severity: "error",
            message: "Mixed seed modes are forbidden (`seed` + `seeds`)",
            path: taskPath,
            fix: "Remove legacy `seeds:` and keep only `seed: { mode: cli }`",
          });
        }
      }
      return issues;
    },
  },
  {
    id: "goal-file-format",
    layer: "structure",
    severity: "error",
    description: "Every .goal.md file must have valid frontmatter with id and checks",
    check: ({ goalFiles }) => {
      const issues: ValidationIssue[] = [];
      for (const filePath of goalFiles) {
        try {
          const content = readTextFile(filePath);
          if (!content.includes("---")) {
            issues.push({
              ruleId: "goal-file-format",
              layer: "structure",
              severity: "error",
              message: `Goal file has no frontmatter: ${basename(filePath)}`,
              path: filePath,
              fix: "Add YAML frontmatter with `id`, `description`, and `tests`",
            });
            continue;
          }
          const fm = parseFrontmatter(content);
          if (!fm.id) {
            issues.push({
              ruleId: "goal-file-format",
              layer: "structure",
              severity: "error",
              message: `Goal file is missing \`id\` in frontmatter: ${basename(filePath)}`,
              path: filePath,
              field: "id",
              fix: "Add `id: my-goal` to the frontmatter",
            });
          }
          const checkDefs = fm.tests ?? fm.checks;
          if (!checkDefs || (Array.isArray(checkDefs) && checkDefs.length === 0)) {
            issues.push({
              ruleId: "goal-file-format",
              layer: "structure",
              severity: "warning",
              message: `Goal "${fm.id ?? basename(filePath)}" has no checks — can never be satisfied`,
              path: filePath,
              fix: "Add at least one check under `tests:` or `checks:`",
            });
          }
        } catch {
          issues.push({
            ruleId: "goal-file-format",
            layer: "structure",
            severity: "error",
            message: `Cannot read goal file: ${filePath}`,
            path: filePath,
          });
        }
      }
      return issues;
    },
  },

  // ── Seed script existence ────────────────────────────────────────
  {
    id: "seed-scripts-exist",
    layer: "structure",
    severity: "error",
    description: "Seed scripts referenced in TASK.md seeds/ must exist",
    check: ({ playbookDir, taskFiles }) => {
      const issues: ValidationIssue[] = [];
      for (const taskPath of taskFiles) {
        try {
          const content = readTextFile(taskPath);
          const fm = parseFrontmatter(content);
          const seeds = fm.seeds ?? fm.seed;
          
          // Handle array of seeds
          if (Array.isArray(seeds)) {
            for (const seed of seeds) {
              if (!seed || typeof seed !== "object") continue;
              const s = seed as Record<string, unknown>;
              if (typeof s.name === "string") {
                // Named seed — check task-local seeds/ then playbook-level seeds/
                const taskDir = dirname(taskPath);
                const localPath = join(taskDir, "seeds", `${s.name}.seed.js`);
                const playbookPath = join(playbookDir, "seeds", `${s.name}.seed.js`);
                if (!existsSync(localPath) && !existsSync(playbookPath)) {
                  issues.push({
                    ruleId: "seed-scripts-exist",
                    layer: "structure",
                    severity: "error",
                    message: `Seed "${s.name}" not found in task seeds/ or playbook seeds/`,
                    path: taskPath,
                    fix: `Create seeds/${s.name}.seed.js in the task or playbook directory`,
                  });
                }
              }
            }
          }
          
          // Handle executable scripts referenced via executor
          if (fm.executor && typeof fm.executor === "object") {
            const exec = fm.executor as Record<string, unknown>;
            if (exec.type === "script" && typeof exec.path === "string") {
              const resolved = resolve(dirname(taskPath), exec.path);
              if (!existsSync(resolved)) {
                issues.push({
                  ruleId: "seed-scripts-exist",
                  layer: "structure",
                  severity: "error",
                  message: `Executor script not found: ${exec.path}`,
                  path: taskPath,
                  field: "executor.path",
                  fix: `Create ${exec.path} in the task directory`,
                });
              }
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
      return issues;
    },
  },

  // ── Template variable consistency ────────────────────────────────
  {
    id: "template-vars-consistent",
    layer: "structure",
    severity: "warning",
    description: "Template variables ({{var}}) in spawn calls match the template's expected vars",
    check: ({ taskFiles }) => {
      const issues: ValidationIssue[] = [];
      // Collect all template vars defined per template
      for (const taskPath of taskFiles) {
        try {
          const content = readTextFile(taskPath);
          // Find {{varname}} in content
          const usedVars = new Set<string>();
          for (const m of content.matchAll(/\{\{(\w+)\}\}/g)) {
            usedVars.add(m[1]);
          }
          if (usedVars.size === 0) continue;

          const fm = parseFrontmatter(content);
          const declared = fm.vars;
          
          // If the task declares vars, check consistency
          if (declared && typeof declared === "object") {
            const declaredKeys = new Set(Object.keys(declared as Record<string, unknown>));
            for (const uv of usedVars) {
              if (!declaredKeys.has(uv)) {
                issues.push({
                  ruleId: "template-vars-consistent",
                  layer: "structure",
                  severity: "warning",
                  message: `Template uses "{{${uv}}}" but it's not declared in frontmatter vars`,
                  path: taskPath,
                  field: "vars",
                  fix: `Add "${uv}" to the vars in frontmatter or use a declared variable`,
                });
              }
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
      return issues;
    },
  },
];

/* ════════════════════════════════════════════════════════════════════ */
/*  INTEGRITY RULES                                                      */
/* ════════════════════════════════════════════════════════════════════ */

export const playbookIntegrityRules: PlaybookValidationRule[] = [
  // ── Goal dependency graph health ─────────────────────────────────
  {
    id: "goal-circular-deps",
    layer: "integrity",
    severity: "error",
    description: "Goal dependency graph must not contain cycles",
    check: ({ goalFiles, def, playbookDir }) => {
      // Collect all goal IDs and their depends_on
      const goals = new Map<string, string[]>();
      const ymlPath = join(playbookDir, "playbook.yml");

      // From inline goals
      const inlineGoals = def.goals;
      if (Array.isArray(inlineGoals)) {
        for (const g of inlineGoals) {
          if (g && typeof g === "object" && (g as Record<string, unknown>).id) {
            const id = String((g as Record<string, unknown>).id);
            const deps = (g as Record<string, unknown>).depends_on;
            goals.set(id, Array.isArray(deps) ? deps.map(String) : []);
          }
        }
      }

      // From .goal.md files
      for (const filePath of goalFiles) {
        try {
          const fm = parseFrontmatter(readTextFile(filePath));
          if (fm.id) {
            const id = String(fm.id);
            const deps = fm.depends_on;
            goals.set(id, Array.isArray(deps) ? deps.map(String) : []);
          }
        } catch {
          // skip
        }
      }

      // DFS cycle detection
      const visited = new Set<string>();
      const inStack = new Set<string>();
      const cycles: string[][] = [];

      function dfs(node: string, path: string[]) {
        if (inStack.has(node)) {
          const start = path.indexOf(node);
          cycles.push([...path.slice(start), node]);
          return;
        }
        if (visited.has(node)) return;
        visited.add(node);
        inStack.add(node);
        for (const dep of goals.get(node) ?? []) {
          if (goals.has(dep)) dfs(dep, [...path, node]);
        }
        inStack.delete(node);
      }

      for (const id of goals.keys()) {
        if (!visited.has(id)) dfs(id, []);
      }

      return cycles.map((cycle) => ({
        ruleId: "goal-circular-deps",
        layer: "integrity",
        severity: "error",
        message: `Goal dependency cycle: ${cycle.join(" → ")}`,
        path: ymlPath,
        field: "goals[].depends_on",
        fix: "Break the cycle by removing one dependency in the chain",
      }));
    },
  },

  {
    id: "goal-dangling-deps",
    layer: "integrity",
    severity: "error",
    description: "All goal depends_on references must point to existing goals",
    check: ({ goalFiles, def, playbookDir }) => {
      const issues: ValidationIssue[] = [];
      const allIds = new Set<string>();
      const ymlPath = join(playbookDir, "playbook.yml");

      // Collect all goal IDs
      if (Array.isArray(def.goals)) {
        for (const g of def.goals) {
          if (g && typeof g === "object" && (g as Record<string, unknown>).id) {
            allIds.add(String((g as Record<string, unknown>).id));
          }
        }
      }
      for (const filePath of goalFiles) {
        try {
          const fm = parseFrontmatter(readTextFile(filePath));
          if (fm.id) allIds.add(String(fm.id));
        } catch { /* skip */ }
      }

      // Check each goal's deps
      if (Array.isArray(def.goals)) {
        for (const g of def.goals) {
          if (!g || typeof g !== "object") continue;
          const goal = g as Record<string, unknown>;
          const deps = goal.depends_on;
          if (!Array.isArray(deps)) continue;
          for (const dep of deps) {
            if (!allIds.has(String(dep))) {
              issues.push({
                ruleId: "goal-dangling-deps",
                layer: "integrity",
                severity: "error",
                message: `Goal "${goal.id}" depends_on "${dep}" which does not exist`,
                path: ymlPath,
                field: `goals[${goal.id}].depends_on`,
                fix: `Create a goal with id "${dep}" or remove from depends_on`,
              });
            }
          }
        }
      }

      for (const filePath of goalFiles) {
        try {
          const fm = parseFrontmatter(readTextFile(filePath));
          if (!fm.id) continue;
          const deps = fm.depends_on;
          if (!Array.isArray(deps)) continue;
          for (const dep of deps) {
            if (!allIds.has(String(dep))) {
              issues.push({
                ruleId: "goal-dangling-deps",
                layer: "integrity",
                severity: "error",
                message: `Goal "${fm.id}" depends_on "${dep}" which does not exist`,
                path: filePath,
                field: "depends_on",
                fix: `Create a goal with id "${dep}" or remove from depends_on`,
              });
            }
          }
        } catch { /* skip */ }
      }

      return issues;
    },
  },

  // ── Check command safety ─────────────────────────────────────────
  {
    id: "goal-check-dangerous",
    layer: "integrity",
    severity: "warning",
    description: "Goal check commands should not contain destructive operations",
    check: ({ goalFiles, def }) => {
      const issues: ValidationIssue[] = [];
      const destructive = /\b(rm\s+-rf?|sudo\s+|:\(\)\s*\{|mkfs\.|dd\s+if=)/i;
      const suspicious = /\b(curl\s+.*\|\s*(ba)?sh|wget\s+.*\s*-O\s*-\s*\|\s*(ba)?sh)/i;

      function checkCmd(cmd: string, id: string, path: string) {
        if (destructive.test(cmd)) {
          issues.push({
            ruleId: "goal-check-dangerous",
            layer: "integrity",
            severity: "warning",
            message: `Goal "${id}" check contains potentially destructive command: ${cmd.substring(0, 80)}`,
            path,
            field: "checks[].cmd",
            fix: "Use safer alternatives or add safeguards to the command",
          });
        }
        if (suspicious.test(cmd)) {
          issues.push({
            ruleId: "goal-check-dangerous",
            layer: "integrity",
            severity: "warning",
            message: `Goal "${id}" check pipes curl/wget into shell — security risk`,
            path,
            field: "checks[].cmd",
            fix: "Download the script first, inspect it, then run it separately",
          });
        }
      }

      if (Array.isArray(def.goals)) {
        const ymlPath = join(String(def._playbookDir ?? "."), "playbook.yml");
        for (const g of def.goals) {
          if (!g || typeof g !== "object") continue;
          const goal = g as Record<string, unknown>;
          const checks = goal.checks ?? goal.tests;
          if (!Array.isArray(checks)) continue;
          for (const c of checks) {
            if (c && typeof c === "object" && (c as Record<string, unknown>).cmd) {
              checkCmd(String((c as Record<string, unknown>).cmd), String(goal.id ?? "?"), ymlPath);
            }
          }
        }
      }

      for (const filePath of goalFiles) {
        try {
          const fm = parseFrontmatter(readTextFile(filePath));
          const id = String(fm.id ?? basename(filePath));
          const checks = fm.tests ?? fm.checks;
          if (!Array.isArray(checks)) continue;
          for (const c of checks) {
            if (c && typeof c === "object" && (c as Record<string, unknown>).cmd) {
              checkCmd(String((c as Record<string, unknown>).cmd), id, filePath);
            }
          }
        } catch { /* skip */ }
      }

      return issues;
    },
  },

  // ── Script reachability ──────────────────────────────────────────
  {
    id: "script-unreachable",
    layer: "integrity",
    severity: "info",
    description: "Scripts in scripts/ that are not referenced by any task or goal may be dead code",
    check: ({ scriptFiles, taskFiles, goalFiles, playbookDir }) => {
      const issues: ValidationIssue[] = [];
      // Collect all referenced script names from tasks and goals
      const referencedArtifacts = new Set<string>();

      for (const fp of [...taskFiles, ...goalFiles]) {
        try {
          const content = readTextFile(fp);
          // Look for script references in various forms
          for (const m of content.matchAll(/scripts\/(\S+?\.\w+)/g)) {
            referencedArtifacts.add(m[1]);
          }
          for (const m of content.matchAll(/node\s+(?:\.\/)?(\S*scripts\/\S+?\.\w+)/g)) {
            referencedArtifacts.add(m[1].split("scripts/").pop()!);
          }
        } catch { /* skip */ }
      }

      for (const scriptPath of scriptFiles) {
        const name = basename(scriptPath);
        if (!referencedArtifacts.has(name)) {
          const dirMatch = scriptPath.match(/scripts\/(.+)/);
          const relPath = dirMatch ? dirMatch[1] : name;
          if (![...referencedArtifacts].some((r) => r === relPath || r === name)) {
            issues.push({
              ruleId: "script-unreachable",
              layer: "integrity",
              severity: "info",
              message: `Script "${name}" in scripts/ is not referenced by any task or goal`,
              path: scriptPath,
              fix: "Reference this script in a TASK.md or .goal.md, or remove it if unused",
            });
          }
        }
      }

      return issues;
    },
  },

  // ── Duplicate goal IDs across files and inline ───────────────────
  {
    id: "goal-duplicate-ids",
    layer: "integrity",
    severity: "error",
    description: "Goal IDs must be unique across inline goals and .goal.md files",
    check: ({ goalFiles, def }) => {
      const issues: ValidationIssue[] = [];
      const byId = new Map<string, string[]>();

      if (Array.isArray(def.goals)) {
        const ymlPath = join(String(def._playbookDir ?? "."), "playbook.yml");
        for (const g of def.goals) {
          if (g && typeof g === "object" && (g as Record<string, unknown>).id) {
            const id = String((g as Record<string, unknown>).id);
            const paths = byId.get(id) ?? [];
            paths.push(ymlPath);
            byId.set(id, paths);
          }
        }
      }

      for (const filePath of goalFiles) {
        try {
          const fm = parseFrontmatter(readTextFile(filePath));
          if (fm.id) {
            const id = String(fm.id);
            const paths = byId.get(id) ?? [];
            paths.push(filePath);
            byId.set(id, paths);
          }
        } catch { /* skip */ }
      }

      for (const [id, paths] of byId) {
        if (paths.length > 1) {
          issues.push({
            ruleId: "goal-duplicate-ids",
            layer: "integrity",
            severity: "error",
            message: `Duplicate goal id "${id}" in: ${paths.map((p) => basename(dirname(p)) + "/" + basename(p)).join(", ")}`,
            path: paths[0],
            field: "id",
            fix: "Rename one of the duplicate goals to have a unique id",
          });
        }
      }

      return issues;
    },
  },
];

/* ------------------------------------------------------------------ */
/*  All rules combined                                                  */
/* ------------------------------------------------------------------ */

export const allPlaybookRules: PlaybookValidationRule[] = [
  ...playbookFormatRules,
  ...playbookStructureRules,
  ...playbookIntegrityRules,
];
