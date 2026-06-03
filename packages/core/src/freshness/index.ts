import type { FreshnessSpec, FreshnessResult } from "./types.ts";

export type {
  FreshnessSpec,
  FreshnessResult,
  FreshnessPeriodUnit,
} from "./types.ts";

const UNIT_MS: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
};

/**
 * Compare a `FreshnessSpec`'s age against its warn/error thresholds.
 *
 *   - delta >= error_after → "error"
 *   - delta >= warn_after  → "warn"
 *   - otherwise            → "pass"
 */
export function evaluateFreshness(
  spec: FreshnessSpec,
  now: number,
): FreshnessResult {
  const delta = now - spec.loaded_at_mtime;
  if (delta >= spec.error_after[0] * UNIT_MS[spec.error_after[1]])
    return "error";
  if (delta >= spec.warn_after[0] * UNIT_MS[spec.warn_after[1]]) return "warn";
  return "pass";
}
