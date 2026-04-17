/**
 * GapRepairPredicate
 *
 * Decision engine for gap repair. Given the current repair state,
 * returns a Graph to inject into the walker — or null when
 * all options are exhausted.
 *
 * Decision order:
 *  1. task-run not tried → always run it first (cheap, often enough)
 *  2. Confident to plan + no plan tried → generate plan via AI → inject subgraph
 *  3. Deterministic descriptor available → run it (zero AI cost)
 *  4. Single untried descriptor → run it (no AI needed)
 *  5. Multiple options → AI selects from catalog
 *  6. Unregistered TS fallback → run first untried
 *  7. null → exhausted
 */

import type { Gap } from '../gap/types.ts';
import type { FixStrategy, AttemptRecord, JournalContext } from './types.ts';
import type { StrategyDescriptor } from './strategy-catalog.ts';
import { buildSelectionPrompt, buildPlanningPrompt } from './strategy-catalog.ts';
import { HistoryIndexBuilder } from './history-index.ts';
import { RepairPlanSchema, isConfidentToPlan, listPredicates } from './plan.ts';
import type { GraphNode } from './navigator/types.ts';
import { createAIContext, READONLY_TOOLS } from '../ai/context.ts';
import { join } from 'node:path';

/* ------------------------------------------------------------------ */
/*  State types                                                        */
/* ------------------------------------------------------------------ */

