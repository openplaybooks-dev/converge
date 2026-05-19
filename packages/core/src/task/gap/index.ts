/**
 * Gap-Driven Framework Module
 *
 * Exports all gap-related types, utilities, and detectors.
 */

// Types
export type {
  Gap,
  CompactGap,
  CheckResult,
  EvalResult,
  ConvergenceState,
  GapDetectionConfig,
  GapPriority,
  PrioritizationStrategy,
} from "./types.ts";

export {
  GapSchema,
  CheckResultSchema,
  EvalResultSchema,
  ConvergenceStateSchema,
  toCompactGap,
  formatCompactGaps,
} from "./types.ts";

// Detector
export {
  GapDetector,
  ConvergenceAnalyzer,
  createGapDetector,
  createConvergenceAnalyzer,
} from "./detector.ts";

// Utilities
export {
  createGap,
  resolveGap,
  filterByType,
  filterByLevel,
  filterBySeverity,
  filterUnresolved,
  prioritizeGaps,
  prioritizeBySeverity,
  sortByPriority,
  gapsEqual,
  gapsDifference,
  gapsIntersection,
  calculateGapStats,
  formatGapStats,
} from "./utils.ts";

// Definition gaps (malformed TASK.md frontmatter)
export type {
  DefinitionEvidence,
  DefinitionGapDetection,
} from "./definition-gaps.ts";
export {
  readDefinitionEvidence,
  evidenceToGap,
  findDefinitionGaps,
  definitionGapShouldRetry,
} from "./definition-gaps.ts";

// Health-repair gaps (AI-detected post-completion anomalies)
export type {
  HealthRepairEvidence,
  HealthRepairIssue,
  HealthRepairGapDetection,
} from "./health-repair-gaps.ts";
export {
  readHealthRepairEvidence,
  evidenceToHealthRepairGap,
  findHealthRepairGaps,
} from "./health-repair-gaps.ts";

