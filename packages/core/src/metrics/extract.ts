import { readFileSync, existsSync } from "node:fs";
import { join, sep } from "node:path";
import { glob } from "glob";
import type {
  SessionMetrics,
  AggregateMetrics,
  ToolCallSummary,
  ModelUsage,
  CheckpointMetrics,
  CheckpointSummary,
  BenchmarkResult,
  ConvergenceData,
} from "./types.ts";

/** Derive epic/task/attempt from a log file path (supports both old epics and new tasks formats) */
export function parseLogPath(logFile: string): {
  epic: string;
  task: string;
  attempt: number;
} {
  const parts = logFile.split(sep);

  // Try old epics format: epics/<epic>/[tasks/<task>/...]/attempts/<N>/logs/<file>.log
  let epicsIdx = parts.indexOf("epics");
  if (epicsIdx !== -1) {
    const epicName = parts[epicsIdx + 1] ?? "";
    const attemptsIdx = parts.indexOf("attempts", epicsIdx);
    const taskParts: string[] = [];
    for (let i = epicsIdx + 2; i < attemptsIdx; i++) {
      if (parts[i] !== "tasks") taskParts.push(parts[i]);
    }
    const taskName = taskParts.join("/");
    const attemptNum = parseInt(parts[attemptsIdx + 1] ?? "0", 10);
    return { epic: epicName, task: taskName, attempt: attemptNum };
  }

  // Try new tasks format: tasks/<epic>/[tasks/<task>/...]/attempts/<N>/logs/<file>.log
  const tasksIdx = parts.indexOf("tasks");
  if (tasksIdx !== -1) {
    // First segment after 'tasks' is the epic
    const epicName = parts[tasksIdx + 1] ?? "default";
    // Find 'attempts' and collect everything between 'tasks' and 'attempts' as task path
    const attemptsIdx = parts.indexOf("attempts", tasksIdx);
    const taskParts: string[] = [];
    for (let i = tasksIdx + 2; i < attemptsIdx; i++) {
      if (parts[i] !== "tasks") taskParts.push(parts[i]);
    }
    const taskName = taskParts.join("/");
    const attemptNum = parseInt(parts[attemptsIdx + 1] ?? "0", 10);
    return { epic: epicName, task: taskName, attempt: attemptNum };
  }

  return { epic: "", task: "", attempt: 0 };
}

/** Extract tool call stats from an .index.jsonl file */
export function extractToolCalls(indexFile: string): ToolCallSummary[] {
  if (!existsSync(indexFile)) return [];

  const content = readFileSync(indexFile, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);

  const calls = new Map<
    string,
    { count: number; successCount: number; failCount: number }
  >();
  // Track tool name by tool_use_id for matching results back
  const idToTool = new Map<string, string>();

  for (const line of lines) {
    let event: any;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type !== "tool") continue;

    if (event.event === "call") {
      const tool = event.data?.tool;
      if (!tool) continue;
      const id = event.data?.id;
      if (id) idToTool.set(id, tool);
      const entry = calls.get(tool) ?? {
        count: 0,
        successCount: 0,
        failCount: 0,
      };
      entry.count++;
      calls.set(tool, entry);
    } else if (event.event === "result") {
      const toolUseId = event.data?.tool_use_id;
      const tool = toolUseId ? idToTool.get(toolUseId) : undefined;
      if (!tool) continue;
      const entry = calls.get(tool);
      if (!entry) continue;
      if (event.data?.success) {
        entry.successCount++;
      } else {
        entry.failCount++;
      }
    }
  }

  return Array.from(calls.entries()).map(([tool, stats]) => ({
    tool,
    ...stats,
  }));
}

