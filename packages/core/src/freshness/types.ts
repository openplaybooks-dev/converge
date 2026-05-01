export type FreshnessPeriodUnit = "minute" | "hour" | "day";

export interface FreshnessSpec {
  loaded_at_mtime: number;
  warn_after: [number, FreshnessPeriodUnit];
  error_after: [number, FreshnessPeriodUnit];
}

export type FreshnessResult = "pass" | "warn" | "error";
