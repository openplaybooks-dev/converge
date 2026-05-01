import type {
  SessionMetrics,
  AggregateMetrics,
  CheckpointSummary,
  ConvergenceData,
} from "@converge/core";

/** Top-level result from a benchmark analysis */
export interface AnalysisResult {
  label?: string;
  provider?: string;
  model?: string;
  journalDir: string;
  timestamp: string;

  /** Standard metrics (reused from @converge/core) */
  sessions: SessionMetrics[];
  aggregate: AggregateMetrics;
  checkpointSummary: CheckpointSummary;
  convergence: ConvergenceData[];

  /** Deep analysis from .index.jsonl files (only when --deep) */
  deep?: DeepAnalysis;
}

export interface DeepAnalysis {
  /** Per-session breakdowns */
  sessions: DeepSession[];
  /** Aggregated tool statistics */
  tools: ToolAnalysis;
  /** Where time went across all sessions */
  timeline: TimelineBreakdown;
}

export interface DeepSession {
  sessionId: string;
  logFile: string;
  task: string;
  attempt: number;
  success: boolean;

  /** Time breakdown (ms) — parsed from .index.jsonl event stream */
  durationMs: number;
  thinkingTimeMs: number;
  toolTimeMs: number;
  outputTimeMs: number;
  idleTimeMs: number;

  /** Tool calls in order */
  toolCalls: ToolCallDetail[];
  totalToolCalls: number;
  failedToolCalls: number;

  /** Thinking stats */
  thinkingPhases: number;
  thinkingChars: number;

  /** Errors from failed tool calls */
  errors: ErrorDetail[];
}

export interface ToolCallDetail {
  tool: string;
  index: number;
  timestamp: string;
  durationMs: number;
  success: boolean;
  inputPreview: string;
}

export interface ErrorDetail {
  tool: string;
  timestamp: string;
  preview: string;
}

export interface ToolAnalysis {
  byTool: Record<string, ToolStats>;
  failurePatterns: ToolFailurePattern[];
  totalCalls: number;
  totalFailures: number;
  overallFailureRate: number;
}

export interface ToolStats {
  calls: number;
  successes: number;
  failures: number;
  failureRate: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  totalMs: number;
}

export interface ToolFailurePattern {
  tool: string;
  count: number;
  examples: string[];
}

export interface TimelineBreakdown {
  wallClockMs: number;
  thinkingPct: number;
  toolExecutionPct: number;
  outputPct: number;
  idlePct: number;
}