/** Extract session metrics from a single .log file */
export function extractSessionMetrics(
  logFile: string,
  indexFile?: string,
): SessionMetrics | null {
  const content = readFileSync(logFile, "utf-8");

  // Find the first [STDOUT] {"type":"result",...} line
  const resultLineRegex = /^\[([^\]]+)\] \[STDOUT\] (\{"type":"result".+)$/m;
  const match = content.match(resultLineRegex);
  if (!match) return null;

  const timestamp = match[1];
  let result: any;
  try {
    result = JSON.parse(match[2]);
  } catch {
    return null;
  }

  const { epic, task, attempt } = parseLogPath(logFile);

  const usage = result.usage ?? {};
  const modelUsage = result.modelUsage ?? {};

  const models: ModelUsage[] = Object.entries(modelUsage).map(
    ([model, data]: [string, any]) => ({
      model,
      inputTokens: data.inputTokens ?? 0,
      outputTokens: data.outputTokens ?? 0,
      costUSD: data.costUSD ?? 0,
    }),
  );

  // Determine index file path if not provided
  const resolvedIndexFile =
    indexFile ?? logFile.replace(/\.log$/, ".index.jsonl");
  const toolCalls = extractToolCalls(resolvedIndexFile);
  const totalToolCalls = toolCalls.reduce((sum, t) => sum + t.count, 0);

  return {
    logFile,
    epic,
    task,
    attempt,
    timestamp: timestamp ?? "",
    success: result.subtype === "success" && !result.is_error,
    totalCostUsd: result.total_cost_usd ?? 0,
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
    durationMs: result.duration_ms ?? 0,
    durationApiMs: result.duration_api_ms ?? 0,
    numTurns: result.num_turns ?? 0,
    toolCalls,
    totalToolCalls,
    models,
  };
}

/** Extract session data from events.jsonl (new playbook format) */
interface SessionEventData {
  epic: string;
  task: string;
  attempt: number;
  success: boolean;
  durationMs: number;
  timestamp: string;
}

function extractSessionEventsData(eventsPath: string): SessionEventData[] {
  if (!existsSync(eventsPath)) return [];

  const content = readFileSync(eventsPath, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);

  const sessions: SessionEventData[] = [];

  for (const line of lines) {
    let event: any;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    if (event.eventType === "TASK_ATTEMPT_COMPLETE") {
      const meta = event.metadata ?? {};
      const taskId = meta.taskId ?? "";
      const segments = taskId.split("/");
      const epic = meta.epicId ?? segments[0] ?? "default";
      const task = segments.length > 1 ? segments.slice(1).join("/") : taskId;

      sessions.push({
        epic,
        task,
        attempt: meta.attempt ?? 0,
        success: meta.success ?? false,
        durationMs: meta.duration ?? 0,
        timestamp: event.timestamp ?? "",
      });
    }
  }

  return sessions;
}

/** Extract all session metrics from sessions directory (new playbook format) */
async function extractAllSessionsFromDir(
  sessionsDir: string,
): Promise<SessionMetrics[]> {
  if (!existsSync(sessionsDir)) return [];

  const entries = await glob("*/", {
    cwd: sessionsDir,
    absolute: true,
  });
  const sessions: SessionMetrics[] = [];

  for (const sessionPath of entries) {
    const eventsPath = join(sessionPath, "events.jsonl");
    if (!existsSync(eventsPath)) continue;

    const taskAttempts = extractSessionEventsData(eventsPath);
    for (const ta of taskAttempts) {
      sessions.push({
        logFile: eventsPath,
        epic: ta.epic,
        task: ta.task,
        attempt: ta.attempt,
        timestamp: ta.timestamp,
        success: ta.success,
        totalCostUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        durationMs: ta.durationMs,
        durationApiMs: 0,
        numTurns: 0,
        toolCalls: [],
        totalToolCalls: 0,
        models: [],
      });
    }
  }

  return sessions;
}

