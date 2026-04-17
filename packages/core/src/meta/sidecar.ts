/**
 * Meta-Optimization Sidecar
 *
 * Runs as a sidecar task alongside the orchestrator, listening to task lifecycle
 * events and triggering self-optimization analysis at regular intervals.
 *
 * This is the recommended way to integrate Meta-Converge-style self-optimization
 * into the converge — it uses the existing sidecar infrastructure to hook into
 * task:complete and task:fail events without modifying the convergence loop.
 *
 * Usage:
 *   // In converge.ts or epic setup:
 *   import { MetaOptimizationSidecar } from '../meta/index.ts';
 *   const sidecar = new MetaOptimizationSidecar(projectDir);
 *   sidecar.registerWith(sidecarRunner);
 *
 * Output:
 *   .converge/meta/proposals/{timestamp}-proposal.md   — human-readable
 *   .converge/meta/proposals/{timestamp}-proposal.json  — machine-readable
 *   .converge/meta/latest-stats.json                    — running statistics
 */

import type { SidecarHooks, SidecarContext } from '../sidecar/types.ts';
import type { SidecarRunner } from '../sidecar/runner.ts';
import { MetaAnalyzer } from './analyzer.ts';
import type { MetaAnalyzerConfig, MetaAnalysisStats, ImprovementProposal } from './analyzer.ts';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

export interface SidecarConfig {
  /** Run meta-analysis after every N task completions (default: 10) */
  taskInterval: number;
  /** Maximum number of recent tasks to analyze (default: 20) */
  maxTasksToAnalyze: number;
  /** Also run analysis on epic:complete (default: true) */
  analyzeOnEpicComplete: boolean;
  /** Run analysis on convergence:stalled (default: true) — most useful context */
  analyzeOnStall: boolean;
  /** Auto-create repair skills for repeated failure patterns (default: true) */
  autoCreateRepairSkills: boolean;
  /** Minimum failure count before auto-creating a repair skill (default: 3) */
  skillCreationThreshold: number;
}

const DEFAULT_SIDECAR_CONFIG: SidecarConfig = {
  taskInterval: 10,
  maxTasksToAnalyze: 20,
  analyzeOnEpicComplete: true,
  analyzeOnStall: true,
  autoCreateRepairSkills: true,
  skillCreationThreshold: 3,
};

/* ------------------------------------------------------------------ */
/*  Sidecar Implementation                                             */
/* ------------------------------------------------------------------ */

export class MetaOptimizationSidecar {
  private analyzer: MetaAnalyzer;
  private config: SidecarConfig;
  private completedCount = 0;
  private failedCount = 0;

  /** Sidecar task ID used for registration */
  static readonly TASK_ID = '__meta-optimization-sidecar__';

  constructor(
    private readonly projectDir: string,
    config?: Partial<SidecarConfig>,
  ) {
    this.config = { ...DEFAULT_SIDECAR_CONFIG, ...config };
    this.analyzer = new MetaAnalyzer(projectDir, {
      taskInterval: this.config.taskInterval,
      maxTasksToAnalyze: this.config.maxTasksToAnalyze,
    });
  }

  /**
   * Register this sidecar with the SidecarRunner.
   * Hooks into task:complete, task:fail, epic:complete, and convergence:stalled.
   */
  registerWith(runner: SidecarRunner): void {
    if (runner.has(MetaOptimizationSidecar.TASK_ID)) {
      return; // Already registered
    }

    const hooks = this.buildHooks();

    runner.start(
      MetaOptimizationSidecar.TASK_ID,
      hooks,
    ).catch(err => {
      console.warn(`[MetaOptimizationSidecar] Failed to register: ${err.message}`);
    });
  }

  /**
   * Build the sidecar hooks map.
   */
  buildHooks(): SidecarHooks {
    return {
      'task:complete': async (payload, ctx) => {
        this.completedCount++;
        const taskId = (payload as any)?.taskId ?? 'unknown';

        // Notify analyzer (it tracks interval internally)
        await this.analyzer.onTaskCompleted(taskId, 'completed');

        // Write running stats periodically
        if ((this.completedCount + this.failedCount) % 5 === 0) {
          await this.writeRunningStats(ctx);
        }
      },

      'task:fail': async (payload, ctx) => {
        this.failedCount++;
        const taskId = (payload as any)?.taskId ?? 'unknown';

        // Notify analyzer
        await this.analyzer.onTaskCompleted(taskId, 'failed');
      },

      'epic:complete': async (payload, ctx) => {
        if (!this.config.analyzeOnEpicComplete) return;

        // Always run analysis at end of epic — captures full picture
        ctx.log.info('Epic complete — running final meta-analysis');
        try {
          const proposal = await this.analyzer.runAnalysis();
          if (proposal && proposal.proposals.length > 0) {
            ctx.log.info(`Meta-analysis found ${proposal.proposals.length} improvement proposal(s)`);
          }
        } catch (err: any) {
          ctx.log.warn(`Meta-analysis failed: ${err.message}`);
        }
      },

      'convergence:stalled': async (payload, ctx) => {
        if (!this.config.analyzeOnStall) return;

        // Stalls are the most valuable time to analyze — something systematic is failing
        ctx.log.info('Convergence stalled — running diagnostic meta-analysis');
        try {
          const proposal = await this.analyzer.runAnalysis();
          if (proposal && proposal.proposals.length > 0) {
            ctx.log.warn(
              `Found ${proposal.proposals.length} potential fix(es). ` +
              `Check .converge/meta/proposals/ for details.`
            );
          }
        } catch (err: any) {
          ctx.log.warn(`Meta-analysis failed: ${err.message}`);
        }
      },
    };
  }

