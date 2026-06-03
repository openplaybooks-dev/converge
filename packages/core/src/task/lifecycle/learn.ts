/**
 * Self-Correction: retry-hint generator (RFC 0048).
 *
 * `generateLearnMd` no longer writes LEARN.md. Instead, it appends
 * structured `retryHints` to `attempt.json`:
 *   - one `check-failed` hint per failing check
 *   - one `missing-output` hint per missing output
 *
 * The packet builder reads these hints and surfaces them only when the
 * situation is retry-* (so the AI is not distracted by them on first run).
 *
 * If `attempt.json` is missing, this is a no-op.
 */

import {
  readAttemptContext,
  updateAttemptContext,
  type RetryHint,
} from "./attempt-context.ts";

export interface RepairMetadata {
  wasRepaired: boolean;
  repairType?: "programmatic" | "ai-driven";
  repairedChecks?: string[];
  reason?: string;
}

export interface LearnOptions {
  /**
   * Kept for compatibility with the old `disableLearnMd` ablation flag.
   * When true, this is a no-op (the caller has already decided to skip
   * the hint stream — used by ablation benchmarks).
   */
  disableLearnMd?: boolean;
}

/**
 * Append retry hints to `attempt.json` based on the current attempt state.
 *
 * No-op if `disableLearnMd` is true, or if `attempt.json` is missing.
 */
export async function generateLearnMd(
  _wipDir: string,
  _projectDir: string,
  _attemptNumber: number,
  _repairMetadata?: RepairMetadata,
  // Kept in the signature for source compatibility; the new path does not
  // use the trace logger because retry hints are derived from the compact
  // record, not from a separate trace stream.
  _traceLogger?: unknown,
  options?: LearnOptions,
): Promise<void> {
  if (options?.disableLearnMd) return;

  const ctx = await readAttemptContext(_wipDir);
  if (!ctx) return;

  const newHints: RetryHint[] = [];
  const attemptNumber = ctx.attempt;

  for (const check of ctx.checks) {
    if (check.passed === false) {
      newHints.push({
        kind: "check-failed",
        target: check.id,
        message:
          (check.output?.trim() ? `${check.output.split("\n")[0]} ` : "") +
          `(${check.cmd})`,
        sourceAttempt: attemptNumber,
      });
    }
  }

  for (const output of ctx.outputs) {
    if (!output.exists) {
      newHints.push({
        kind: "missing-output",
        target: output.path,
        message: `expected at ${output.path}`,
        sourceAttempt: attemptNumber,
      });
    }
  }

  if (newHints.length === 0) return;

  await updateAttemptContext(_wipDir, { retryHints: newHints });
}
