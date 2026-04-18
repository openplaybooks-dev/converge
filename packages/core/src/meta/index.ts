/**
 * Meta-Optimization Module
 *
 * Self-optimization loop for the converge framework.
 * Runs as a sidecar to analyze task journals and propose improvements.
 */

export { MetaAnalyzer } from "./analyzer.ts";
export type {
  MetaAnalyzerConfig,
  TaskJournalEntry,
  MetaAnalysisStats,
  ImprovementProposal,
} from "./analyzer.ts";
export { MetaOptimizationSidecar } from "./sidecar.ts";
export type { SidecarConfig } from "./sidecar.ts";
