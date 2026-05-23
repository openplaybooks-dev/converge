import type { FreshnessSpec, FreshnessResult } from "./types.ts";

export type { FreshnessSpec, FreshnessResult, FreshnessPeriodUnit } from "./types.ts";

const UNIT_MS: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
};

function evaluateFreshness(
  spec: FreshnessSpec,
  now: number,
): FreshnessResult {
  const delta = now - spec.loaded_at_mtime;
  const errorThreshold =
    spec.error_after[0] * UNIT_MS[spec.error_after[1]];
  if (delta >= errorThreshold) return "error";

  const warnThreshold =
    spec.warn_after[0] * UNIT_MS[spec.warn_after[1]];
  if (delta >= warnThreshold) return "warn";

  return "pass";
}

function evaluateAllSources(
  _playbook: unknown,
  _projectDir: string,
  _now: number,
): Map<string, FreshnessResult> {
  // Placeholder: iterates tasks with freshness declarations.
  // The CLI commands-source.ts drives the actual iteration for the MVP.
  return new Map();
}
