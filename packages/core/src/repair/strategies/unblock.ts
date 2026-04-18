/**
 * UnblockStrategy — higher-order strategy that coordinates sub-strategies to unblock a task.
 *
 * Wraps and delegates to individual strategies in priority order.
 * The first sub-strategy that succeeds wins; its outcome (including retryMode/metadata)
 * is passed through to the caller for execution.
 *
 * Sub-strategies tried in order:
 *   1. MissingInputPatternRepairStrategy — fast, no AI, fixes glob pattern mismatches
 *   2. DependencyBackoffStrategy         — AI-powered, finds and schedules upstream producers
 *
 * Extend by adding more strategies to the constructor array.
 *
 * Used by:
 *   - `task-runner.ts` (replaces manual dual-strategy calls for blocked tasks)
 *   - `commands-run.ts` `--unblock` mode (invoked directly from CLI)
 */

import type { Gap } from "../../gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import { MissingInputPatternRepairStrategy } from "./missing-input-pattern.ts";
import { DependencyBackoffStrategy } from "./dependency-backoff.ts";
import { IncompleteProducerOutputStrategy } from "./incomplete-producer-output.ts";

export class UnblockStrategy implements FixStrategy {
  readonly name = "unblock-coordinator";
  readonly priority = 10;

  private readonly subStrategies: FixStrategy[];

  constructor() {
    this.subStrategies = [
      new MissingInputPatternRepairStrategy(), // fast: no AI, fix glob pattern mismatches
      new DependencyBackoffStrategy(), // AI: find declared upstream producers
      new IncompleteProducerOutputStrategy(), // sibling-based: patch undeclared producers
    ];
  }

  canHandle(gap: Gap): boolean {
    return (
      gap.metadata?.gapKind === "blocker" ||
      gap.metadata?.gapKind === "input" ||
      gap.type === "missing-intermediate"
    );
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    for (const strategy of this.subStrategies) {
      if (!strategy.canHandle(gap)) continue;
      try {
        const result = await strategy.tryFix(gap, ctx);
        if (result.success) {
          return {
            ...result,
            metadata: { ...(result.metadata ?? {}), solvedBy: strategy.name },
          };
        }
      } catch (err: any) {
        console.warn(
          `   ⚠️  Sub-strategy ${strategy.name} threw: ${err.message}`,
        );
      }
    }
    return {
      success: false,
      reason: "No sub-strategy could identify a path to unblock this task",
    };
  }
}