/** Extract all session metrics from a journal directory */
export async function extractAll(
  journalDir: string,
): Promise<SessionMetrics[]> {
  const sessions: SessionMetrics[] = [];

  // Try old epics format: journalDir/epics/{epic}/{task}/attempts/*/logs/*_*.log
  const epicsPattern = "epics/**/attempts/*/logs/*_*.log";
  const epicsLogFiles = await glob(epicsPattern, {
    cwd: journalDir,
    absolute: true,
  });
  for (const logFile of epicsLogFiles) {
    const metrics = extractSessionMetrics(logFile);
    if (metrics) sessions.push(metrics);
  }

  // Try tasks format (new playbook structure): journalDir/tasks/{epic}/{task}/attempts/*/logs/*_*.log
  const tasksPattern = "tasks/**/attempts/*/logs/*_*.log";
  const tasksLogFiles = await glob(tasksPattern, {
    cwd: journalDir,
    absolute: true,
  });
  for (const logFile of tasksLogFiles) {
    const metrics = extractSessionMetrics(logFile);
    if (metrics) sessions.push(metrics);
  }

  // Try executions format: journalDir/executions/{run}/tasks/{task}/attempts/*/logs/*.log
  const execPattern = "executions/*/tasks/**/attempts/*/logs/*_*.log";
  const execLogFiles = await glob(execPattern, {
    cwd: journalDir,
    absolute: true,
  });
  for (const logFile of execLogFiles) {
    const metrics = extractSessionMetrics(logFile);
    if (metrics) sessions.push(metrics);
  }

  // Also try new playbook/sessions format: journalDir/sessions/{sessionId}/events.jsonl
  const sessionsDir = join(journalDir, "sessions");
  if (existsSync(sessionsDir)) {
    const pbSessions = await extractAllSessionsFromDir(sessionsDir);
    sessions.push(...pbSessions);
  }

  // Sort by timestamp
  sessions.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return sessions;
}

