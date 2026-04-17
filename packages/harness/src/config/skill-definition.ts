/**
 * Shared parsers and legacy aliases
 *
 * Shared sub-parsers (parseChecks, parseAutoHarness, parseDiagnosisHints,
 * parseContextSteps) remain here and are consumed by both the legacy
 * parseSkillMd path and the new parseTaskMd in task-md-definition.ts.
 *
 * SkillTaskDef and parseSkillMd are kept as backward-compat aliases;
 * new code should use TaskMdDef / parseTaskMd instead.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import type { DiagnosisHint } from '../lifecycle/diagnose.ts';
import type { CheckDef } from '../lifecycle/after.ts';

/* ------------------------------------------------------------------ */
/*  Auto-harness policy                                                 */
/* ------------------------------------------------------------------ */

export type EnrichField = 'inputs' | 'outputs' | 'checks' | 'diagnosis-hints';

/**
 * Controls how auto-harness enriches the TASK.md frontmatter before a task runs.
 * When set to `true`, defaults to `{ mode: 'ai', enrich: ['inputs', 'outputs', 'checks'] }`.
 */
export interface AutoHarnessPolicy {
  /** 'ai' = Claude infers checks from task body; 'script' = run a shell script */
  mode: 'ai' | 'script';
  /** Path to script (for mode: script) — must print YAML to stdout */
  script?: string;
  /** Which frontmatter fields to auto-fill (default: inputs, outputs, checks) */
  enrich?: EnrichField[];
  /** Overwrite fields that already have values (default: false — only fill missing) */
  overwrite?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Interface                                                           */
/* ------------------------------------------------------------------ */

/** @deprecated Use TaskMdDef from task-md-definition.ts instead */
export interface SkillTaskDef {
  name: string;
  description?: string;
  agent?: string;
  skill?: string | string[];
  inputs?: string[];
  outputs?: string[];
  checks?: CheckDef[];
  /**
   * Pre-conditions: shell commands run in the before hook before the agent launches.
   * If any fail the task is blocked (gap emitted) until conditions are met.
   * Unlike `inputs` (glob-based file presence), `needs` supports any shell check.
   */
  needs?: CheckDef[];
  dependencies?: string[];
  tags?: string[];
  'next-skills'?: string[];
  'allowed-tools'?: string[];
  'related-skills'?: string[];
  /** Pattern-based failure hints — matched before calling AI for diagnosis */
  'diagnosis-hints'?: DiagnosisHint[];
  /** Max inner correction attempts before falling to external pipeline (default: 2) */
  'correction-budget'?: number;
  /** How many ancestor task summaries to inject into before/context.md (default: 2) */
  'context-depth'?: number;
  /**
   * Auto-harness: enriches missing frontmatter fields (inputs/outputs/checks) before the task runs.
   * Writes directly into the TASK.md source — self-repair, idempotent by default.
   * Set to `true` for AI mode with defaults, or provide a full AutoHarnessPolicy.
   */
  'auto-harness'?: boolean | AutoHarnessPolicy;
  /**
   * Whether this task is a blocker (must complete successfully).
   * If true and task fails, tasks that depend on it will be blocked.
   *
   * Set to false for optional tasks that shouldn't block dependents.
   * Default: true (tasks block their dependents by default)
   */
  blocking?: boolean;

  /**
   * Plan configuration for plan mode tasks
   */
  plan?: {
    prompt?: string;
    output?: string;
    outputPrompt?: string;
  };

  /**
   * Context declarations — what context this skill needs before execution.
   * The framework gathers the declared context and writes it to the
   * attempt directory before invoking the skill.
   *
   * Each entry is a context step:
   *   - gap: extract fields from gap metadata (zero cost)
   *   - cmd: run a shell command, capture stdout
   *   - file: read a specific file path
   *   - files: glob for files, list matches
   *   - ai: ask AI a question to gather/analyze information
   *
   * Template variables (replaced at runtime):
   *   {checkCmd}     — the failing check command
   *   {checkOutput}  — error output from the failing check
   *   {inputPattern} — the missing input glob pattern
   *   {taskId}       — the task ID
   *   {attemptDir}   — path to the current attempt directory
   *   {projectDir}   — project root
   *
   * @example
   * ```yaml
   * context:
   *   - type: cmd
   *     cmd: "{checkCmd}"
   *     label: fresh-check-output
   *   - type: file
   *     path: "{attemptDir}/TASK.md"
   *     label: task-definition
   *   - type: ai
   *     prompt: "Read {attemptDir}/TASK.md and the check error below, then identify the root cause in 2-3 sentences.\n\nError: {checkOutput}"
   *     label: root-cause-analysis
   *     tools: [Read, Glob]
   * ```
   */
  context?: SkillContextStep[];
}

/* ------------------------------------------------------------------ */
/*  Context Step Types                                                  */
/* ------------------------------------------------------------------ */

/**
 * A single context gathering step declared in TASK.md frontmatter.
 * The framework executes these before invoking the skill, writing
 * the gathered data to the attempt directory.
 */
export type SkillContextStep =
  | { type: 'gap'; fields: string[] }
  | { type: 'cmd'; cmd: string; label: string }
  | { type: 'file'; path: string; label: string; optional?: boolean }
  | { type: 'files'; pattern: string; label: string; maxFiles?: number }
  | { type: 'ai'; prompt: string; label: string; tools?: string[]; timeoutMs?: number };

/**
 * Parse context steps from raw YAML value.
 */
export function parseContextSteps(raw: unknown): SkillContextStep[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const steps: SkillContextStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || !item.type) continue;

