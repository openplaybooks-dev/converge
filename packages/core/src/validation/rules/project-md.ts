/**
 * PROJECT.md Rules
 *
 * Validate the .converge/PROJECT.md frontmatter: required fields,
 * field types, known keys, valid hook event names, and runtime values.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import type { ValidationIssue, Severity, ValidationLayer } from '../types.ts';

/* ------------------------------------------------------------------ */
/*  Known keys and values                                              */
/* ------------------------------------------------------------------ */

const KNOWN_ROOT_KEYS = new Set([
  'name', 'description', 'dir', 'discovery', 'plugins',
  'variables', 'hooks', 'runtime', 'agents', 'skills',
]);

const KNOWN_DISCOVERY_KEYS = new Set([
  'tasks', 'epics', 'checks', 'plans', 'agents', 'skills',
  'watch', 'spawn',
]);

const KNOWN_RUNTIME_KEYS = new Set([
  'maxIterations', 'maxStallCount', 'parallelExecution',
  'maxParallelTasks', 'enableCheckpoints', 'logLevel',
  'jsonLogs', 'milestone', 'selfRepair',
]);

const VALID_SPAWN_VALUES = new Set(['subtasks-only', 'unrestricted']);
const VALID_LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error']);

const VALID_HOOK_EVENTS = new Set([
  'project:start', 'project:complete', 'project:fail',
  'epic:start', 'epic:complete', 'epic:fail', 'epic:skip',
  'task:start', 'task:complete', 'task:fail', 'task:retry', 'task:skip',
  'gap:detected', 'gap:resolved',
  'convergence:achieved', 'convergence:stalled',
  'checkpoint:created', 'checkpoint:restored',
  'discovery:found', 'discovery:changed',
  'background:started', 'background:degraded', 'background:recovered',
  'background:crashed', 'background:stopped',
  'sidecar:started', 'sidecar:stopped',
  'schedule:started', 'schedule:tick', 'schedule:stopped',
  'task:lifecycle-before', 'task:lifecycle-after', 'task:correction-attempt',
]);

/* ------------------------------------------------------------------ */
/*  Input type                                                         */
/* ------------------------------------------------------------------ */

export interface ProjectMdValidationInput {
  /** Raw parsed YAML frontmatter */
  frontmatter: Record<string, unknown>;
  /** Absolute path to the PROJECT.md file */
  filePath: string;
}

/* ------------------------------------------------------------------ */
/*  Rule interface                                                     */
/* ------------------------------------------------------------------ */

export interface ProjectMdRule {
  id: string;
  layer: ValidationLayer;
  severity: Severity;
  description: string;
  check: (input: ProjectMdValidationInput) => ValidationIssue[];
}

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function issue(
  ruleId: string,
  layer: ValidationLayer,
  severity: Severity,
  message: string,
  extra: Partial<ValidationIssue> = {},
): ValidationIssue {
  return { ruleId, layer, severity, message, ...extra };
}

/* ------------------------------------------------------------------ */
/*  Rules                                                              */
/* ------------------------------------------------------------------ */

