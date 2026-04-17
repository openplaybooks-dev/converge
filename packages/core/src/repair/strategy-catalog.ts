/**
 * Unified Strategy System
 *
 * Replaces the static priority-ordered pipeline with an AI-driven selector
 * that sees ALL available strategies (both TS classes and TASK.md skills)
 * as a flat registry, picks the best one for each gap, and lets each
 * strategy declare how it gathers its own context.
 *
 * ## Design
 *
 * Every strategy — whether a TypeScript FixStrategy class or a TASK.md
 * repair skill — registers itself with a StrategyDescriptor:
 *
 *   { name, description, gapKinds, contextProvider, ... }
 *
 * When a gap needs fixing:
 *   1. Registry builds a catalog of eligible strategies + their descriptions
 *   2. AI selector receives: gap summary + catalog + attempt history
 *   3. AI returns JSON: { strategy: "name", reasoning: "why" }
 *   4. Selected strategy's contextProvider gathers its specific context
 *   5. Strategy executes with that context
 *   6. If it fails, AI selector picks the NEXT best (excluding tried ones)
 *
 * ## Context Providers
 *
 * Each strategy declares HOW it gathers context before execution:
 *
 *   - cmd:    Run shell commands, use stdout as context
 *   - files:  Read specific file paths
 *   - prompt: Ask a sub-AI question to gather structured context
 *   - gap:    Extract directly from gap.metadata (zero cost)
 *   - custom: Arbitrary async function
 *
 * This means DependencyBackoff can run `grep -rl` to find producers,
 * WBSGenerator can read the generator source, and CheckFailedRepair
 * can run the failing check to get fresh output — all declared
 * declaratively in their descriptor.
 */

import type { Gap } from '../gap/types.ts';
import { toCompactGap } from '../gap/types.ts';
import type { FixStrategy, StrategyContext, StrategyOutcome, JournalContext } from './types.ts';
import { HistoryIndexBuilder } from './history-index.ts';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { check as shellCheck } from '../facts/api.ts';
import { parseTaskMd } from '../config/task-md-definition.ts';

/* ------------------------------------------------------------------ */
/*  Context Provider — how a strategy gathers its context              */
/* ------------------------------------------------------------------ */

/**
 * A single context gathering step.
 * Strategies compose multiple steps to build their context.
 */
export type ContextStep =
  | { type: 'gap'; /** Extract fields from gap.metadata */ fields: string[] }
  | { type: 'cmd'; /** Shell command to run */ cmd: string; /** Label for the output */ label: string }
  | { type: 'file'; /** File path (relative to project) */ path: string; label: string; optional?: boolean }
  | { type: 'files'; /** Glob pattern */ pattern: string; label: string; maxFiles?: number }
  | { type: 'prompt'; /** Sub-question to ask AI */ question: string; label: string }
  | { type: 'custom'; /** Arbitrary async function */ fn: (gap: Gap, projectDir: string) => Promise<string>; label: string };

/**
 * Gathered context from running all context steps.
 * Passed to the strategy as a structured object.
 */
export interface GatheredContext {
  /** Map of label → gathered content */
  sections: Record<string, string>;
  /** Serialized as a single string for prompt inclusion */
  asPromptSection(): string;
}

/* ------------------------------------------------------------------ */
/*  Strategy Descriptor — unified metadata for TS + TASK.md           */
/* ------------------------------------------------------------------ */

/**
 * Every strategy (TS class or TASK.md) registers with this descriptor.
 * The AI selector uses name + description + gapKinds to pick strategies.
 */
export interface StrategyDescriptor {
  /** Unique name (used as identifier in AI selection) */
  name: string;
  /** Human-readable description of what this strategy does and when to use it.
   *  The AI selector reads this to decide which strategy fits the gap. */
  description: string;
  /** Gap kinds this strategy can handle */
  gapKinds: string[];
  /** How this strategy gathers its context before execution */
  contextSteps: ContextStep[];
  /** Whether this is a TS class strategy or a TASK.md strategy */
  type: 'builtin' | 'skill';
  /** Reference to the TS FixStrategy (if builtin) */
  strategy?: FixStrategy;
  /** Path to TASK.md (if skill-based) */
  skillPath?: string;
  /** Deterministic (no AI needed) — AI selector skips these, they run first */
  deterministic?: boolean;
  /** Priority hint for ordering when AI is unavailable (higher = earlier) */
  priority?: number;
}

/* ------------------------------------------------------------------ */
/*  Unified Strategy Registry                                          */
/* ------------------------------------------------------------------ */

export class UnifiedStrategyRegistry {
  private descriptors: Map<string, StrategyDescriptor> = new Map();

