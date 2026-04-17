/**
 * Project Rules
 *
 * Validate cross-task relationships: duplicate IDs, dangling dependencies,
 * circular references, orphan inputs, ordering gaps, empty epics.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';
import { parse as parseYaml } from 'yaml';
import type { ProjectValidationRule, ValidationIssue } from '../types.ts';

/** Check if a string contains glob special characters */
function hasGlobChars(s: string): boolean {
  return /[*?[\]{]/.test(s);
}

export const projectRules: ProjectValidationRule[] = [
  {
    id: 'duplicate-task-ids',
    layer: 'structure',
    severity: 'error',
    description: 'Two or more tasks share the same id',
    check: (tasks) => {
      const idMap = new Map<string, string[]>(); // id → file paths
      for (const t of tasks) {
        if (!t.shape.id) continue;
        const paths = idMap.get(t.shape.id) ?? [];
        paths.push(t.filePath);
        idMap.set(t.shape.id, paths);
      }
      const issues: ValidationIssue[] = [];
      for (const [id, paths] of idMap) {
        if (paths.length > 1) {
          issues.push({
            ruleId: 'duplicate-task-ids',
            layer: 'structure',
            severity: 'error',
            message: `Duplicate task id "${id}" found in: ${paths.join(', ')}`,
            field: 'id',
            actual: id,
            fix: 'Rename one of the duplicate tasks to a unique id',
          });
        }
      }
      return issues;
    },
  },

  {
    id: 'dangling-dependency',
    layer: 'structure',
    severity: 'error',
    description: 'dependencies references a task id that does not exist',
    check: (tasks) => {
      const allIds = new Set(tasks.map(t => t.shape.id).filter(Boolean));
      const allTags = new Set(tasks.flatMap(t => t.shape.tags ?? []));
      const issues: ValidationIssue[] = [];
      for (const t of tasks) {
        if (!t.shape.dependencies?.length) continue;
        for (const dep of t.shape.dependencies) {
          if (dep.startsWith('tag:')) {
            const tagName = dep.substring(4);
            if (!allTags.has(tagName)) {
              issues.push({
                ruleId: 'dangling-tag',
                layer: 'structure',
                severity: 'warning',
                message: `"${t.shape.id}" depends on "${dep}" but no task has tag "${tagName}"`,
                path: t.filePath,
                field: 'dependencies',
                actual: dep,
                fix: `Add tag "${tagName}" to a task or remove from dependencies`,
              });
            }
          } else if (!allIds.has(dep)) {
            issues.push({
              ruleId: 'dangling-dependency',
              layer: 'structure',
              severity: 'error',
              message: `"${t.shape.id}" depends on "${dep}" which does not exist`,
              path: t.filePath,
              field: 'dependencies',
              actual: dep,
              fix: `Create a task with id "${dep}" or remove from dependencies`,
            });
          }
        }
      }
      return issues;
    },
  },

  {
    id: 'circular-dependencies',
    layer: 'structure',
    severity: 'error',
    description: 'Dependency graph contains a cycle',
    check: (tasks) => {
      // Build adjacency list
      const adj = new Map<string, string[]>();
      for (const t of tasks) {
        if (!t.shape.id) continue;
        adj.set(t.shape.id, t.shape.dependencies ?? []);
      }

      // DFS cycle detection
      const visited = new Set<string>();
      const inStack = new Set<string>();
      const cycles: string[][] = [];

      function dfs(node: string, pathSoFar: string[]): void {
        if (inStack.has(node)) {
          // Found a cycle — extract it
          const cycleStart = pathSoFar.indexOf(node);
          cycles.push([...pathSoFar.slice(cycleStart), node]);
          return;
        }
        if (visited.has(node)) return;

        visited.add(node);
        inStack.add(node);
        for (const neighbor of adj.get(node) ?? []) {
          if (adj.has(neighbor)) { // Only follow known task IDs
            dfs(neighbor, [...pathSoFar, node]);
          }
        }
        inStack.delete(node);
      }

      for (const id of adj.keys()) {
        if (!visited.has(id)) {
          dfs(id, []);
        }
      }

      return cycles.map(cycle => ({
        ruleId: 'circular-dependencies',
        layer: 'structure' as const,
        severity: 'error' as const,
        message: `Cycle detected: ${cycle.join(' → ')}`,
        field: 'dependencies',
        fix: 'Break the cycle by removing one dependency in the chain',
      }));
    },
  },

  {
    id: 'orphan-inputs',
    layer: 'structure',
    severity: 'warning',
    description: 'inputs references files that no other task outputs produces',
    check: (tasks) => {
      // Collect all outputs across all tasks
      const allOutputs: string[] = [];
      for (const t of tasks) {
        if (t.shape.outputs) {
          for (const o of t.shape.outputs) allOutputs.push(o);
        }
      }
      const outputSet = new Set(allOutputs);

      const issues: ValidationIssue[] = [];
      for (const t of tasks) {
        if (!t.shape.inputs?.length) continue;
        for (const input of t.shape.inputs) {
          // Exact match
          if (outputSet.has(input)) continue;

          // Glob matching: input is a glob → check if any output matches it
          if (hasGlobChars(input)) {
            if (allOutputs.some(o => minimatch(o, input))) continue;
          }

          // Glob matching: check if any output glob matches this input
          if (allOutputs.some(o => hasGlobChars(o) && minimatch(input, o))) continue;

          issues.push({
            ruleId: 'orphan-inputs',
            layer: 'structure',
            severity: 'warning',
            message: `"${t.shape.id}" input "${input}" is not produced by any task's outputs`,
            path: t.filePath,
            field: 'inputs',
            actual: input,
            fix: 'Add this path to the producing task\'s outputs, or remove from inputs',
          });
        }
      }
      return issues;
    },
  },

  {
    id: 'ordering-gap',
    layer: 'structure',
    severity: 'info',
    description: 'Task numbering has gaps',
    check: (tasks) => {
      // Group tasks by parent directory (epic)
      const byEpic = new Map<string, number[]>();
      for (const t of tasks) {
        const epicDir = path.dirname(t.taskDir);
        const match = path.basename(t.taskDir).match(/^(\d+)-/);
        if (match) {
          const nums = byEpic.get(epicDir) ?? [];
          nums.push(parseInt(match[1], 10));
          byEpic.set(epicDir, nums);
        }
      }

      const issues: ValidationIssue[] = [];
      for (const [epicDir, nums] of byEpic) {
        nums.sort((a, b) => a - b);
        for (let i = 1; i < nums.length; i++) {
          if (nums[i] - nums[i - 1] > 1) {
            const missing: number[] = [];
            for (let n = nums[i - 1] + 1; n < nums[i]; n++) missing.push(n);
            issues.push({
              ruleId: 'ordering-gap',
              layer: 'structure',
              severity: 'info',
              message: `Numbering gap in "${path.basename(epicDir)}": missing ${missing.map(n => String(n).padStart(3, '0')).join(', ')} between ${String(nums[i - 1]).padStart(3, '0')} and ${String(nums[i]).padStart(3, '0')}`,
              path: epicDir,
            });
          }
        }
      }
      return issues;
    },
  },

  {
    id: 'epic-has-no-tasks',
    layer: 'structure',
    severity: 'warning',
    description: 'Epic directory exists but contains no task subdirectories',
    check: (tasks, projectDir) => {
      const TASK_FOLDER = /^\d+-[a-z0-9-]+$/;
      const epicsDir = path.join(projectDir, '.harness', 'epics');
      if (!existsSync(epicsDir)) return [];

      // Collect epic dirs that have tasks
      const epicsWithTasks = new Set<string>();
      for (const t of tasks) {
        epicsWithTasks.add(path.dirname(t.taskDir));
      }

      const issues: ValidationIssue[] = [];
      try {
        const epicFolders = readdirSync(epicsDir, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => path.join(epicsDir, d.name));

        for (const epicDir of epicFolders) {
          if (!epicsWithTasks.has(epicDir)) {
            // Check if directory has any task-like subfolders
            const hasTaskFolders = readdirSync(epicDir, { withFileTypes: true })
              .some(d => d.isDirectory() && TASK_FOLDER.test(d.name));
            if (!hasTaskFolders) {
              issues.push({
                ruleId: 'epic-has-no-tasks',
                layer: 'structure',
                severity: 'warning',
                message: `Epic "${path.basename(epicDir)}" has no task subdirectories`,
                path: epicDir,
                fix: 'Add task folders (e.g., 001-my-task/) or remove the empty epic',
              });
            }
          }
        }
      } catch {
        // Can't read epics dir — skip
      }
      return issues;
    },
  },

  {
    id: 'skill-not-registered',
    layer: 'structure',
    severity: 'error',
    description: 'Task references a skill not registered in PROJECT.md',
    check: (tasks, _projectDir, projectMd) => {
      // Skip if PROJECT.md has no skills registry
      const skills = projectMd?.skills;
      if (!skills || typeof skills !== 'object' || Array.isArray(skills)) return [];

      const registeredSkills = new Set(Object.keys(skills as Record<string, unknown>));
      const issues: ValidationIssue[] = [];
      for (const t of tasks) {
        if (!t.shape.skills?.length) continue;
        for (const skill of t.shape.skills) {
          if (!registeredSkills.has(skill)) {
            issues.push({
              ruleId: 'skill-not-registered',
              layer: 'structure',
              severity: 'error',
              message: `"${t.shape.id}" uses skill "${skill}" which is not registered in PROJECT.md`,
              path: t.filePath,
              field: 'skills',
              actual: skill,
              fix: `Add "${skill}" to the skills map in PROJECT.md or remove from task`,
            });
          }
        }
      }
      return issues;
    },
  },

  {
    id: 'goal-not-found',
    layer: 'structure',
    severity: 'warning',
    description: 'Task references a goal that does not exist in .harness/goals/',
    check: (tasks, projectDir) => {
      const goalsDir = path.join(projectDir, '.harness', 'goals');
      if (!existsSync(goalsDir)) return [];

      // Scan goal directories: named NNN-{id}, strip numeric prefix to get goal ID
      const goalIds = new Set<string>();
      try {
        for (const entry of readdirSync(goalsDir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const match = entry.name.match(/^\d+-(.+)$/);
          if (match) goalIds.add(match[1]);
        }
      } catch {
        return [];
      }

      const issues: ValidationIssue[] = [];
      for (const t of tasks) {
        if (!t.shape.goals?.length) continue;
        for (const goal of t.shape.goals) {
          if (!goalIds.has(goal)) {
            issues.push({
              ruleId: 'goal-not-found',
              layer: 'structure',
              severity: 'warning',
              message: `"${t.shape.id}" references goal "${goal}" which has no directory in .harness/goals/`,
              path: t.filePath,
              field: 'goals',
              actual: goal,
              fix: `Create .harness/goals/NNN-${goal}/ or remove from task goals`,
            });
          }
        }
      }
      return issues;
    },
  },

  {
    id: 'goal-script-exists',
    layer: 'structure',
    severity: 'warning',
    description: 'Goal declares a script that does not exist',
    check: (_tasks, projectDir) => {
      const goalsDir = path.join(projectDir, '.harness', 'goals');
      if (!existsSync(goalsDir)) return [];

      const issues: ValidationIssue[] = [];
      try {
        for (const entry of readdirSync(goalsDir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const goalDir = path.join(goalsDir, entry.name);
          const goalMdPath = path.join(goalDir, 'GOAL.md');
          if (!existsSync(goalMdPath)) continue;

          let frontmatter: Record<string, unknown>;
          try {
            const content = readFileSync(goalMdPath, 'utf8');
            const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            if (!fmMatch) continue;
            frontmatter = parseYaml(fmMatch[1]) as Record<string, unknown>;
            if (!frontmatter || typeof frontmatter !== 'object') continue;
          } catch {
            continue;
          }

          // Check metric.script and detail.script
          for (const section of ['metric', 'detail'] as const) {
            const obj = frontmatter[section];
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) continue;
            const script = (obj as Record<string, unknown>).script;
            if (typeof script !== 'string') continue;
            const scriptPath = path.join(goalDir, script);
            if (!existsSync(scriptPath)) {
              issues.push({
                ruleId: 'goal-script-exists',
                layer: 'structure',
                severity: 'warning',
                message: `Goal "${entry.name}" declares ${section}.script "${script}" which does not exist`,
                path: goalMdPath,
                field: `${section}.script`,
                actual: script,
                fix: `Create ${scriptPath} or remove ${section}.script from GOAL.md`,
              });
            }
          }
        }
      } catch {
        // Can't read goals dir — skip
      }
      return issues;
    },
  },
];