export const projectMdRules: ProjectMdRule[] = [
  /* ── name required ─────────────────────────────────────────────── */
  {
    id: 'project-name-required',
    layer: 'format',
    severity: 'error',
    description: 'PROJECT.md must have a name field',
    check: ({ frontmatter, filePath }) => {
      if (!frontmatter.name || typeof frontmatter.name !== 'string' || !frontmatter.name.trim()) {
        return [issue('project-name-required', 'format', 'error',
          '`name` is required and must be a non-empty string',
          { path: filePath, field: 'name', fix: 'Add `name: My Project` to frontmatter' },
        )];
      }
      return [];
    },
  },

  /* ── unknown root keys ─────────────────────────────────────────── */
  {
    id: 'project-unknown-key',
    layer: 'format',
    severity: 'warning',
    description: 'PROJECT.md frontmatter contains an unknown key',
    check: ({ frontmatter, filePath }) => {
      const issues: ValidationIssue[] = [];
      for (const key of Object.keys(frontmatter)) {
        if (!KNOWN_ROOT_KEYS.has(key)) {
          issues.push(issue('project-unknown-key', 'format', 'warning',
            `Unknown key "${key}" in PROJECT.md frontmatter`,
            { path: filePath, field: key, expected: [...KNOWN_ROOT_KEYS].join(', ') },
          ));
        }
      }
      return issues;
    },
  },

  /* ── discovery field types ─────────────────────────────────────── */
  {
    id: 'project-discovery-shape',
    layer: 'format',
    severity: 'error',
    description: 'discovery must be an object with valid sub-keys',
    check: ({ frontmatter, filePath }) => {
      const disc = frontmatter.discovery;
      if (disc === undefined) return [];

      if (typeof disc !== 'object' || disc === null || Array.isArray(disc)) {
        return [issue('project-discovery-shape', 'format', 'error',
          '`discovery` must be an object',
          { path: filePath, field: 'discovery', actual: typeof disc, expected: 'object' },
        )];
      }

      const issues: ValidationIssue[] = [];
      const d = disc as Record<string, unknown>;

      for (const key of Object.keys(d)) {
        if (!KNOWN_DISCOVERY_KEYS.has(key)) {
          issues.push(issue('project-discovery-shape', 'format', 'warning',
            `Unknown discovery key "${key}"`,
            { path: filePath, field: `discovery.${key}`, expected: [...KNOWN_DISCOVERY_KEYS].join(', ') },
          ));
        }
      }

      if (d.watch !== undefined && typeof d.watch !== 'boolean') {
        issues.push(issue('project-discovery-shape', 'format', 'error',
          '`discovery.watch` must be a boolean',
          { path: filePath, field: 'discovery.watch', actual: typeof d.watch, expected: 'boolean' },
        ));
      }

      if (d.spawn !== undefined && !VALID_SPAWN_VALUES.has(d.spawn as string)) {
        issues.push(issue('project-discovery-shape', 'format', 'error',
          `\`discovery.spawn\` must be "subtasks-only" or "unrestricted"`,
          { path: filePath, field: 'discovery.spawn', actual: d.spawn, expected: 'subtasks-only | unrestricted' },
        ));
      }

      // Array fields
      for (const arrayKey of ['tasks', 'epics', 'checks', 'plans', 'agents', 'skills']) {
        if (d[arrayKey] !== undefined && !Array.isArray(d[arrayKey])) {
          issues.push(issue('project-discovery-shape', 'format', 'error',
            `\`discovery.${arrayKey}\` must be an array`,
            { path: filePath, field: `discovery.${arrayKey}`, actual: typeof d[arrayKey], expected: 'array' },
          ));
        }
      }

      return issues;
    },
  },

  /* ── runtime field types ───────────────────────────────────────── */
  {
    id: 'project-runtime-shape',
    layer: 'format',
    severity: 'error',
    description: 'runtime must be an object with valid sub-keys',
    check: ({ frontmatter, filePath }) => {
      const rt = frontmatter.runtime;
      if (rt === undefined) return [];

      if (typeof rt !== 'object' || rt === null || Array.isArray(rt)) {
        return [issue('project-runtime-shape', 'format', 'error',
          '`runtime` must be an object',
          { path: filePath, field: 'runtime', actual: typeof rt, expected: 'object' },
        )];
      }

      const issues: ValidationIssue[] = [];
      const r = rt as Record<string, unknown>;

      for (const key of Object.keys(r)) {
        if (!KNOWN_RUNTIME_KEYS.has(key)) {
          issues.push(issue('project-runtime-shape', 'format', 'warning',
            `Unknown runtime key "${key}"`,
            { path: filePath, field: `runtime.${key}`, expected: [...KNOWN_RUNTIME_KEYS].join(', ') },
          ));
        }
      }

      // Positive integer fields
      for (const numKey of ['maxIterations', 'maxStallCount', 'maxParallelTasks']) {
        if (r[numKey] !== undefined && (typeof r[numKey] !== 'number' || (r[numKey] as number) <= 0)) {
          issues.push(issue('project-runtime-shape', 'format', 'error',
            `\`runtime.${numKey}\` must be a positive number`,
            { path: filePath, field: `runtime.${numKey}`, actual: r[numKey], expected: 'positive number' },
          ));
        }
      }

      // Boolean fields
      for (const boolKey of ['parallelExecution', 'enableCheckpoints', 'jsonLogs']) {
        if (r[boolKey] !== undefined && typeof r[boolKey] !== 'boolean') {
          issues.push(issue('project-runtime-shape', 'format', 'error',
            `\`runtime.${boolKey}\` must be a boolean`,
            { path: filePath, field: `runtime.${boolKey}`, actual: typeof r[boolKey], expected: 'boolean' },
          ));
        }
      }

      if (r.logLevel !== undefined && !VALID_LOG_LEVELS.has(r.logLevel as string)) {
        issues.push(issue('project-runtime-shape', 'format', 'error',
          '`runtime.logLevel` must be debug, info, warn, or error',
          { path: filePath, field: 'runtime.logLevel', actual: r.logLevel, expected: 'debug | info | warn | error' },
        ));
      }

      if (r.milestone !== undefined && typeof r.milestone !== 'string') {
        issues.push(issue('project-runtime-shape', 'format', 'error',
          '`runtime.milestone` must be a string',
          { path: filePath, field: 'runtime.milestone', actual: typeof r.milestone, expected: 'string' },
        ));
      }

      return issues;
    },
  },

  /* ── hooks event names ─────────────────────────────────────────── */
  {
    id: 'project-hook-event-valid',
    layer: 'syntax',
    severity: 'warning',
    description: 'hook event names must be valid lifecycle events',
    check: ({ frontmatter, filePath }) => {
      const hooks = frontmatter.hooks;
      if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) return [];

      const issues: ValidationIssue[] = [];
      for (const event of Object.keys(hooks as Record<string, unknown>)) {
        if (!VALID_HOOK_EVENTS.has(event)) {
          issues.push(issue('project-hook-event-valid', 'syntax', 'warning',
            `Unknown hook event "${event}"`,
            { path: filePath, field: `hooks.${event}`, expected: 'Valid event (e.g., task:fail, project:complete)' },
          ));
        }
      }
      return issues;
    },
  },

  /* ── hooks values must be strings (script paths) ───────────────── */
  {
    id: 'project-hook-value-string',
    layer: 'format',
    severity: 'error',
    description: 'hook values must be strings (script paths)',
    check: ({ frontmatter, filePath }) => {
      const hooks = frontmatter.hooks;
      if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) return [];

      const issues: ValidationIssue[] = [];
      for (const [event, value] of Object.entries(hooks as Record<string, unknown>)) {
        if (typeof value !== 'string') {
          issues.push(issue('project-hook-value-string', 'format', 'error',
            `Hook "${event}" must be a string (script path), got ${typeof value}`,
            { path: filePath, field: `hooks.${event}`, actual: typeof value, expected: 'string (script path)' },
          ));
        }
      }
      return issues;
    },
  },

  /* ── plugins must be array ─────────────────────────────────────── */
  {
    id: 'project-plugins-array',
    layer: 'format',
    severity: 'error',
    description: 'plugins must be an array',
    check: ({ frontmatter, filePath }) => {
      if (frontmatter.plugins !== undefined && !Array.isArray(frontmatter.plugins)) {
        return [issue('project-plugins-array', 'format', 'error',
          '`plugins` must be an array',
          { path: filePath, field: 'plugins', actual: typeof frontmatter.plugins, expected: 'array' },
        )];
      }
      return [];
    },
  },

  /* ── agents/skills must be string maps ──────────────────────────── */
  {
    id: 'project-string-map-shape',
    layer: 'format',
    severity: 'error',
    description: 'agents and skills must be objects mapping names to paths',
    check: ({ frontmatter, filePath }) => {
      const issues: ValidationIssue[] = [];
      for (const field of ['agents', 'skills'] as const) {
        const val = frontmatter[field];
        if (val === undefined) continue;

        if (typeof val !== 'object' || val === null || Array.isArray(val)) {
          issues.push(issue('project-string-map-shape', 'format', 'error',
            `\`${field}\` must be an object mapping names to paths`,
            { path: filePath, field, actual: typeof val, expected: 'object' },
          ));
          continue;
        }

        for (const [key, v] of Object.entries(val as Record<string, unknown>)) {
          if (typeof v !== 'string') {
            issues.push(issue('project-string-map-shape', 'format', 'error',
              `\`${field}.${key}\` must be a string (file path)`,
              { path: filePath, field: `${field}.${key}`, actual: typeof v, expected: 'string' },
            ));
          }
        }
      }
      return issues;
    },
  },

  /* ── variables must be an object ────────────────────────────────── */
  {
    id: 'project-variables-object',
    layer: 'format',
    severity: 'error',
    description: 'variables must be an object',
    check: ({ frontmatter, filePath }) => {
      if (frontmatter.variables !== undefined) {
        if (typeof frontmatter.variables !== 'object' || frontmatter.variables === null || Array.isArray(frontmatter.variables)) {
          return [issue('project-variables-object', 'format', 'error',
            '`variables` must be an object',
            { path: filePath, field: 'variables', actual: typeof frontmatter.variables, expected: 'object' },
          )];
        }
      }
      return [];
    },
  },

  /* ── skill file paths must exist ─────────────────────────────── */
  {
    id: 'project-skill-file-exists',
    layer: 'structure',
    severity: 'error',
    description: 'Skill SKILL.md paths in PROJECT.md must exist on disk',
    check: ({ frontmatter, filePath }) => {
      const skills = frontmatter.skills;
      if (!skills || typeof skills !== 'object' || Array.isArray(skills)) return [];

      const projectDir = path.dirname(path.dirname(filePath)); // .converge/PROJECT.md → project root
      const issues: ValidationIssue[] = [];
      for (const [name, skillPath] of Object.entries(skills as Record<string, unknown>)) {
        if (typeof skillPath !== 'string') continue; // type error caught by project-string-map-shape
        const resolved = path.resolve(projectDir, skillPath);
        if (!existsSync(resolved)) {
          issues.push(issue('project-skill-file-exists', 'structure', 'error',
            `Skill "${name}" points to "${skillPath}" which does not exist`,
            { path: filePath, field: `skills.${name}`, actual: skillPath, fix: `Create ${resolved} or fix the path` },
          ));
        }
      }
      return issues;
    },
  },

  /* ── hook script paths must exist ────────────────────────────── */
  {
    id: 'project-hook-file-exists',
    layer: 'structure',
    severity: 'warning',
    description: 'Hook script paths in PROJECT.md must exist on disk',
    check: ({ frontmatter, filePath }) => {
      const hooks = frontmatter.hooks;
      if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) return [];

      const projectDir = path.dirname(path.dirname(filePath));
      const issues: ValidationIssue[] = [];
      for (const [event, scriptPath] of Object.entries(hooks as Record<string, unknown>)) {
        if (typeof scriptPath !== 'string') continue; // type error caught by project-hook-value-string
        const resolved = path.resolve(projectDir, scriptPath);
        if (!existsSync(resolved)) {
          issues.push(issue('project-hook-file-exists', 'structure', 'warning',
            `Hook "${event}" points to "${scriptPath}" which does not exist`,
            { path: filePath, field: `hooks.${event}`, actual: scriptPath, fix: `Create ${resolved} or fix the path` },
          ));
        }
      }
      return issues;
    },
  },
];
