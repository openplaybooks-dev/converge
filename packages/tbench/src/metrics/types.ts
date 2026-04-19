/**
 * Terminal-bench metrics types — extends Converge's BenchmarkResult
 * with terminal-bench-specific data (pass rate, per-category breakdown).
 */

import type { BenchmarkResult } from "@converge/core";

/** Per-task result */
export interface TaskResult {
  taskId: string;
  category: string;
  difficulty: string;
  passed: boolean;
  testOutput: string;
  durationMs: number;
  error?: string;
}

/** Per-category aggregated stats */
export interface CategoryBreakdown {
  category: string;
  total: number;
  passed: number;
  passRate: number;
}

/** Terminal-bench extension to BenchmarkResult */
export interface TBenchResult extends BenchmarkResult {
  tbench: {
    /** Overall pass rate (0–1) */
    passRate: number;
    /** Total tasks attempted */
    totalTasks: number;
    /** Total tasks passed */
    passedTasks: number;
    /** Per-category breakdown */
    categoryBreakdown: CategoryBreakdown[];
    /** Per-task details */
    tasks: TaskResult[];
  };
}