/** All information the predicate needs to make a decision. Passed by reference — mutated in place. */
export interface RepairState {
  gap: Gap;
  tried: string[];
  descriptors: StrategyDescriptor[];
  tsEligible: FixStrategy[];
  extraTs: FixStrategy[];
  attempts: AttemptRecord[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let strategySeq = 0;

function strategyNode(strategy: string): GraphNode {
  const seq = ++strategySeq;
  return {
    id: `run-strategy:${strategy}#${seq}`,
    handler: 'run-strategy',
    status: 'buffered',
    origin: 'planned',
    data: { strategy, priority: 55 },
  };
}

/* ------------------------------------------------------------------ */
/*  GapRepairPredicate                                                  */
/* ------------------------------------------------------------------ */

export class GapRepairPredicate {
  constructor(
    private readonly projectDir: string,
    private readonly journalCtx: JournalContext,
  ) {}

  /**
   * Given current state, return nodes to add to the graph as buffered actions.
   * Returns null when all options are exhausted.
   */
  async decide(state: RepairState): Promise<{ nodes: GraphNode[] } | null> {
    const { gap, tried, descriptors, tsEligible, extraTs } = state;

    // 1. task-run always first
    const taskRun = tsEligible.find(s => s.name === 'task-run');
    if (taskRun && !tried.includes('task-run')) {
      return { nodes: [strategyNode('task-run')] };
    }

    // Steps 2+ only after task-run has been attempted
    if (tried.includes('task-run')) {
      const untriedDescriptors = descriptors.filter(d => !tried.includes(d.name));

      // 2. Generate new plan if confident and plan hasn't been tried yet
      if (!tried.includes('__plan__') && isConfidentToPlan([], gap) && untriedDescriptors.length >= 2) {
        const plan = await this.generatePlan(descriptors, gap, tried, []);
        if (plan) {
          console.log(`   🗺️  Plan: ${plan.reasoning}`);
          return plan.graph;
        }
      }
    }

    // 3-5. Single-strategy selection from remaining untried descriptors
    const untriedDescriptors = descriptors.filter(d => !tried.includes(d.name));

    // 3. Deterministic descriptor (no AI cost)
    const deterministic = untriedDescriptors.find(d => d.deterministic);
    if (deterministic) {
      return { nodes: [strategyNode(deterministic.name)] };
    }

    // 4. Single option — no AI needed
    if (untriedDescriptors.length === 1) {
      return { nodes: [strategyNode(untriedDescriptors[0].name)] };
    }

    // 5. AI selection
    if (untriedDescriptors.length > 0) {
      const selected = await this.selectNext(untriedDescriptors, gap, tried);
      if (selected) {
        return { nodes: [strategyNode(selected.name)] };
      }
    }

    // 6. Unregistered TS strategies (fallback)
    const untriedTs = extraTs.filter(s => !tried.includes(s.name));
    if (untriedTs.length > 0) {
      return { nodes: [strategyNode(untriedTs[0].name)] };
    }

    // 7. Exhausted
    return null;
  }

  /* ── AI strategy selection ──────────────────────────────────────── */

  private async selectNext(
    untried: StrategyDescriptor[],
    gap: Gap,
    tried: string[],
  ): Promise<StrategyDescriptor | null> {
    try {
      const catalog = untried.map((d, i) =>
        `${i + 1}. **${d.name}** (${d.type}): ${d.description}`
      ).join('\n');

      let historySection = '';
      try {
        const h = new HistoryIndexBuilder(this.projectDir, this.journalCtx);
        const s = await h.formatForPrompt();
        if (s) historySection = `\n## History\n${s}`;
      } catch { /* non-fatal */ }

      const prompt = buildSelectionPrompt(gap, catalog, historySection, tried);
      const aiCtx = createAIContext(this.projectDir, this.journalCtx);
      const resp = await aiCtx.ask(prompt, {
        phase: 'strategy-selection', label: 'select-strategy',
        allowedTools: [], timeoutMs: 30_000,  // no tools: pure reasoning from gap metadata
      });

      const text = resp.asText();
      const m = text.match(/\{[\s\S]*?"strategy"\s*:\s*"([^"]+)"[\s\S]*?\}/);
      if (m) {
        const found = untried.find(d => d.name === m[1]);
        if (found) {
          console.log(`   🎯 AI picked: ${found.name}`);
          return found;
        }
      }
    } catch { /* AI unavailable */ }

    // Fallback: highest priority (first in sorted list)
    return untried[0] ?? null;
  }

  /* ── Plan generation ────────────────────────────────────────────── */

  private async generatePlan(
    descriptors: StrategyDescriptor[],
    gap: Gap,
    tried: string[],
    history: Array<{ strategy: string; succeeded: boolean }>,
  ): Promise<{ reasoning: string; graph: { nodes: GraphNode[] } } | null> {
    try {
      const untried = descriptors.filter(d => !tried.includes(d.name));
      if (untried.length < 2) return null;

      // Collect context file paths — AI reads only what it needs
      const attemptDir = process.env.HARNESS_TASK_ATTEMPT_DIR;
      const contextFiles: string[] = [];
      if (attemptDir) {
        const { existsSync } = await import('node:fs');
        const { relative } = await import('node:path');
        for (const fname of ['FEEDBACK.md', 'LEARN.md', 'HARNESS.md']) {
          if (existsSync(join(attemptDir, fname))) {
            contextFiles.push(relative(this.projectDir, join(attemptDir, fname)).replace(/\\/g, '/'));
          }
        }
      }

      const catalog = untried.map((d, i) => `${i + 1}. **${d.name}**: ${d.description}`).join('\n');
      const historySection = history.map(h => `- ${h.strategy}: ${h.succeeded ? 'succeeded' : 'failed'}`).join('\n');
      const prompt = buildPlanningPrompt(gap, catalog, historySection, tried, listPredicates(), contextFiles);

      const aiCtx = createAIContext(this.projectDir, this.journalCtx);
      const plan = await aiCtx.askJson(prompt, RepairPlanSchema, {
        phase: 'plan-generation',
        label: 'generate-repair-plan',
        allowedTools: [...READONLY_TOOLS],
        timeoutMs: 45_000,
      });

      if (plan) {
        const nodes = plan.plan.nodes as GraphNode[];
        return { reasoning: plan.reasoning, graph: { nodes } };
      }
    } catch {
      return null;
    }
    return null;
  }
}