/** Aggregate an array of session metrics */
export function aggregate(sessions: SessionMetrics[]): AggregateMetrics {
  const sessionCount = sessions.length;
  const successCount = sessions.filter((s) => s.success).length;
  const failCount = sessionCount - successCount;

  const totalCostUsd = sessions.reduce((sum, s) => sum + s.totalCostUsd, 0);
  const totalInputTokens = sessions.reduce((sum, s) => sum + s.inputTokens, 0);
  const totalOutputTokens = sessions.reduce(
    (sum, s) => sum + s.outputTokens,
    0,
  );
  const totalCacheReadTokens = sessions.reduce(
    (sum, s) => sum + s.cacheReadTokens,
    0,
  );
  const totalCacheCreationTokens = sessions.reduce(
    (sum, s) => sum + s.cacheCreationTokens,
    0,
  );
  const totalDurationMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
  const totalTurns = sessions.reduce((sum, s) => sum + s.numTurns, 0);

  const totalCacheRelated =
    totalCacheReadTokens + totalInputTokens + totalCacheCreationTokens;
  const cacheHitRate =
    totalCacheRelated > 0 ? totalCacheReadTokens / totalCacheRelated : 0;

  // Tool breakdown
  const toolBreakdown: AggregateMetrics["toolBreakdown"] = {};
  for (const s of sessions) {
    for (const tc of s.toolCalls) {
      const entry = toolBreakdown[tc.tool] ?? {
        calls: 0,
        successes: 0,
        failures: 0,
      };
      entry.calls += tc.count;
      entry.successes += tc.successCount;
      entry.failures += tc.failCount;
      toolBreakdown[tc.tool] = entry;
    }
  }

  // Model breakdown
  const modelBreakdown: AggregateMetrics["modelBreakdown"] = {};
  for (const s of sessions) {
    for (const m of s.models) {
      const entry = modelBreakdown[m.model] ?? {
        sessions: 0,
        costUSD: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      entry.sessions++;
      entry.costUSD += m.costUSD;
      entry.inputTokens += m.inputTokens;
      entry.outputTokens += m.outputTokens;
      modelBreakdown[m.model] = entry;
    }
  }

  return {
    sessionCount,
    successCount,
    failCount,
    errorRate: sessionCount > 0 ? failCount / sessionCount : 0,
    totalCostUsd,
    avgCostPerSession: sessionCount > 0 ? totalCostUsd / sessionCount : 0,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheCreationTokens,
    cacheHitRate,
    totalDurationMs,
    avgDurationMs: sessionCount > 0 ? totalDurationMs / sessionCount : 0,
    totalTurns,
    toolBreakdown,
    modelBreakdown,
  };
}

/** Group sessions by a key function, then aggregate each group */
export function groupBy(
  sessions: SessionMetrics[],
  keyFn: (s: SessionMetrics) => string,
): Record<string, AggregateMetrics> {
  const groups = new Map<string, SessionMetrics[]>();
  for (const s of sessions) {
    const key = keyFn(s);
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  const result: Record<string, AggregateMetrics> = {};
  for (const [key, group] of groups) {
    result[key] = aggregate(group);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Checkpoint extraction                                              */
/* ------------------------------------------------------------------ */

/** Parse checkpoint.json path to derive epic/task and level (supports both old epics and new tasks formats) */
function parseCheckpointPath(filePath: string): {
  epic: string;
  task: string;
  level: "epic" | "task";
} {
  const parts = filePath.split(sep);

  // Try old epics format first
  const epicsIdx = parts.indexOf("epics");
  if (epicsIdx !== -1) {
    const epicName = parts[epicsIdx + 1] ?? "";
    const afterEpic = parts
      .slice(epicsIdx + 2)
      .filter((p) => p !== "checkpoint.json");
    const taskParts = afterEpic.filter((p) => p !== "tasks");
    if (taskParts.length === 0) {
      return { epic: epicName, task: "", level: "epic" };
    }
    return { epic: epicName, task: taskParts.join("/"), level: "task" };
  }

  // Try new tasks format (playbook structure)
  const tasksIdx = parts.indexOf("tasks");
  if (tasksIdx !== -1) {
    const afterTasks = parts
      .slice(tasksIdx + 1)
      .filter((p) => p !== "checkpoint.json");
    if (afterTasks.length === 0) {
      return { epic: "", task: "", level: "task" };
    }
    if (afterTasks.length === 1) {
      return { epic: afterTasks[0], task: "", level: "epic" };
    }
    const epic = afterTasks[0];
    const taskParts = afterTasks.slice(1).filter((p) => p !== "tasks");
    return {
      epic,
      task: taskParts.join("/"),
      level: taskParts.length > 0 ? "task" : "epic",
    };
  }

  return { epic: "", task: "", level: "task" };
}

/** Extract metrics from a single checkpoint.json */
export function extractCheckpoint(filePath: string): CheckpointMetrics | null {
  if (!existsSync(filePath)) return null;

  let data: any;
  try {
    data = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }

  const { epic, task, level } = parseCheckpointPath(filePath);
  const attempts = (data.attempts ?? []).map((a: any) => ({
    attempt: a.attempt ?? 0,
    outcome: a.outcome ?? "unknown",
    durationMs: a.durationMs ?? 0,
  }));

  const totalAttempts = attempts.length;
  const durationMs = attempts.reduce(
    (sum: number, a: any) => sum + (a.durationMs ?? 0),
    0,
  );

  return {
    id: data.id ?? "",
    status: data.status ?? "unknown",
    level,
    epic,
    task,
    attempts,
    totalAttempts,
    retries: Math.max(0, totalAttempts - 1),
    totalChildren: data.progress?.totalChildren ?? 0,
    completedChildren: data.progress?.completedChildren ?? 0,
    failedChildren: data.progress?.failedChildren ?? 0,
    durationMs,
  };
}

/** Extract task metrics from a target/manifest.json file */
function extractManifestCheckpoints(filePath: string): CheckpointMetrics[] {
  if (!existsSync(filePath)) return [];

  let data: any;
  try {
    data = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }

  const nodes: Record<string, any> = data.nodes ?? {};
  const playbook = data.metadata?.playbook ?? "";
  const result: CheckpointMetrics[] = [];

  for (const [id, node] of Object.entries(nodes)) {
    const nodeData = node as any;
    result.push({
      id,
      status: "unknown",
      level: "task",
      epic: playbook,
      task: id,
      attempts: [],
      totalAttempts: 0,
      retries: 0,
      totalChildren: nodeData.depended_on_by?.length ?? 0,
      completedChildren: 0,
      failedChildren: 0,
      durationMs: 0,
    });
  }

  return result;
}

/** Extract all checkpoints from a journal directory (supports old checkpoint.json and new manifest.json formats) */
export async function extractAllCheckpoints(
  journalDir: string,
): Promise<CheckpointMetrics[]> {
  const checkpoints: CheckpointMetrics[] = [];

  // Try old epics format
  const epicsPattern = "epics/**/checkpoint.json";
  const epicsFiles = await glob(epicsPattern, {
    cwd: journalDir,
    absolute: true,
  });
  for (const file of epicsFiles) {
    const cp = extractCheckpoint(file);
    if (cp) checkpoints.push(cp);
  }

  // Try new tasks format (playbook structure)
  const tasksPattern = "tasks/**/checkpoint.json";
  const tasksFiles = await glob(tasksPattern, {
    cwd: journalDir,
    absolute: true,
  });
  for (const file of tasksFiles) {
    const cp = extractCheckpoint(file);
    if (cp) checkpoints.push(cp);
  }

  // Try target/manifest.json format (current journal structure)
  // Supports both journal-root scan (*/target/manifest.json) and
  // per-playbook scan (target/manifest.json)
  for (const pattern of ["*/target/manifest.json", "target/manifest.json"]) {
    const manifestFiles = await glob(pattern, {
      cwd: journalDir,
      absolute: true,
    });
    for (const file of manifestFiles) {
      const manifestCPs = extractManifestCheckpoints(file);
      checkpoints.push(...manifestCPs);
    }
  }

  return checkpoints;
}

/** Export structured benchmark results from a journal directory */
export async function exportBenchmarkResults(
  journalDir: string,
): Promise<BenchmarkResult> {
  const sessions = await extractAll(journalDir);
  const agg = aggregate(sessions);
  const checkpoints = await extractAllCheckpoints(journalDir);
  const checkpointSummary = summarizeCheckpoints(checkpoints);

  // Read gap ledger if it exists
  const ledgerPath = join(journalDir, "..", "gap-ledger.jsonl");
  const convergence: ConvergenceData[] = [];
  if (existsSync(ledgerPath)) {
    const lines = readFileSync(ledgerPath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        convergence.push({
          timestamp: entry.timestamp,
          runId: entry.runId,
          phase: entry.phase,
          totalGaps: entry.totalGaps,
          weightedScore: entry.weightedScore,
          delta: entry.delta,
          trend: entry.trend,
        });
      } catch {
        // skip corrupt lines
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    sessions,
    aggregate: agg,
    checkpointSummary,
    convergence,
  };
}

/** Summarize checkpoint metrics */
export function summarizeCheckpoints(
  checkpoints: CheckpointMetrics[],
): CheckpointSummary {
  const epics = checkpoints.filter((c) => c.level === "epic");
  const tasks = checkpoints.filter((c) => c.level === "task");

  const completedTasks = tasks.filter((t) => t.status === "complete").length;
  const failedTasks = tasks.filter((t) => t.status === "failed").length;
  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const interruptedTasks = tasks.filter((t) =>
    t.attempts.some((a) => a.outcome === "interrupted"),
  ).length;

  const totalAttempts = tasks.reduce((sum, t) => sum + t.totalAttempts, 0);
  const totalRetries = tasks.reduce((sum, t) => sum + t.retries, 0);
  const tasksWithRetries = tasks.filter((t) => t.retries > 0).length;

  const totalDurationMs = tasks.reduce((sum, t) => sum + t.durationMs, 0);

  return {
    totalEpics: epics.length,
    totalTasks: tasks.length,
    completedTasks,
    failedTasks,
    pendingTasks,
    interruptedTasks,
    totalAttempts,
    totalRetries,
    tasksWithRetries,
    taskSuccessRate: tasks.length > 0 ? completedTasks / tasks.length : 0,
    totalDurationMs,
    avgTaskDurationMs: tasks.length > 0 ? totalDurationMs / tasks.length : 0,
  };
}