    switch (item.type) {
      case 'gap':
        if (Array.isArray(item.fields)) {
          steps.push({ type: 'gap', fields: item.fields.map(String) });
        }
        break;
      case 'cmd':
        if (typeof item.cmd === 'string' && typeof item.label === 'string') {
          steps.push({ type: 'cmd', cmd: item.cmd, label: item.label });
        }
        break;
      case 'file':
        if (typeof item.path === 'string' && typeof item.label === 'string') {
          steps.push({ type: 'file', path: item.path, label: item.label, optional: item.optional === true });
        }
        break;
      case 'files':
        if (typeof item.pattern === 'string' && typeof item.label === 'string') {
          steps.push({ type: 'files', pattern: item.pattern, label: item.label, maxFiles: typeof item.maxFiles === 'number' ? item.maxFiles : undefined });
        }
        break;
      case 'ai':
        if (typeof item.prompt === 'string' && typeof item.label === 'string') {
          steps.push({
            type: 'ai',
            prompt: item.prompt,
            label: item.label,
            tools: Array.isArray(item.tools) ? item.tools.map(String) : undefined,
            timeoutMs: typeof item.timeoutMs === 'number' ? item.timeoutMs : undefined,
          });
        }
        break;
    }
  }

  return steps.length > 0 ? steps : undefined;
}

/* ------------------------------------------------------------------ */
/*  Accessors                                                           */
/* ------------------------------------------------------------------ */

export function getDiagnosisHints(def: SkillTaskDef): DiagnosisHint[] {
  return def['diagnosis-hints'] ?? [];
}

export function getCorrectionBudget(def: SkillTaskDef): number {
  return def['correction-budget'] ?? 2;
}

export function getContextDepth(def: SkillTaskDef): number {
  return def['context-depth'] ?? 2;
}

export function getNeeds(def: SkillTaskDef): CheckDef[] {
  return def.needs ?? [];
}

export function getAutoHarnessPolicy(def: SkillTaskDef): AutoHarnessPolicy | false {
  const raw = def['auto-harness'];
  if (!raw) return false;
  if (raw === true) return { mode: 'ai', enrich: ['inputs', 'outputs', 'checks'], overwrite: false };
  return raw;
}

/* ------------------------------------------------------------------ */
/*  Parser                                                             */
/* ------------------------------------------------------------------ */

/**
 * @deprecated Use parseTaskMd from task-md-definition.ts instead.
 * Parse SKILL.md file into frontmatter + body.
 * Returns null if the file doesn't exist or can't be parsed.
 */
