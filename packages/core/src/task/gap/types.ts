/**
 * Gap-Driven Framework - Core Types
 *
 * Gaps are first-class citizens representing the delta between current state
 * and target state. The framework continuously evaluates gaps and generates
 * work to close them.
 */

import { z } from "zod";
import type { GapType } from "../../storage/types.ts";

/* ------------------------------------------------------------------ */
/*  Gap Kind — single source of truth for metadata.gapKind values     */
/* ------------------------------------------------------------------ */

/**
 * All valid values for gap.metadata.gapKind.
 * Use GapKind.X instead of raw string literals so TypeScript catches mismatches.
 */
export const GapKind = {
  plan: "plan",
  seed: "seed",
  seedScript: "seed-script",
  blocker: "blocker",
  output: "output",
  checkFailed: "check-failed",
  corrupted: "corrupted",
  systemic: "systemic",
  userQuestion: "user-question",
  insufficientEvidence: "insufficient-evidence",
  contradictoryFinding: "contradictory-finding",
  untestedHypothesis: "untested-hypothesis",
  /**
   * TASK.md frontmatter failed to parse. The Unit could not be loaded.
   * Carries `taskMdPath`, `parseError`, and `rejectedPath` in metadata so
   * the repair strategy has the corrupted bytes plus diagnostic.
   */
  definition: "definition",
} as const;

export type GapKindValue = (typeof GapKind)[keyof typeof GapKind];

/* ------------------------------------------------------------------ */
/*  Gap Definition                                                    */
/* ------------------------------------------------------------------ */

/**
 * A gap represents a delta between current state and desired state.
 * Gaps are detected by EvalFn and closed by executing TaskFn.
 */
export interface Gap {
  /** Unique gap identifier */
  id: string;

  /** Gap classification */
  type: GapType;

  /** Scope level */
  level: "project" | "epic" | "task";

  /** Scope identifier (project/epic/task ID) */
  scope: string;

  /** Human-readable description */
  description: string;

  /** When the gap was detected */
  detected: string;

  /** Whether the gap has been resolved */
  resolved: boolean;

  /** When the gap was resolved (if resolved) */
  resolvedAt?: string;

  /** Checks that detected this gap */
  checks: string[];

  /** Origin of this gap (e.g., 'unit', 'self-repair') */
  source?: string;

  /** Additional context */
  metadata?: Record<string, unknown>;

  /** Severity/priority (optional) */
  severity?: "critical" | "high" | "medium" | "low";

  /** Suggested fix (optional) */
  suggestedFix?: string;
}

/* ------------------------------------------------------------------ */
/*  Check Result                                                      */
/* ------------------------------------------------------------------ */

/**
 * Result of running a check function
 */
export interface CheckResult {
  /** Check name/identifier */
  check: string;

  /** Whether the check passed */
  passed: boolean;

  /** Gaps detected (if not passed) */
  gaps: Gap[];

  /** Detailed message */
  message?: string;

  /** Additional data */
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Evaluation Result                                                 */
/* ------------------------------------------------------------------ */

/**
 * Result of running an evaluation function
 */
export interface EvalResult {
  /** All gaps detected */
  gaps: Gap[];

  /** Summary by type */
  summary: {
    total: number;
    byType: Record<GapType, number>;
    byLevel: Record<string, number>;
    bySeverity?: Record<string, number>;
  };

  /** When evaluation was performed */
  timestamp: string;

  /** Checks that were run */
  checksRun: string[];

  /** Any evaluation errors */
  errors?: string[];
}

/* ------------------------------------------------------------------ */
/*  Gap Convergence State                                             */
/* ------------------------------------------------------------------ */

/**
 * Tracks convergence progress
 */
export interface ConvergenceState {
  /** Current iteration number */
  iteration: number;

  /** Gaps from previous iteration */
  previousGaps: Gap[];

  /** Gaps from current iteration */
  currentGaps: Gap[];

  /** Newly detected gaps */
  newGaps: Gap[];