  /**
   * Write running statistics to .converge/meta/latest-stats.json.
   * Quick snapshot for dashboards/monitoring without full analysis.
   */
  private async writeRunningStats(ctx: SidecarContext): Promise<void> {
    try {
      const statsDir = join(this.projectDir, '.converge', 'meta');
      await mkdir(statsDir, { recursive: true });

      const stats = {
        updatedAt: new Date().toISOString(),
        completedTasks: this.completedCount,
        failedTasks: this.failedCount,
        totalTasks: this.completedCount + this.failedCount,
        successRate: this.completedCount + this.failedCount > 0
          ? this.completedCount / (this.completedCount + this.failedCount)
          : 0,
      };

      await writeFile(
        join(statsDir, 'latest-stats.json'),
        JSON.stringify(stats, null, 2),
      );
    } catch {
      // Non-fatal
    }
  }

  /**
   * Force an immediate analysis (useful for CLI commands).
   */
  async forceAnalysis(): Promise<void> {
    const proposal = await this.analyzer.runAnalysis();
    if (proposal && this.config.autoCreateRepairSkills) {
      await this.maybeCreateRepairSkills(proposal);
    }
  }

  /**
   * Get current counts.
   */
  getStats(): { completed: number; failed: number } {
    return {
      completed: this.completedCount,
      failed: this.failedCount,
    };
  }

  /* ── Skill auto-creation ─────────────────────────────────────────── */

  /**
   * When meta-analysis identifies repeated failure patterns that no existing
   * repair skill handles, auto-create a custom repair skill for that pattern.
   *
   * Created skills go to: .converge/skills/repair/repair-custom-{slug}/SKILL.md
   *
   * The SkillBasedRepairStrategy will pick them up automatically since it
   * scans the repair skills directory on each invocation.
   */
  private async maybeCreateRepairSkills(proposal: ImprovementProposal): Promise<void> {
    if (!this.config.autoCreateRepairSkills) return;

    const repairSkillsDir = join(this.projectDir, '.converge', 'skills', 'repair');

    for (const p of proposal.proposals) {
      // Only auto-create for "repeated failure" proposals
      if (!p.title.startsWith('Add strategy for repeated failure')) continue;

      // Extract the failure pattern from the rationale
      const patternMatch = p.rationale.match(/The failure "([^"]+)"/);
      if (!patternMatch) continue;

      const failurePattern = patternMatch[1];
      const slug = failurePattern
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);

      const skillName = `repair-custom-${slug}`;
      const skillDir = join(repairSkillsDir, skillName);
      const skillMd = join(skillDir, 'SKILL.md');

      // Don't overwrite existing custom skills
      if (existsSync(skillMd)) continue;

      // Create the custom repair skill
      await mkdir(skillDir, { recursive: true });

      const content = this.generateCustomRepairSkill(skillName, failurePattern, p);
      await writeFile(skillMd, content);

      console.log(`   🔧 Auto-created repair skill: ${skillName}`);
      console.log(`   📂 ${skillMd}`);
    }
  }

  /**
   * Generate a SKILL.md for a custom repair skill targeting a specific failure pattern.
   */
  private generateCustomRepairSkill(
    skillName: string,
    failurePattern: string,
    proposal: ImprovementProposal['proposals'][0],
  ): string {
    return `---
name: ${skillName}
description: "Auto-generated repair skill for: ${failurePattern.slice(0, 80)}"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
tags:
  - auto-generated
  - meta-optimization
---

# Custom Repair: ${failurePattern.slice(0, 60)}

> This skill was auto-generated by the MetaOptimizationSidecar based on observed
> failure patterns. Edit it to improve repair accuracy for this specific issue.

## Failure Pattern

The following failure has been observed ${this.config.skillCreationThreshold}+ times:

\`\`\`
${failurePattern}
\`\`\`

## Rationale

${proposal.rationale}

## Repair Steps

1. Read \`repair-context/gap.md\` to understand the specific instance of this failure
2. Read \`repair-context/history.md\` to see what was already tried
3. Read \`repair-context/trace.md\` for execution diagnostics

### Diagnosis

This failure pattern typically indicates:
- ${failurePattern.includes('command not found') ? 'A required tool is not installed or not in PATH' : ''}
- ${failurePattern.includes('exit') ? 'A command returned a non-zero exit code' : ''}
- ${failurePattern.includes('not found') ? 'A file or module that should exist is missing' : ''}
- ${failurePattern.includes('timeout') ? 'An operation took too long and was killed' : ''}
- Review the specific error output in gap.md for details

### Fix

Based on the failure pattern, try these approaches IN ORDER:

1. **Quick fix**: Address the immediate error (missing file, wrong path, etc.)
2. **Root cause**: If the quick fix fails, look deeper at why the command fails
3. **Environment**: Check if the issue is environmental (missing tool, wrong version)

### Verify

After applying the fix:
1. Re-run the failing check command
2. Run ALL checks in CHECK.md to ensure nothing is broken

## Improvement Notes

If this skill consistently fails, edit it to add:
- More specific diagnosis steps for this error pattern
- Known-good fix approaches
- Environment requirements
`;
  }
}