  /**
   * Register a builtin TS strategy with its descriptor.
   */
  registerBuiltin(strategy: FixStrategy, descriptor: Omit<StrategyDescriptor, 'type' | 'strategy'>): void {
    this.descriptors.set(descriptor.name, {
      ...descriptor,
      type: 'builtin',
      strategy,
    });
  }

  /**
   * Register a TASK.md repair skill by scanning its frontmatter.
   */
  async registerSkill(skillPath: string): Promise<void> {
    if (!existsSync(skillPath)) return;

    try {
      const parsed = await parseTaskMd(skillPath);
      if (!parsed) return;

      const name = parsed.def.title ?? skillPath;
      const description = parsed.def.description ?? `Repair skill at ${skillPath}`;
      const gapKinds = (parsed.def.tags as string[])?.filter(t => t.startsWith('gap:'))
        .map(t => t.replace('gap:', '')) ?? ['output', 'check-failed'];

      this.descriptors.set(name, {
        name,
        description,
        gapKinds,
        contextSteps: [
          // Skills always get gap context as a file
          { type: 'gap', fields: ['gapKind', 'checkCmd', 'checkOutput', 'taskTitle', 'inputPattern'] },
        ],
        type: 'skill',
        skillPath,
      });
    } catch {
      // Skip unparseable skills
    }
  }

