/**
 * Gap Detector
 *
 * Detects gaps by running checks and comparing current state to target invariants.
 * Core of the gap-driven evaluation loop.
 */

import type {
  Gap,
  CheckResult,
  EvalResult,
  GapDetectionConfig,
  ConvergenceState,
} from "./types.ts";
import type {
  ProjectContext,
  TaskContext,
} from "../../context/types.ts";
import { globalRegistry } from "../checks/registry.ts";

/* ------------------------------------------------------------------ */
/*  Gap Detector                                                      */
/* ------------------------------------------------------------------ */

export class GapDetector {
  /**
   * Detect gaps at project level
   */
  async detectProjectGaps(
    ctx: ProjectContext,
    config?: GapDetectionConfig,
  ): Promise<EvalResult> {
    const checksToRun = config?.checks || this.getProjectChecks(ctx);
    const checkResults = await this.runChecks(ctx, checksToRun, config);

    return this.buildEvalResult(checkResults, checksToRun);
  }

  /**
   * Detect gaps at epic level
   */
  async detectEpicGaps(
    ctx: ProjectContext,
    config?: GapDetectionConfig,
  ): Promise<EvalResult> {
    const checksToRun = config?.checks || this.getEpicChecks(ctx);
    const checkResults = await this.runChecks(ctx, checksToRun, config);

    // Filter to epic-scoped gaps
    const epicResults = checkResults.map((r) => ({
      ...r,
      gaps: r.gaps.filter((g) => g.level === "epic" || g.scope === ctx.config.name),
    }));

    return this.buildEvalResult(epicResults, checksToRun);
  }

  /**
   * Detect gaps at task level
   */
  async detectTaskGaps(
    ctx: TaskContext,
    config?: GapDetectionConfig,
  ): Promise<EvalResult> {
    const checksToRun = config?.checks || this.getTaskChecks(ctx);
    const checkResults = await this.runChecks(ctx, checksToRun, config);

    // Filter to task-scoped gaps
    const taskResults = checkResults.map((r) => ({
      ...r,
      gaps: r.gaps.filter((g) => g.level === "task" || g.scope === ctx.taskId),
    }));

    return this.buildEvalResult(taskResults, checksToRun);
  }

  /**
   * Run checks with optional timeout and parallel execution
   */
  private async runChecks(
    ctx: ProjectContext | TaskContext,
    checks: string[],
    config?: GapDetectionConfig,
  ): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const timeout = config?.timeout || 30000;
    const parallel = config?.parallel ?? true;

