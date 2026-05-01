/**
 * Index.jsonl Analyzer — deep parse of per-session event streams.
 *
 * Each .index.jsonl file is a JSONL event stream with these event types:
 *   session/started  — session metadata (session_id, timeout_ms)
 *   process/spawned  — child process started
 *   thinking/reasoning — LLM reasoning trace (text, size)
 *   output/text     — LLM output text
 *   tool/call       — tool invocation (tool, id, input)
 *   tool/result     — tool outcome (tool_use_id, success, size, preview, error)
 *
 * We build a timeline from these events to extract:
 *   - Per-tool timing (call → result duration)
 *   - Thinking vs output vs idle time breakdown
 *   - Error patterns from failed tool calls
 */

import { readFileSync, existsSync } from "node:fs";
import type { ToolCallDetail, ErrorDetail } from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Raw event types from .index.jsonl                                  */
/* ------------------------------------------------------------------ */

interface IndexEvent {
  ts: string;
  type: string;
  event: string;
  data?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Parsed timeline                                                     */
/* ------------------------------------------------------------------ */

interface ParsedSession {
  sessionId: string;
  /** All events sorted by timestamp */
  events: IndexEvent[];
  /** Matched tool call→result pairs */
  toolCalls: ToolCallDetail[];
  /** Failed tool results */
  errors: ErrorDetail[];
  /** Thinking phases: each reasoning event */
  thinkingPhases: { ts: string; size: number }[];
  /** Output text events */
  outputEvents: { ts: string; size: number }[];
  /** Wall clock: first event to last event */
  wallClockMs: number;
}

/* ------------------------------------------------------------------ */
/*  Parse a single .index.jsonl file                                     */
/* ------------------------------------------------------------------ */

export function parseIndexFile(filePath: string): ParsedSession | null {
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);

  const events: IndexEvent[] = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch {
      // skip corrupt lines
    }
  }

  if (events.length === 0) return null;

  // Sort by timestamp (should already be sorted, but be safe)
  events.sort((a, b) => a.ts.localeCompare(b.ts));

  // Extract session ID from first session/started event
  const sessionStart = events.find(
    (e) => e.type === "session" && e.event === "started",
  );
  const sessionId =
    (sessionStart?.data?.session_id as string) ?? filePath;

  // Match tool calls to results by tool_use_id
  const callsById = new Map<string, IndexEvent>();
  const toolCalls: ToolCallDetail[] = [];
  const errors: ErrorDetail[] = [];

  for (const event of events) {
    if (event.type !== "tool") continue;

    if (event.event === "call") {
      const id = event.data?.id as string | undefined;
      if (id) callsById.set(id, event);
    } else if (event.event === "result") {
      const toolUseId = event.data?.tool_use_id as string | undefined;
      if (!toolUseId) continue;
      const callEvent = callsById.get(toolUseId);
      if (!callEvent) continue;

      const tool = (callEvent.data?.tool as string) ?? "unknown";
      const success = (event.data?.success as boolean) ?? false;
      const callTs = new Date(callEvent.ts).getTime();
      const resultTs = new Date(event.ts).getTime();
      const durationMs = Math.max(0, resultTs - callTs);

      const inputStr = JSON.stringify(callEvent.data?.input ?? {});
      const inputPreview = inputStr.slice(0, 200);

      toolCalls.push({
        tool,
        index: toolCalls.length + 1,
        timestamp: callEvent.ts,
        durationMs,
        success,
        inputPreview,
      });

      if (!success) {
        const errorMsg =
          (event.data?.error as string) ??
          (event.data?.preview as string) ??
          "";
        errors.push({
          tool,
          timestamp: event.ts,
          preview: errorMsg.slice(0, 300),
        });
      }
    }
  }

  // Collect thinking phases
  const thinkingPhases = events
    .filter((e) => e.type === "thinking" && e.event === "reasoning")
    .map((e) => ({
      ts: e.ts,
      size: (e.data?.size as number) ?? 0,
    }));

  // Collect output events
  const outputEvents = events
    .filter((e) => e.type === "output" && e.event === "text")
    .map((e) => ({
      ts: e.ts,
      size: (e.data?.size as number) ?? 0,
    }));

  // Wall clock
  const firstTs = new Date(events[0].ts).getTime();
  const lastTs = new Date(events[events.length - 1].ts).getTime();
  const wallClockMs = Math.max(0, lastTs - firstTs);

  return {
    sessionId,
    events,
    toolCalls,
    errors,
    thinkingPhases,
    outputEvents,
    wallClockMs,
  };
}

/* ------------------------------------------------------------------ */
/*  Compute timing breakdown from parsed session                        */
/* ------------------------------------------------------------------ */

export interface TimingBreakdown {
  durationMs: number;
  thinkingTimeMs: number;
  toolTimeMs: number;
  outputTimeMs: number;
  idleTimeMs: number;
}

/**
 * Classify time from the event stream.
 *
 * Approach: iterate consecutive events, classify the gap between them.
 * - If the gap is between a thinking event and the next event, it's "thinking time"
 * - Tool execution time = sum of (result.ts - call.ts) for each tool pair
 * - Output time = gaps after output events
 * - Everything else = idle
 *
 * This is inherently approximate since events don't fully partition time.
 * We use two methods and average:
 *   1. Gap attribution: classify each inter-event gap
 *   2. Direct measurement: sum tool durations, thinking event sizes as proxy
 */
export function computeTiming(parsed: ParsedSession): TimingBreakdown {
  const toolTimeMs = parsed.toolCalls.reduce(
    (sum, tc) => sum + tc.durationMs,
    0,
  );

  // Estimate thinking time from inter-event gaps
  // Approach: sum the time from each thinking event to the next non-thinking event
  let thinkingTimeMs = 0;
  let outputTimeMs = 0;
  let idleTimeMs = 0;

  for (let i = 0; i < parsed.events.length - 1; i++) {
    const curr = parsed.events[i];
    const next = parsed.events[i + 1];
    const gapMs =
      new Date(next.ts).getTime() - new Date(curr.ts).getTime();

    if (gapMs <= 0) continue;

    if (curr.type === "thinking") {
      thinkingTimeMs += gapMs;
    } else if (curr.type === "output") {
      outputTimeMs += gapMs;
    } else {
      idleTimeMs += gapMs;
    }
  }

  // Cap thinking time at wall clock minus tool time
  const maxThinking = parsed.wallClockMs - toolTimeMs;
  thinkingTimeMs = Math.min(thinkingTimeMs, Math.max(0, maxThinking));

  return {
    durationMs: parsed.wallClockMs,
    thinkingTimeMs,
    toolTimeMs,
    outputTimeMs,
    idleTimeMs,
  };
}

/* ------------------------------------------------------------------ */
/*  Extract session ID from a log file path                              */
/* ------------------------------------------------------------------ */

export function extractSessionId(logFile: string): string {
  // Log files are named like: 2026-04-25T01-45-40-284Z_12b8ea86.log
  // The session ID is the part after the last underscore, minus extension
  const base = logFile.replace(/\.log$/, "");
  const parts = base.split("_");
  return parts[parts.length - 1] ?? base;
}