export async function parseSkillMd(skillMdPath: string): Promise<{
  def: SkillTaskDef;
  body: string;
} | null> {
  if (!existsSync(skillMdPath)) return null;

  try {
    const raw = await readFile(skillMdPath, 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return null;

    const frontmatter = match[1];
    const body = match[2] ?? '';

    const parsed = parseYaml(frontmatter) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;

    const def: SkillTaskDef = {
      name: String(parsed.name ?? ''),
      description: parsed.description ? String(parsed.description) : undefined,
      agent: parsed.agent ? String(parsed.agent) : undefined,
      skill: parsed.skill as string | string[] | undefined,
      inputs: Array.isArray(parsed.inputs) ? parsed.inputs.map(String) : undefined,
      outputs: Array.isArray(parsed.outputs) ? parsed.outputs.map(String) : undefined,
      checks: parseChecks(parsed.checks),
      needs: parseChecks(parsed.needs),
      dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies.map(String) : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : undefined,
      'next-skills': Array.isArray(parsed['next-skills']) ? parsed['next-skills'].map(String) : undefined,
      'allowed-tools': Array.isArray(parsed['allowed-tools']) ? parsed['allowed-tools'].map(String) : undefined,
      'related-skills': Array.isArray(parsed['related-skills']) ? parsed['related-skills'].map(String) : undefined,
      'diagnosis-hints': parseDiagnosisHints(parsed['diagnosis-hints']),
      'correction-budget': typeof parsed['correction-budget'] === 'number' ? parsed['correction-budget'] : undefined,
      'context-depth': typeof parsed['context-depth'] === 'number' ? parsed['context-depth'] : undefined,
      'auto-harness': parseAutoHarness(parsed['auto-harness']),
      blocking: parsed.blocking === false ? false : true,  // Default true, explicitly set false to opt-out
      context: parseContextSteps(parsed.context),
    };

    // Parse plan configuration
    if (parsed.plan && typeof parsed.plan === 'object') {
      const planObj = parsed.plan as Record<string, unknown>;
      def.plan = {};

      if (typeof planObj.prompt === 'string') {
        def.plan.prompt = planObj.prompt;
      }

      if (typeof planObj.output === 'string') {
        def.plan.output = planObj.output;
      }

      if (typeof planObj.outputPrompt === 'string') {
        def.plan.outputPrompt = planObj.outputPrompt;
      }
    }

    // CRITICAL: Validate that referenced skills exist
    if (def.skill) {
      const skills = Array.isArray(def.skill) ? def.skill : [def.skill];
      const { dirname, join } = await import('node:path');
      // SKILL.md path: .harness/epics/epic-id/task-id/SKILL.md
      // Go up 4 levels: SKILL.md → task-id → epic-id → epics → .harness
      const harnessDir = dirname(dirname(dirname(dirname(skillMdPath))));
      const skillsRoot = join(harnessDir, 'skills');

      // Import validation function
      const { validateSkillsExist } = await import('../executor/skill-resolver.ts');

      try {
        validateSkillsExist(skillsRoot, skills);
      } catch (err: any) {
        // Re-throw with more context about which SKILL.md file has the issue
        throw new Error(
          `SKILL.md validation failed: ${skillMdPath}\n\n${err.message}\n\n` +
          `Available skills in ${skillsRoot}:\n` +
          getAvailableSkillsList(skillsRoot)
        );
      }
    }

    return { def, body };
  } catch (err: any) {
    console.warn(`   ⚠️  Failed to parse SKILL.md: ${skillMdPath}`);
    console.warn(`   Error: ${err.message}`);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

import { readdirSync } from 'node:fs';

/**
 * Get a list of available skills in the skills directory
 */
function getAvailableSkillsList(skillsRoot: string): string {
  try {
    if (!existsSync(skillsRoot)) {
      return '  (skills directory does not exist)';
    }

    const dirs: string[] = readdirSync(skillsRoot, { withFileTypes: true })
      .filter((dirent: any) => dirent.isDirectory())
      .map((dirent: any) => dirent.name);

    if (dirs.length === 0) {
      return '  (no skills found)';
    }

    // Check which ones have TASK.md (preferred) or SKILL.md (legacy fallback)
    const validSkills = dirs.filter((dir: string) => {
      const taskMdPath = join(skillsRoot, dir, 'TASK.md');
      const skillMdPath = join(skillsRoot, dir, 'SKILL.md');
      return existsSync(taskMdPath) || existsSync(skillMdPath);
    });

    return validSkills.map((s: string) => `  - ${s}`).join('\n');
  } catch {
    return '  (unable to read skills directory)';
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-parsers                                                         */
/* ------------------------------------------------------------------ */

export function parseChecks(raw: unknown): CheckDef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const results: CheckDef[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object') {
      const c = item as Record<string, unknown>;
      if (c.id && c.cmd) {
        results.push({
          id: String(c.id),
          cmd: String(c.cmd),
          description: c.description ? String(c.description) : String(c.id),
        });
      }
    }
  }
  return results.length > 0 ? results : undefined;
}

export function parseAutoHarness(raw: unknown): boolean | AutoHarnessPolicy | undefined {
  if (raw === true || raw === false) return raw;
  if (raw && typeof raw === 'object') {
    const p = raw as Record<string, unknown>;
    return {
      mode: (p.mode === 'script' ? 'script' : 'ai') as 'ai' | 'script',
      script: p.script ? String(p.script) : undefined,
      enrich: Array.isArray(p.enrich)
        ? (p.enrich.map(String) as EnrichField[])
        : undefined,
      overwrite: typeof p.overwrite === 'boolean' ? p.overwrite : undefined,
    };
  }
  return undefined;
}

export function parseDiagnosisHints(raw: unknown): DiagnosisHint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const results: DiagnosisHint[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object') {
      const h = item as Record<string, unknown>;
      if (h.id && h.pattern && h.errorClass) {
        results.push({
          id: String(h.id),
          pattern: String(h.pattern),
          errorClass: String(h.errorClass) as DiagnosisHint['errorClass'],
          cause: String(h.cause ?? ''),
          fix: String(h.fix ?? ''),
          automatable: Boolean(h.automatable ?? false),
        });
      }
    }
  }
  return results.length > 0 ? results : undefined;
}
