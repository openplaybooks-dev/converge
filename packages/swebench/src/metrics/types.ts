/**
 * SWE-bench metrics types — extends Converge's BenchmarkResult
 * with SWE-bench-specific data (resolve rate, per-repo breakdown).
 */

import type { BenchmarkResult } from "@converge/core";

/** Per-instance result */
export interface InstanceResult {
  instanceId: string;
  repo: string;
  resolved: boolean;
  patchProduced: boolean;
  failToPassCount: number;
  failToPassResolved: number;
  passToPassCount: number;
  passToPassMaintained: number;
  durationMs: number;
  error?: string;
}

/** Per-repo aggregated stats */
export interface RepoBreakdown {
  repo: string;
  total: number;
  resolved: number;
  resolveRate: number;
}

/** SWE-bench extension to BenchmarkResult */
export interface SWEBenchResult extends BenchmarkResult {
  swebench: {
    /** Overall resolve rate (0–1) */
    resolveRate: number;
    /** Total instances attempted */
    totalInstances: number;
    /** Total instances resolved */
    resolvedInstances: number;
    /** Instances where agent produced a patch (even if wrong) */
    patchesProduced: number;
    /** Per-repo breakdown */
    repoBreakdown: RepoBreakdown[];
    /** Per-instance details */
    instances: InstanceResult[];
  };
}