    if (parallel) {
      // Run checks in parallel
      const promises = checks.map((checkName) =>
        this.runCheckWithTimeout(ctx, checkName, timeout),
      );
      const settled = await Promise.allSettled(promises);

      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          ctx.log.error(`Check "${checks[i]}" failed: ${result.reason}`);
          results.push({
            check: checks[i],
            passed: false,
            gaps: [],
            message: result.reason?.message || "Check execution failed",
          });
        }
      }
    } else {
      // Run checks sequentially
      for (const checkName of checks) {
        try {
          const result = await this.runCheckWithTimeout(
            ctx,
            checkName,
            timeout,
          );
          results.push(result);
        } catch (error: any) {
          ctx.log.error(`Check "${checkName}" failed: ${error.message}`);
          results.push({
            check: checkName,
            passed: false,
            gaps: [],
            message: error.message,
          });
        }
      }
    }

    return results;
  }

  /**
   * Run a single check with timeout
   */
  private async runCheckWithTimeout(
    ctx: ProjectContext | TaskContext,
    checkName: string,
    timeout: number,
  ): Promise<CheckResult> {
    const checkMeta = globalRegistry.getCheck(checkName);
    if (!checkMeta) {
      throw new Error(`Check "${checkName}" not found in registry`);
    }

    return Promise.race([
      checkMeta.fn(ctx),
      new Promise<CheckResult>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Check "${checkName}" timed out`)),
          timeout,
        ),
      ),
    ]);
  }

  /**
   * Build evaluation result from check results
   */
  private buildEvalResult(
    checkResults: CheckResult[],
    checksRun: string[],
  ): EvalResult {
    const allGaps = checkResults.flatMap((r) => r.gaps);
    const errors = checkResults
      .filter((r) => !r.passed && r.message)
      .map((r) => `${r.check}: ${r.message}`);

    const byType: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const gap of allGaps) {
      byType[gap.type] = (byType[gap.type] || 0) + 1;
      byLevel[gap.level] = (byLevel[gap.level] || 0) + 1;
      if (gap.severity) {
        bySeverity[gap.severity] = (bySeverity[gap.severity] || 0) + 1;
      }
    }

    return {
      gaps: allGaps,
      summary: {
        total: allGaps.length,
        byType,
        byLevel,
        bySeverity,
      },
      timestamp: new Date().toISOString(),
      checksRun,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get default checks for project level
   */
  private getProjectChecks(ctx: ProjectContext): string[] {
    // Return all registered checks
    return Array.from(globalRegistry.getRegistry().checks.keys());
  }

  /**
   * Get default checks for epic level
   */
  private getEpicChecks(ctx: ProjectContext): string[] {
    // Parse checks from epic goals or use all checks
    return Array.from(globalRegistry.getRegistry().checks.keys());
  }

  /**
   * Get default checks for task level
   */
  private getTaskChecks(ctx: TaskContext): string[] {
    // Use checks from task config or default checks
    return ctx.config.checks || [];
  }
}

/* ------------------------------------------------------------------ */
/*  Convergence Analyzer                                              */
/* ------------------------------------------------------------------ */

export class ConvergenceAnalyzer {
  /**
   * Analyze convergence state between iterations
   */
  analyzeConvergence(
    iteration: number,
    previousGaps: Gap[],
    currentGaps: Gap[],
    stallThreshold: number = 3,
  ): ConvergenceState {
    // Find resolved gaps
    const resolvedGaps = previousGaps.filter(
      (prevGap) => !currentGaps.some((currGap) => currGap.id === prevGap.id),
    );

    // Find new gaps
    const newGaps = currentGaps.filter(
      (currGap) => !previousGaps.some((prevGap) => prevGap.id === currGap.id),
    );

    // Find unchanged gaps
    const unchangedGaps = currentGaps.filter((currGap) =>
      previousGaps.some((prevGap) => prevGap.id === currGap.id),
    );

    // Calculate gap reduction rate
    const gapReductionRate =
      previousGaps.length > 0
        ? (resolvedGaps.length / previousGaps.length) * 100
        : 0;

    // Detect stall
    const stalled = unchangedGaps.length > 0 && resolvedGaps.length === 0;
    const stallCount = stalled ? 1 : 0; // Should track across iterations

    let stallReason: string | undefined;
    if (stalled) {
      if (unchangedGaps.length === currentGaps.length) {
        stallReason = "No progress: All gaps unchanged from previous iteration";
      } else if (newGaps.length > 0 && resolvedGaps.length === 0) {
        stallReason = "Negative progress: New gaps introduced, none resolved";
      }
    }

    return {
      iteration,
      previousGaps,
      currentGaps,
      newGaps,
      resolvedGaps,
      unchangedGaps,
      stalled,
      stallReason,
      metrics: {
        gapReductionRate,
        stallThreshold,
        stallCount,
      },
    };
  }

  /**
   * Determine if convergence has been reached
   */
  hasConverged(state: ConvergenceState): boolean {
    return state.currentGaps.length === 0;
  }

  /**
   * Determine if execution has stalled
   */
  hasStalled(state: ConvergenceState, maxStallCount: number = 3): boolean {
    return state.stalled && state.metrics.stallCount >= maxStallCount;
  }

  /**
   * Generate convergence report
   */
  generateReport(state: ConvergenceState): string {
    const lines: string[] = [
      `Convergence Analysis - Iteration ${state.iteration}`,
      `─────────────────────────────────────────────`,
      ``,
      `Gaps:`,
      `  Previous: ${state.previousGaps.length}`,
      `  Current: ${state.currentGaps.length}`,
      `  New: ${state.newGaps.length}`,
      `  Resolved: ${state.resolvedGaps.length}`,
      `  Unchanged: ${state.unchangedGaps.length}`,
      ``,
      `Metrics:`,
      `  Gap Reduction Rate: ${state.metrics.gapReductionRate.toFixed(1)}%`,
      `  Stall Count: ${state.metrics.stallCount}/${state.metrics.stallThreshold}`,
      ``,
    ];

    if (state.stalled) {
      lines.push(`⚠️  Stalled: ${state.stallReason || "No progress detected"}`);
    } else if (this.hasConverged(state)) {
      lines.push(`✅ Converged: All gaps resolved!`);
    } else {
      lines.push(`🔄 In Progress: ${state.currentGaps.length} gaps remaining`);
    }

    return lines.join("\n");
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Functions                                                 */
/* ------------------------------------------------------------------ */

/**
 * Create a new gap detector
 */
export function createGapDetector(): GapDetector {
  return new GapDetector();
}

/**
 * Create a new convergence analyzer
 */
export function createConvergenceAnalyzer(): ConvergenceAnalyzer {
  return new ConvergenceAnalyzer();
}

/* ------------------------------------------------------------------ */
/*  Input Dependency Gap Detection                                   */
/* ------------------------------------------------------------------ */

/**
 * Detect missing input dependencies before task execution.
 * This is a pre-flight check that validates all declared inputs exist.
 *
 * @param unit - The unit to check
 * @param projectDir - Project root directory
 * @returns Array of gaps for missing inputs
 */
export async function detectInputGaps(
  unit: { id: string; title?: string; inputs?: string[] },
  projectDir: string,
): Promise<Gap[]> {
  const gaps: Gap[] = [];

  if (!unit.inputs || unit.inputs.length === 0) {
    return gaps;
  }

  // Dynamically import glob to avoid circular dependencies
  const { glob } = await import("glob");

  for (const inputPattern of unit.inputs) {
    // If the pattern has no glob special chars, use existsSync directly to avoid
    // glob misinterpreting literal brackets (e.g. [id] in Next.js dynamic routes).
    const hasGlobChars = /[*?{]/.test(inputPattern);
    if (!hasGlobChars) {
      const { existsSync: fsExists } = await import("node:fs");
      const { join } = await import("node:path");
      if (fsExists(join(projectDir, inputPattern))) continue;
      // fall through to gap creation below with files = []
    }
    const files = hasGlobChars
      ? await glob(inputPattern, { cwd: projectDir, absolute: false })
      : [];

    if (files.length === 0) {
      // Provide helpful context about what typically produces this file
      let suggestedUpstreamTask = "";
      let suggestedFix = "";

      if (inputPattern.includes(".stitch/screens-plan.json")) {
        suggestedUpstreamTask = "001-generate-design-system";
        suggestedFix = `Ensure task '001-generate-design-system' completed successfully and produced screens-plan.json. Check that the 'taste-design' skill generated all expected outputs.`;
      } else if (inputPattern.includes(".stitch/DESIGN.md")) {
        suggestedUpstreamTask = "001-generate-design-system";
        suggestedFix = `Ensure task '001-generate-design-system' completed successfully and produced DESIGN.md.`;
      } else if (inputPattern.includes(".stitch/UX.md")) {
        suggestedUpstreamTask = "001-gather-idea-generate-ux";
        suggestedFix = `Ensure task '001-gather-idea-generate-ux' completed successfully and produced UX.md.`;
      } else if (inputPattern.includes(".stitch/prompts/")) {
        suggestedUpstreamTask = "002-generate-screen-prompts";
        suggestedFix = `Ensure task '002-generate-screen-prompts' completed successfully and produced prompt files.`;
      } else if (inputPattern.includes(".stitch/designs/")) {
        suggestedUpstreamTask = "003-generate-html-designs";
        suggestedFix = `Ensure task '003-generate-html-designs' completed successfully and produced HTML design files.`;
      } else {
        suggestedFix = `Ensure the upstream task that produces ${inputPattern} has completed successfully.`;
      }

      gaps.push({
        id: `missing-input-${unit.id}-${inputPattern.replace(/[^\w-]/g, "_")}`,
        type: "structural",
        level: "task",
        scope: unit.id,
        description: `Required input missing: ${inputPattern}`,
        detected: new Date().toISOString(),
        resolved: false,
        checks: [],
        severity: "critical",
        metadata: {
          gapKind: "blocker",
          inputPattern,
          taskId: unit.id,
          taskTitle: unit.title,
          suggestedUpstreamTask,
          errorType: "missing-input",
        },
        suggestedFix:
          suggestedFix ||
          `Ensure upstream task that produces ${inputPattern} has completed successfully`,
      });
    }
  }

  return gaps;
}
