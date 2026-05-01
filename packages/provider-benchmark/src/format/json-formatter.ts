/**
 * JSON Formatter — structured output for programmatic consumption.
 */

import type { AnalysisResult } from "../analysis/types.ts";

export function toJSON(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

export function toMinimalJSON(result: AnalysisResult): string {
  // Strip verbose arrays to keep the JSON compact
  const minimal = {
    label: result.label,
    provider: result.provider,
    model: result.model,
    journalDir: result.journalDir,
    timestamp: result.timestamp,
    aggregate: result.aggregate,
    checkpointSummary: result.checkpointSummary,
    convergence: result.convergence,
    deep: result.deep
      ? {
          sessionCount: result.deep.sessions.length,
          tools: result.deep.tools,
          timeline: result.deep.timeline,
          // Only include session summaries, not full tool call details
          sessions: result.deep.sessions.map((s) => ({
            sessionId: s.sessionId,
            task: s.task,
            attempt: s.attempt,
            success: s.success,
            durationMs: s.durationMs,
            thinkingPct:
              s.durationMs > 0 ? s.thinkingTimeMs / s.durationMs : 0,
            toolPct: s.durationMs > 0 ? s.toolTimeMs / s.durationMs : 0,
            totalToolCalls: s.totalToolCalls,
            failedToolCalls: s.failedToolCalls,
            thinkingPhases: s.thinkingPhases,
            thinkingChars: s.thinkingChars,
          })),
        }
      : undefined,
  };
  return JSON.stringify(minimal, null, 2);
}