  /**
   * Scan a directory for TASK.md repair skills and register all of them.
   */
  async scanAndRegisterSkills(repairSkillsDir: string): Promise<number> {
    if (!existsSync(repairSkillsDir)) return 0;

    let count = 0;
    for (const d of readdirSync(repairSkillsDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const skillMd = join(repairSkillsDir, d.name, 'TASK.md');
      if (existsSync(skillMd)) {
        await this.registerSkill(skillMd);
        count++;
      }
    }
    return count;
  }

  /**
   * Get all descriptors eligible for a gap kind.
   * Deterministic strategies first, then by priority.
   */
  getEligible(gapKind: string): StrategyDescriptor[] {
    const all = Array.from(this.descriptors.values())
      .filter(d => d.gapKinds.includes(gapKind) || d.gapKinds.includes('*'));

    // Sort: deterministic first, then by priority descending
    return all.sort((a, b) => {
      if (a.deterministic && !b.deterministic) return -1;
      if (!a.deterministic && b.deterministic) return 1;
      return (b.priority ?? 5) - (a.priority ?? 5);
    });
  }

  /**
   * Get a specific descriptor by name.
   */
  get(name: string): StrategyDescriptor | undefined {
    return this.descriptors.get(name);
  }

  /**
   * Get all registered descriptors.
   */
  getAll(): StrategyDescriptor[] {
    return Array.from(this.descriptors.values());
  }

  /**
   * Format the catalog for AI selector prompt.
   * Shows name + description + gap kinds for each strategy.
   */
  formatCatalogForAI(eligible: StrategyDescriptor[]): string {
    const lines = eligible.map((d, i) => {
      const typeTag = d.deterministic ? ' [deterministic]' : d.type === 'skill' ? ' [skill]' : '';
      return `${i + 1}. **${d.name}**${typeTag}\n   ${d.description}\n   Handles: ${d.gapKinds.join(', ')}`;
    });
    return lines.join('\n\n');
  }
}

/* ------------------------------------------------------------------ */
/*  Context Gatherer — executes context steps for a strategy           */
/* ------------------------------------------------------------------ */

export async function gatherContext(
  steps: ContextStep[],
  gap: Gap,
  projectDir: string,
): Promise<GatheredContext> {
  const sections: Record<string, string> = {};

  for (const step of steps) {
    try {
      switch (step.type) {
        case 'gap': {
          const parts: string[] = [];
          for (const field of step.fields) {
            const value = gap.metadata?.[field];
            if (value !== undefined) {
              parts.push(`${field}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
            }
          }
          if (parts.length > 0) {
            sections['gap-metadata'] = parts.join('\n');
          }
          break;
        }

        case 'cmd': {
          const result = await shellCheck(step.cmd, projectDir, 10_000);
          sections[step.label] = result.output || `(exit ${result.exitCode})`;
          break;
        }

        case 'file': {
          const fullPath = join(projectDir, step.path);
          if (existsSync(fullPath)) {
            const content = await readFile(fullPath, 'utf-8');
            // Truncate large files
            sections[step.label] = content.length > 2000
              ? content.slice(0, 2000) + '\n...[truncated]'
              : content;
          } else if (!step.optional) {
            sections[step.label] = `(file not found: ${step.path})`;
          }
          break;
        }

        case 'files': {
          const { glob } = await import('glob');
          const matches = await glob(step.pattern, { cwd: projectDir });
          const maxFiles = step.maxFiles ?? 5;
          const shown = matches.slice(0, maxFiles);
          const listing = shown.map(f => `- ${f}`).join('\n');
          const extra = matches.length > maxFiles ? `\n... and ${matches.length - maxFiles} more` : '';
          sections[step.label] = listing + extra || '(no files matched)';
          break;
        }

        case 'prompt': {
          // Sub-AI question — deferred for now (would need AIContext)
          sections[step.label] = `(AI sub-question: ${step.question})`;
          break;
        }

        case 'custom': {
          sections[step.label] = await step.fn(gap, projectDir);
          break;
        }
      }
    } catch (err: any) {
      sections[(step as any).label ?? step.type] = `(error: ${err.message})`;
    }
  }

  return {
    sections,
    asPromptSection() {
      return Object.entries(sections)
        .map(([label, content]) => `### ${label}\n${content}`)
        .join('\n\n');
    },
  };
}

/* ------------------------------------------------------------------ */
/*  AI Strategy Selector                                               */
/* ------------------------------------------------------------------ */

/**
 * AI selection result — which strategy to try and why.
 */
export interface AISelectionResult {
  /** Name of the selected strategy */
  strategy: string;
  /** Why this strategy was chosen */
  reasoning: string;
  /** Whether AI was actually used (false = rule-based fallback) */
  usedAI: boolean;
}

/**
 * Build the AI selection prompt.
 * Designed to be cheap (~500 tokens input, ~100 tokens output).
 */
export function buildSelectionPrompt(
  gap: Gap,
  catalog: string,
  historySection: string,
  triedStrategies: string[],
): string {
  const compact = toCompactGap(gap);
  const triedList = triedStrategies.length > 0
    ? `\n\n## Already Tried (DO NOT select these)\n${triedStrategies.map(s => `- ${s}`).join('\n')}`
    : '';

  return `Select the best repair strategy for this gap.

## Gap
- Kind: ${compact.kind}
- Target: ${compact.target}
- Status: ${compact.status}
- Description: ${gap.description}

## Available Strategies

${catalog}
${triedList}

${historySection}

## Instructions

Pick ONE strategy name. Return JSON only:
{"strategy": "<name>", "reasoning": "<one sentence why>"}`;
}

/**
 * Build the AI planning prompt for multi-step plan tree generation.
 * Returns a JSON graph of nodes (not a single strategy name).
 *
 * Context files are listed as paths — AI reads only what is relevant
 * using the Read tool, avoiding context overflow from inlining raw data.
 */
export function buildPlanningPrompt(
  gap: Gap,
  catalog: string,
  historySection: string,
  triedStrategies: string[],
  predicates: string[],
  contextFiles: string[] = [],
  maxDepth: number = 3,
): string {
  const compact = toCompactGap(gap);
  const triedList = triedStrategies.length > 0
    ? `\n\n## Already Tried (exclude from plan)\n${triedStrategies.map(s => `- ${s}`).join('\n')}`
    : '';
  const filesSection = contextFiles.length > 0
    ? `\n\n## Context Files (read only if relevant to your decision)\n${contextFiles.map(f => `- \`${f}\``).join('\n')}`
    : '';

  return `Generate a repair plan graph for this gap.

## Gap
- Kind: ${compact.kind}
- Target: ${compact.target}
- Status: ${compact.status}
- Description: ${gap.description}

## Strategy History
${historySection || '(no history — first attempt)'}
${triedList}
${filesSection}

## Available Strategies
${catalog}

## Available Predicates
${predicates.map(p => `- \`${p}\``).join('\n')}

## Instructions

Read context files above only if you need to understand the failure before planning.

Return a JSON plan graph with flat nodes and edges arrays:

- **action node**: \`{"id":"<unique-id>","type":"action","handler":"<strategy-name>"}\`
- **condition node**: \`{"id":"<unique-id>","type":"condition","test":"<predicate>"}\`

Nodes are executed in array order. Conditions pair with the next action node:
- condition(true) → execute next action, then skip past it
- condition(false) → skip next action

Rules:
- Only use strategy names from Available Strategies above
- Only use predicate names from Available Predicates above
- Do NOT include already-tried strategies
- If uncertain, use a single action node
- Each node needs a unique id

Example:
{"plan":{"nodes":[{"id":"backoff","type":"action","handler":"dependency-backoff"},{"id":"check-success","type":"condition","test":"last-succeeded"},{"id":"retry","type":"action","handler":"task-run"}],"edges":[]},"reasoning":"Try upstream producer; if resolved retry task."}

Return JSON only:`;
}

/* ------------------------------------------------------------------ */
/*  Builtin Strategy Descriptors                                       */
/* ------------------------------------------------------------------ */

/**
 * Create descriptors for all builtin strategies.
 * Call this to register them with the UnifiedStrategyRegistry.
 */
export function getBuiltinDescriptors(): Array<{ descriptor: Omit<StrategyDescriptor, 'type' | 'strategy'>; strategyClass: string }> {
  return [
    {
      strategyClass: 'UserQuestionResumeStrategy',
      descriptor: {
        name: 'user-question-resume',
        description: 'Handles tasks waiting for user input. Creates RESUME.md with the answer so the task can continue without re-asking.',
        gapKinds: ['user-question', 'output'],
        contextSteps: [{ type: 'gap', fields: ['awaitingUserInput', 'userQuestion', 'userQuestionOptions'] }],
        deterministic: true,
        priority: 10,
      },
    },
    {
      strategyClass: 'WBSGeneratorRepairStrategy',
      descriptor: {
        name: 'wbs-generator-repair',
        description: 'Fixes systemic bugs in WBS task generator code. Runs 4-phase repair: diagnose generator → fix code → apply → regenerate subtasks. Use when multiple subtasks fail with the same pattern.',
        gapKinds: ['wbs'],
        contextSteps: [
          { type: 'gap', fields: ['isSystemicIssue', 'generatorPath'] },
          { type: 'file', path: '', label: 'generator-code', optional: true },
        ],
        deterministic: false,
        priority: 10,
      },
    },
    {
      strategyClass: 'DependencyBackoffStrategy',
      descriptor: {
        name: 'dependency-backoff',
        description: 'Resolves missing input dependencies by finding the upstream producer task and scheduling it to run first. Generates DEPS.md dependency map, uses AI to identify the correct producer, injects LEARN.md with hints.',
        gapKinds: ['blocker', 'input', 'missing-intermediate'],
        contextSteps: [
          { type: 'gap', fields: ['inputPattern', 'missingInputs'] },
          { type: 'cmd', cmd: 'find .converge/epics -name "TASK.md" -exec grep -l "outputs:" {} \\; 2>/dev/null | head -20', label: 'producer-candidates' },
        ],
        deterministic: false,
        priority: 9,
      },
    },
    {
      strategyClass: 'MissingInputPatternRepairStrategy',
      descriptor: {
        name: 'missing-input-pattern',
        description: 'Fixes glob pattern mismatches where files exist but at a different path. Tests pattern variations (recursive, extra directory level, case changes) against the filesystem.',
        gapKinds: ['blocker', 'input'],
        contextSteps: [
          { type: 'gap', fields: ['inputPattern'] },
          { type: 'cmd', cmd: 'find . -maxdepth 4 -type f | head -50', label: 'filesystem-sample' },
        ],
        deterministic: true,
        priority: 8.5,
      },
    },
    {
      strategyClass: 'ToolEnvironmentRepairStrategy',
      descriptor: {
        name: 'tool-environment-repair',
        description: 'Fixes external tool/environment issues when a task completed but outputs are wrong. Detects missing tools (command not found), version mismatches, format changes, and missing env vars.',
        gapKinds: ['output', 'check-failed'],
        contextSteps: [
          { type: 'gap', fields: ['taskCompletedSuccessfully', 'checkOutput'] },
        ],
        deterministic: false,
        priority: 8,
      },
    },
    {
      strategyClass: 'SkillBasedRepairStrategy',
      descriptor: {
        name: 'skill-based-repair',
        description: 'Context-aware repair via TASK.md repair skills. Each skill declares what context it needs (files, commands, gap metadata) in its frontmatter. The strategy gathers that context from the environment, writes it to the filesystem, and invokes the skill. Handles all gap types via specialized repair skills.',
        gapKinds: ['check-failed', 'output', 'corrupted', 'blocker', 'input', 'missing-intermediate'],
        contextSteps: [
          { type: 'gap', fields: ['gapKind', 'checkCmd', 'checkOutput', 'taskTitle', 'allMissingItems', 'inputPattern'] },
        ],
        deterministic: false,
        priority: 6,
      },
    },
    {
      strategyClass: 'TaskRunStrategy',
      descriptor: {
        name: 'task-run',
        description: 'Last resort — re-executes the full task with TASK.md + CHECK.md + LEARN.md context. Handles all gap types but is expensive (full AI execution). Use only when targeted strategies have failed.',
        gapKinds: ['output', 'check-failed', 'corrupted'],
        contextSteps: [
          { type: 'gap', fields: ['taskTitle', 'taskPrompt', 'taskAgent', 'taskSkill'] },
        ],
        deterministic: false,
        priority: 5,
      },
    },
  ];
}
