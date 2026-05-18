/**
 * Session Analyzer — orchestrates deep analysis of a journal directory.
 *
 * Entry point: analyzeJournal(journalDir) → AnalysisResult
 *
 * Pipeline:
 *   1. collectIndexFiles() — find all .index.jsonl files in the journal
 *   2. For each: parseIndexFile() → ParsedSession
 *   3. computeTiming() → timing breakdown per session
 *   4. Build DeepSession[] from parsed + timing data
 *   5. analyzeTools() → ToolAnalysis
 *   6. analyzeTimeline() → TimelineBreakdown
 *   7. exportBenchmarkResults() for standard metrics (sessions, aggregate, convergence)
 *   8. Assemble AnalysisResult
 */

import { join, relative, sep } from "node:path";
import { glob } from "glob";
import { exportBenchmarkResults } from "@openplaybooks/converge-core";

import type {
  AnalysisResult,
  DeepAnalysis,
  DeepSession,
} from "./types.ts";
import {
  parseIndexFile,
  computeTiming,
} from "./index-analyzer.ts";
import { analyzeTools } from "./tool-analyzer.ts";
import { analyzeTimeline } from "./timeline-analyzer.ts";

/* ------------------------------------------------------------------ */
/*  Options                                                            */
/* ------------------------------------------------------------------ */

export interface AnalyzeOptions {
  /** Journal directory to analyze */
  journalDir: string;
  /** Tag this analysis with provider name */
  provider?: string;
  /** Tag with model name */
  model?: string;
  /** Label for this run */
  label?: string;
  /** Run deep .index.jsonl analysis */
  deep?: boolean;
  /** Filter to a specific playbook subdirectory */
  playbook?: string;
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

export async function analyzeJournal(
  options: AnalyzeOptions,
): Promise<AnalysisResult> {
  let journalDir = options.journalDir;
  if (options.playbook) {
    journalDir = join(journalDir, options.playbook);
  }

  // Standard metrics from core
  const benchmark = await exportBenchmarkResults(journalDir);

  const result: AnalysisResult = {
    label: options.label,
    provider: options.provider,
    model: options.model,
    journalDir,
    timestamp: new Date().toISOString(),
    sessions: benchmark.sessions,
    aggregate: benchmark.aggregate,
    checkpointSummary: benchmark.checkpointSummary,
    convergence: benchmark.convergence,
  };

  // Deep analysis
  if (options.deep) {
    const indexFiles = await collectIndexFiles(journalDir);
    const deepSessions = indexFiles
      .map((f) => buildDeepSession(f))
      .filter((s): s is DeepSession => s !== null);

    result.deep = {
      sessions: deepSessions,
      tools: analyzeTools(deepSessions),
      timeline: analyzeTimeline(deepSessions),
    };
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Find .index.jsonl files                                            */
/* ------------------------------------------------------------------ */

async function collectIndexFiles(journalDir: string): Promise<string[]> {
  // Match both old epics format and new tasks format
  const patterns = [
    "**/attempts/*/logs/*.index.jsonl",
    "**/logs/*.index.jsonl",
  ];

  const results: string[] = [];
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: journalDir,
      absolute: true,
    });
    results.push(...files);
  }

  // Deduplicate
  return [...new Set(results)];
}

/* ------------------------------------------------------------------ */
/*  Build DeepSession from a single .index.jsonl file                   */
/* ------------------------------------------------------------------ */

/** Extract epic, task, and attempt from a log file path */
function deriveTaskInfo(logFile: string): {
  epic: string;
  task: string;
  attempt: number;
} {
  const parts = logFile.split(sep);

  // Old epics format: .../epics/<epic>/[...]/attempts/<N>/logs/<file>.log
  const epicsIdx = parts.indexOf("epics");
  if (epicsIdx !== -1) {
    const epicName = parts[epicsIdx + 1] ?? "";
    const attemptsIdx = parts.indexOf("attempts", epicsIdx);
    const taskParts: string[] = [];
    for (let i = epicsIdx + 2; i < attemptsIdx; i++) {
      if (parts[i] !== "tasks") taskParts.push(parts[i]);
    }
    const attemptNum = parseInt(parts[attemptsIdx + 1] ?? "0", 10);
    return { epic: epicName, task: taskParts.join("/"), attempt: attemptNum };
  }

  // New tasks format: .../tasks/<epic>/[...]/attempts/<N>/logs/<file>.log
  const tasksIdx = parts.indexOf("tasks");
  if (tasksIdx !== -1) {
    const epicName = parts[tasksIdx + 1] ?? "default";
    const attemptsIdx = parts.indexOf("attempts", tasksIdx);
    const taskParts: string[] = [];
    for (let i = tasksIdx + 2; i < attemptsIdx; i++) {
      if (parts[i] !== "tasks") taskParts.push(parts[i]);
    }
    const attemptNum = parseInt(parts[attemptsIdx + 1] ?? "0", 10);
    return { epic: epicName, task: taskParts.join("/"), attempt: attemptNum };
  }

  return { epic: "", task: "", attempt: 0 };
}

function buildDeepSession(indexFile: string): DeepSession | null {
  const parsed = parseIndexFile(indexFile);
  if (!parsed || parsed.events.length === 0) return null;

  const timing = computeTiming(parsed);

  // Derive task/attempt from the paired .log file path
  const logFile = indexFile.replace(/\.index\.jsonl$/, ".log");
  const { epic, task, attempt } = deriveTaskInfo(logFile);

  // Check if the session succeeded by looking at the paired log
  const success = checkSessionSuccess(logFile);

  return {
    sessionId: parsed.sessionId,
    logFile: relative(process.cwd(), logFile),
    task: epic ? `${epic}/${task}` : task,
    attempt,
    success,
    durationMs: timing.durationMs,
    thinkingTimeMs: timing.thinkingTimeMs,
    toolTimeMs: timing.toolTimeMs,
    outputTimeMs: timing.outputTimeMs,
    idleTimeMs: timing.idleTimeMs,
    toolCalls: parsed.toolCalls,
    totalToolCalls: parsed.toolCalls.length,
    failedToolCalls: parsed.toolCalls.filter((tc) => !tc.success).length,
    thinkingPhases: parsed.thinkingPhases.length,
    thinkingChars: parsed.thinkingPhases.reduce((s, p) => s + p.size, 0),
    errors: parsed.errors,
  };
}

/* ------------------------------------------------------------------ */
/*  Determine session success from .log file                             */
/* ------------------------------------------------------------------ */

import { existsSync, readFileSync } from "node:fs";

function checkSessionSuccess(logFile: string): boolean {
  if (!existsSync(logFile)) return false;

  try {
    const content = readFileSync(logFile, "utf-8");
    // Look for the result line
    const match = content.match(
      /\[STDOUT\] (\{"type":"result".+)$/m,
    );
    if (!match) return false;
    const result = JSON.parse(match[1]);
    return result.subtype === "success" && !result.is_error;
  } catch {
    return false;
  }
}