  /** Resolved gaps */
  resolvedGaps: Gap[];

  /** Unchanged gaps (stale) */
  unchangedGaps: Gap[];

  /** Whether convergence has stalled */
  stalled: boolean;

  /** Stall reason (if stalled) */
  stallReason?: string;

  /** Convergence metrics */
  metrics: {
    gapReductionRate: number; // Percentage of gaps closed per iteration
    stallThreshold: number; // Max iterations without progress before stall
    stallCount: number; // Consecutive iterations without progress
  };
}

/* ------------------------------------------------------------------ */
/*  Gap Detection Configuration                                       */
/* ------------------------------------------------------------------ */

/**
 * Configuration for gap detection
 */
export interface GapDetectionConfig {
  /** Checks to run */
  checks: string[];

  /** Maximum gaps to detect (prevents infinite lists) */
  maxGaps?: number;

  /** Severity threshold (ignore gaps below this) */
  severityThreshold?: Gap["severity"];

  /** Enable parallel check execution */
  parallel?: boolean;

  /** Check timeout (ms) */
  timeout?: number;
}

/* ------------------------------------------------------------------ */
/*  Gap Prioritization                                                */
/* ------------------------------------------------------------------ */

/**
 * Gap priority score
 */
export interface GapPriority {
  gap: Gap;
  score: number;
  reason: string;
}

/**
 * Prioritization strategy
 */
export type PrioritizationStrategy =
  | "severity" // Sort by severity
  | "dependencies" // Resolve blocking gaps first
  | "cost" // Cheapest gaps first
  | "impact" // Highest impact gaps first
  | "custom"; // Custom scoring function

/* ------------------------------------------------------------------ */
/*  Zod Schemas for Runtime Validation                                */
/* ------------------------------------------------------------------ */

export const GapSchema = z.object({
  id: z.string(),
  type: z.enum([
    "structural",
    "semantic",
    "quality",
    "integration",
    "missing-intermediate",
  ]),
  level: z.enum(["project", "epic", "task"]),
  scope: z.string(),
  description: z.string(),
  detected: z.string(),
  resolved: z.boolean().default(false),
  resolvedAt: z.string().optional(),
  checks: z.array(z.string()),
  metadata: z.record(z.unknown()).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  suggestedFix: z.string().optional(),
});

export const CheckResultSchema = z.object({
  check: z.string(),
  passed: z.boolean(),
  gaps: z.array(GapSchema),
  message: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const EvalResultSchema = z.object({
  gaps: z.array(GapSchema),
  summary: z.object({
    total: z.number(),
    byType: z.record(z.number()),
    byLevel: z.record(z.number()),
    bySeverity: z.record(z.number()).optional(),
  }),
  timestamp: z.string(),
  checksRun: z.array(z.string()),
  errors: z.array(z.string()).optional(),
});

export const ConvergenceStateSchema = z.object({
  iteration: z.number(),
  previousGaps: z.array(GapSchema),
  currentGaps: z.array(GapSchema),
  newGaps: z.array(GapSchema),
  resolvedGaps: z.array(GapSchema),
  unchangedGaps: z.array(GapSchema),
  stalled: z.boolean(),
  stallReason: z.string().optional(),
  metrics: z.object({
    gapReductionRate: z.number(),
    stallThreshold: z.number(),
    stallCount: z.number(),
  }),
});

/* ------------------------------------------------------------------ */
/*  Missing Intermediate Task Gap                                    */
/* ------------------------------------------------------------------ */

/**
 * Gap type for missing intermediate tasks in the pipeline.
 * Detected when a task requires inputs that no prior task produces.
 */
/* ------------------------------------------------------------------ */
/*  Compact Gap (Meta-Converge optimization: ~80% smaller for prompts) */
/* ------------------------------------------------------------------ */

/**
 * Minimal gap representation for AI prompts.
 * Inspired by Meta-Converge (arxiv 2603.28052): reduce token usage by
 * stripping verbose fields and keeping only what the AI needs to diagnose.
 *
 * Full Gap: ~500-800 tokens per gap (description, suggestedFix, metadata, timestamps)
 * CompactGap: ~80-120 tokens per gap
 */
export interface CompactGap {
  /** Gap ID for cross-referencing */
  id: string;
  /** Classification: what kind of problem */
  kind:
    | "output"
    | "check"
    | "input"
    | "plan"
    | "seed"
    | "structural"
    | "corrupted"
    | "user-question";
  /** Target path or check command */
  target: string;
  /** Brief status string: "missing", "failed: exit 1", "corrupted", "blocked" */
  status: string;
  /** Severity for prioritization */
  severity?: "critical" | "high" | "medium" | "low";
}

/**
 * Convert a full Gap to compact representation for AI prompt inclusion.
 * Reduces token usage by ~80% while preserving diagnostic information.
 */
export function toCompactGap(gap: Gap): CompactGap {
  const gapKind = (gap.metadata?.gapKind as string) ?? gap.type;

  // Map to compact kind
  let kind: CompactGap["kind"];
  switch (gapKind) {
    case "output":
      kind = "output";
      break;
    case "check":
    case "check-failed":
      kind = "check";
      break;
    case "blocker":
    case "missing-input":
      kind = "input";
      break;
    case "plan":
      kind = "plan";
      break;
    case "seed":
      kind = "seed";
      break;
    case "corrupted":
      kind = "corrupted";
      break;
    case "user-question":
      kind = "user-question";
      break;
    case "insufficient-evidence":
    case "contradictory-finding":
    case "untested-hypothesis":
      kind = "check";
      break;
    default:
      kind = "structural";
  }

  // Extract target: file path from metadata or description
  const target =
    (gap.metadata?.inputPattern as string) ??
    (gap.metadata?.outputPath as string) ??
    (gap.metadata?.checkCmd as string) ??
    extractTargetFromDescription(gap.description);

  // Build compact status
  let status: string;
  if (kind === "output") {
    status = "missing";
  } else if (kind === "check") {
    const exitCode = gap.metadata?.exitCode;
    status = exitCode !== undefined ? `failed: exit ${exitCode}` : "failed";
  } else if (kind === "input") {
    status = "blocked";
  } else if (kind === "corrupted") {
    status = "corrupted";
  } else {
    status = gap.resolved ? "resolved" : "open";
  }

  return {
    id: gap.id,
    kind,
    target,
    status,
    severity: gap.severity,
  };
}

/**
 * Convert an array of Gaps to compact representation.
 * Returns a concise string suitable for AI prompts.
 */
export function formatCompactGaps(gaps: Gap[]): string {
  if (gaps.length === 0) return "No gaps detected.";

  const compact = gaps.map(toCompactGap);
  const lines = compact.map((g) => {
    const sev = g.severity ? ` [${g.severity}]` : "";
    return `- [${g.kind}] ${g.target}: ${g.status}${sev}`;
  });

  return `## Current Gaps (${gaps.length})\n${lines.join("\n")}`;
}

/** Extract a meaningful target string from gap description */
function extractTargetFromDescription(description: string): string {
  // Try common patterns
  const patterns = [
    /Required input missing:\s*(.+)/i,
    /Missing (?:output|file):\s*(.+)/i,
    /Check failed:\s*(.+)/i,
    /`([^`]+)`/, // backtick-wrapped path
  ];

  for (const pat of patterns) {
    const match = description.match(pat);
    if (match) return match[1].trim();
  }

  // Fallback: truncated description
  return description.slice(0, 80);
}

/* ------------------------------------------------------------------ */
/*  Missing Intermediate Task Gap                                    */
/* ------------------------------------------------------------------ */

export interface MissingIntermediateGap extends Gap {
  type: "missing-intermediate";
  metadata: {
    missingOutputs: string[];
    requiredByTask: string;
    lastProducingTask: string | null;
    epicId: string;
    gapFixerAttempts?: number;
  };
}
