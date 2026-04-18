/** Per-session metrics extracted from a single result line */
export interface SessionMetrics {
  logFile: string;
  epic: string;
  task: string;
  attempt: number;
  timestamp: string;
  success: boolean;
  // Cost
  totalCostUsd: number;
  // Tokens
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  // Performance
  durationMs: number;
  durationApiMs: number;
  numTurns: number;
  // Tool use
  toolCalls: ToolCallSummary[];
  totalToolCalls: number;
  // Model breakdown
  models: ModelUsage[];
}

export interface ToolCallSummary {
  tool: string;
  count: number;
  successCount: number;
  failCount: number;
}

export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}

/** Checkpoint data from a single checkpoint.json file */
export interface CheckpointMetrics {
  id: string;
  status: string;
  level: "epic" | "task";
  epic: string;
  task: string;
  attempts: AttemptMetrics[];
  totalAttempts: number;
  retries: number; // attempts beyond the first
  totalChildren: number;
  completedChildren: number;
  failedChildren: number;
  durationMs: number; // sum of all attempt durations
}

export interface AttemptMetrics {
  attempt: number;
  outcome: string;
  durationMs: number;
}

/** Aggregated checkpoint metrics */
export interface CheckpointSummary {
  totalEpics: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  interruptedTasks: number;
  totalAttempts: number;
  totalRetries: number;
  tasksWithRetries: number;
  taskSuccessRate: number;
  totalDurationMs: number;
  avgTaskDurationMs: number;
}

/** Structured benchmark output for analysis */
export interface BenchmarkResult {
  /** When the benchmark was run */
  timestamp: string;
  /** Session-level metrics */
  sessions: SessionMetrics[];
  /** Aggregated session metrics */
  aggregate: AggregateMetrics;
  /** Checkpoint summary (task success rates, retries) */
  checkpointSummary: CheckpointSummary;
  /** Convergence data: gap ledger entries (if available) */
  convergence: ConvergenceData[];
}

/** A single convergence data point from the gap ledger */
export interface ConvergenceData {
  timestamp: string;
  runId: string;
  phase: "start" | "end";
  totalGaps: number;
  weightedScore: number;
  delta: number | null;
  trend: string;
}

/** Aggregated metrics across sessions */
export interface AggregateMetrics {
  sessionCount: number;
  successCount: number;
  failCount: number;
  errorRate: number;
  totalCostUsd: number;
  avgCostPerSession: number;
  // Tokens
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  cacheHitRate: number;
  // Performance
  totalDurationMs: number;
  avgDurationMs: number;
  totalTurns: number;
  // Tool use
  toolBreakdown: Record<
    string,
    { calls: number; successes: number; failures: number }
  >;
  // Model breakdown
  modelBreakdown: Record<
    string,
    {
      sessions: number;
      costUSD: number;
      inputTokens: number;
      outputTokens: number;
    }
  >;
}
