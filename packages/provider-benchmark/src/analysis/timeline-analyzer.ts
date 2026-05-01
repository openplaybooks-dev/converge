/**
 * Timeline Analyzer — aggregate time breakdown across all sessions.
 *
 * Computes thinking vs tool execution vs output vs idle percentages.
 */

import type { DeepSession, TimelineBreakdown } from "./types.ts";

/** Aggregate timeline breakdown across sessions */
export function analyzeTimeline(sessions: DeepSession[]): TimelineBreakdown {
  if (sessions.length === 0) {
    return {
      wallClockMs: 0,
      thinkingPct: 0,
      toolExecutionPct: 0,
      outputPct: 0,
      idlePct: 0,
    };
  }

  let totalThinking = 0;
  let totalTool = 0;
  let totalOutput = 0;
  let totalIdle = 0;
  let totalWall = 0;

  for (const s of sessions) {
    totalThinking += s.thinkingTimeMs;
    totalTool += s.toolTimeMs;
    totalOutput += s.outputTimeMs;
    totalIdle += s.idleTimeMs;
    totalWall += s.durationMs;
  }

  const total = totalThinking + totalTool + totalOutput + totalIdle;
  if (total === 0) {
    return {
      wallClockMs: totalWall,
      thinkingPct: 0,
      toolExecutionPct: 0,
      outputPct: 0,
      idlePct: 0,
    };
  }

  return {
    wallClockMs: totalWall,
    thinkingPct: totalThinking / total,
    toolExecutionPct: totalTool / total,
    outputPct: totalOutput / total,
    idlePct: totalIdle / total,
  };
}
