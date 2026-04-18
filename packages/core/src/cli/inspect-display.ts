/**
 * Inspect Display Utilities
 *
 * Formatting and rendering functions for inspect command output.
 */

import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  SessionEvent,
  SessionMetadata,
  ProgressSnapshot,
} from "../journal/session-types.ts";
import type { InspectOptions } from "./commands-inspect.ts";
import { getEpicsDir } from "../journal/structure.ts";

interface CheckpointData {
  version: number;
  timestamp: string;
  iteration: number;
  totalGapsResolved: number;
  totalErrors: number;
  completedTasks: string[];
  failedTasks: string[];
  lockedTasks: string[];
  taskAttempts: Record<string, number>;
  seededTasks: string[];
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SessionInfo {
  sessionId: string;
  sessionDir: string;
  metadata: SessionMetadata;
}

export interface SessionData extends SessionInfo {
  events: SessionEvent[];
  progress: ProgressSnapshot[];
}

/* ------------------------------------------------------------------ */
/*  Event Icons & Colors                                              */
/* ------------------------------------------------------------------ */

const EVENT_ICONS: Record<string, string> = {
  SESSION_START: "🚀",
  SESSION_END: "🏁",
  ITERATION_START: "📋",
  ITERATION_COMPLETE: "✓",
  TASK_SELECTED: "▶ ",
  TASK_ATTEMPT_START: "⚙️ ",
  TASK_ATTEMPT_COMPLETE: "✅",
  UPSTREAM_TRIGGERED: "🔗",
  GAP_DETECTED: "⚠️ ",
  STRATEGY_ATTEMPTED: "🔧",
  CONVERGENCE_ACHIEVED: "🎯",
  CONVERGENCE_STALLED: "⏸️ ",
  TOOL_CALL: "🔧",
  TOOL_RESULT: "✓",
  AI_OUTPUT: "💭",
};

const COLORS = {
  RESET: "\x1b[0m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  RED: "\x1b[31m",
  BLUE: "\x1b[34m",
  GRAY: "\x1b[90m",
  BOLD: "\x1b[1m",
};

/* ------------------------------------------------------------------ */
/*  Formatting Utilities                                              */
/* ------------------------------------------------------------------ */

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string, compact = false): string {
  const date = new Date(timestamp);
  if (compact) {
    return date.toISOString().slice(11, 19); // HH:MM:SS
  }
  return `[${date.toISOString().slice(11, 19)}]`; // [HH:MM:SS]
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

/**
 * Get icon for event type
 */
function getEventIcon(eventType: string): string {
  return EVENT_ICONS[eventType] || "•";
}

/**
 * Get status icon for session status
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case "complete":
      return "✅";
    case "stalled":
      return "⚠️ ";
    case "error":
      return "❌";
    case "cancelled":
      return "🛑";
    case "running":
      return "🔄";
    default:
      return "•";
  }
}

/**
 * Color text
 */
function color(text: string, colorCode: string): string {
  return `${colorCode}${text}${COLORS.RESET}`;
}

/**
 * Export COLORS for external use
 */
export { COLORS, color };

/* ------------------------------------------------------------------ */
/*  Event Grouping                                                    */
/* ------------------------------------------------------------------ */

interface EventGroup {
  type: "iteration" | "task" | "event";
  iteration?: number;
  taskId?: string;
  epicId?: string;
  attempt?: number;
  events: SessionEvent[];
  children?: EventGroup[];
  startTime?: string;
  endTime?: string;
  duration?: number;
  success?: boolean;
}

/**
 * Group events by iteration -> task -> attempt structure
 */
function groupEventsByStructure(events: SessionEvent[]): EventGroup[] {
  const iterations: EventGroup[] = [];
  let currentIteration: EventGroup | null = null;
  let currentTask: EventGroup | null = null;

  for (const event of events) {
    // Session-level events
    if (
      event.eventType === "SESSION_START" ||
      event.eventType === "SESSION_END"
    ) {
      iterations.push({
        type: "event",
        events: [event],
      });
      continue;
    }

    // Iteration start
    if (event.eventType === "ITERATION_START") {
      currentIteration = {
        type: "iteration",
        iteration: (event.metadata?.iteration as number) || 0,
        events: [event],
        children: [],
        startTime: event.timestamp,
      };
      iterations.push(currentIteration);
      currentTask = null;
      continue;
    }

    // Task selection
    if (event.eventType === "TASK_SELECTED") {
      currentTask = {
        type: "task",
        taskId: (event.metadata?.taskId as string) || "unknown",
        epicId: (event.metadata?.epicId as string) || "unknown",
        attempt: (event.metadata?.attempt as number) || 1,
        events: [event],
        children: [],
        startTime: event.timestamp,
      };
      if (currentIteration) {
        currentIteration.children = currentIteration.children || [];
        currentIteration.children.push(currentTask);
      } else {
        iterations.push(currentTask);
      }
      continue;
    }

    // Task completion
    if (event.eventType === "TASK_ATTEMPT_COMPLETE") {
      if (currentTask) {
        currentTask.events.push(event);
        currentTask.endTime = event.timestamp;
        currentTask.duration = event.metadata?.duration as number;
        currentTask.success = event.metadata?.success as boolean;
      }
      continue;
    }

    // Other task-level events
    if (currentTask && event.metadata?.taskId === currentTask.taskId) {
      currentTask.events.push(event);
    } else if (currentIteration) {
      currentIteration.events.push(event);
    } else {
      iterations.push({
        type: "event",
        events: [event],
      });
    }
  }

  return iterations;
}

/**
 * Render grouped events in tree format
 */
function renderGroupedEvents(
  groups: EventGroup[],
  options: InspectOptions,
): void {
  for (const group of groups) {
    if (group.type === "event") {
      // Standalone event
      for (const event of group.events) {
        const icon = getEventIcon(event.eventType);
        const timestamp = formatTimestamp(event.timestamp, true);
        console.log(
          `${color(timestamp, COLORS.GRAY)} ${icon} ${event.eventType}`,
        );
      }
    } else if (group.type === "iteration") {
      // Iteration group
      renderIteration(group, options);
    } else if (group.type === "task") {
      // Standalone task (no iteration parent)
      renderTask(group, "", options);
    }
  }
}

/**
 * Render iteration group
 */
function renderIteration(iteration: EventGroup, options: InspectOptions): void {
  const icon = "📋";
  const iterNum = iteration.iteration || 0;

  console.log("");
  console.log(`${icon} ${color(`Iteration ${iterNum}`, COLORS.BOLD)}`);

  if (!iteration.children || iteration.children.length === 0) {
    console.log("   (no tasks)");
    return;
  }

  // Render tasks
  for (let i = 0; i < iteration.children.length; i++) {
    const task = iteration.children[i];
    const isLast = i === iteration.children.length - 1;
    renderTask(task, isLast ? "└─" : "├─", options);
  }
}

/**
 * Render task group
 */
function renderTask(
  task: EventGroup,
  prefix: string,
  options: InspectOptions,
): void {
  const timestamp = task.startTime ? formatTimestamp(task.startTime, true) : "";
  const taskName = task.taskId || "unknown";
  const epic = task.epicId ? color(`[${task.epicId}]`, COLORS.GRAY) : "";
  // Count stall retries from filesystem (numbered attempt dirs: 01, 02, ...)
  // Session events don't log inner stall retries, so read the attempt dirs directly
  let stallRetries = 0;
  if (task.epicId && task.taskId) {
    const projectRoot = options.dir || process.cwd();
    const leafId = task.taskId.startsWith(`${task.epicId}/`)
      ? task.taskId.slice(task.epicId.length + 1)
      : task.taskId;
    const attemptsDir = join(
      getEpicsDir(projectRoot),
      task.epicId,
      "tasks",
      leafId,
      "attempts",
    );
    if (existsSync(attemptsDir)) {
      try {
        stallRetries = readdirSync(attemptsDir).filter((e) =>
          /^\d+$/.test(e),
        ).length;
      } catch {
        /* ignore */
      }
    }
  }
  const stallSuffix =
    stallRetries > 0
      ? color(` (${stallRetries} stall retries)`, COLORS.GRAY)
      : "";
  const attempt = task.attempt
    ? color(`#${task.attempt}`, COLORS.GRAY) + stallSuffix
    : "";

  // Task header with result
  let resultIcon = "▶ ";
  let resultText = "";

  if (task.success !== undefined) {
    if (task.success) {
      resultIcon = "✅";
      resultText = color("PASS", COLORS.GREEN);
    } else {
      resultIcon = "❌";
      resultText = color("FAIL", COLORS.RED);
    }
  }

  const durationText = task.duration
    ? color(formatDuration(task.duration), COLORS.GRAY)
    : "";

  console.log(
    `${prefix} ${resultIcon} ${taskName} ${attempt} ${resultText} ${durationText}`,
  );

  if (!options.compact && epic) {
    const indent = prefix === "└─" ? "   " : "│  ";
    console.log(`${indent}   ${epic}`);
  }

  // Show task journal path (if available)
  if (!options.compact && task.epicId && task.taskId) {
    const indent = prefix === "└─" ? "   " : "│  ";
    const attemptNum = String(task.attempt || 1).padStart(2, "0");
    // task.taskId may be "epicId/taskId" — strip epicId prefix to avoid duplication
    const leafTaskId = task.taskId.startsWith(`${task.epicId}/`)
      ? task.taskId.slice(task.epicId.length + 1)
      : task.taskId;
    const journalPath = `.converge/journal/default/tasks/${task.epicId}/tasks/${leafTaskId}/attempts/${attemptNum}/`;
    console.log(
      `${indent}   ${color("📁", COLORS.BLUE)} ${color(journalPath, COLORS.GRAY)}`,
    );
  }

  // Show important sub-events (gaps, strategies, convergence)
  if (!options.compact) {
    const indent = prefix === "└─" ? "   " : "│  ";
    const importantEvents = task.events.filter(
      (e) =>
        e.eventType === "GAP_DETECTED" ||
        e.eventType === "STRATEGY_ATTEMPTED" ||
        e.eventType === "CONVERGENCE_ACHIEVED" ||
        e.eventType === "CONVERGENCE_STALLED",
    );

    for (const event of importantEvents) {
      const icon = getEventIcon(event.eventType);
      const msg = event.message || event.eventType;
      console.log(`${indent}   ${icon} ${color(msg, COLORS.GRAY)}`);
    }
  }

  // Show detailed tool calls in verbose mode
  if (options.verbose) {
    const indent = prefix === "└─" ? "   " : "│  ";
    const toolEvents = task.events.filter(
      (e) =>
        e.eventType === "TOOL_CALL" ||
        e.eventType === "TOOL_RESULT" ||
        e.eventType === "AI_OUTPUT",
    );

    if (toolEvents.length > 0) {
      console.log(
        `${indent}   ${color("Detailed execution log:", COLORS.GRAY)}`,
      );
      for (const event of toolEvents) {
        const icon = getEventIcon(event.eventType);
        const msg = event.message || "";
        const time = formatTimestamp(event.timestamp, true);

        if (event.eventType === "TOOL_CALL") {
          console.log(
            `${indent}      ${color(time, COLORS.GRAY)} ${icon} ${msg}`,
          );
        } else if (event.eventType === "TOOL_RESULT") {
          const success = event.metadata?.success ? "✓" : "✗";
          const size = event.metadata?.size
            ? ` (${formatBytes(event.metadata.size as number)})`
            : "";
          console.log(
            `${indent}      ${color(time, COLORS.GRAY)} ${success}${size}`,
          );
        } else if (event.eventType === "AI_OUTPUT") {
          // Show truncated AI output
          const truncated =
            msg.length > 80 ? msg.substring(0, 80) + "..." : msg;
          console.log(
            `${indent}      ${color(time, COLORS.GRAY)} ${icon} ${color(truncated, COLORS.GRAY)}`,
          );
        }
      }
    }
  }
}

/**
 * Format bytes helper for timeline display
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/* ------------------------------------------------------------------ */
/*  Single Session Timeline                                           */
/* ------------------------------------------------------------------ */

/**
 * Render single session timeline
 */
export function renderSingleSessionTimeline(
  session: SessionData,
  options: InspectOptions,
): void {
  const { metadata, events, sessionDir } = session;

  // Calculate duration
  const duration = metadata.duration || 0;
  const durationStr = formatDuration(duration);

  // Header
  console.log("");
  console.log(color(`📊 Session: ${session.sessionId}`, COLORS.BOLD));
  console.log(
    `   Project: ${metadata.projectName} | Duration: ${durationStr} | Status: ${metadata.status}`,
  );
  console.log(`   ${color("Directory:", COLORS.GRAY)} ${sessionDir}`);

  // Configuration
  if (metadata.config) {
    console.log("");
    console.log(color("⚙️  Configuration:", COLORS.BOLD));
    console.log(`   Max Iterations: ${metadata.config.maxIterations}`);
    if (metadata.config.maxAttemptsPerTask) {
      console.log(
        `   Max Attempts Per Task: ${metadata.config.maxAttemptsPerTask}`,
      );
    }
  }

  // Environment
  if (metadata.environment) {
    console.log("");
    console.log(color("🖥️  Environment:", COLORS.BOLD));
    console.log(`   Node: ${metadata.environment.nodeVersion}`);
    console.log(`   Platform: ${metadata.environment.platform}`);
  }

  // Outcomes Summary
  if (metadata.outcomes) {
    console.log("");
    console.log(color("✅ Outcomes:", COLORS.BOLD));
    console.log(
      `   Tasks Completed: ${color(String(metadata.outcomes.tasksCompleted), COLORS.GREEN)}`,
    );
    console.log(
      `   Tasks Failed: ${color(String(metadata.outcomes.tasksFailed), metadata.outcomes.tasksFailed > 0 ? COLORS.RED : COLORS.GRAY)}`,
    );
    console.log(`   Gaps Resolved: ${metadata.outcomes.gapsResolved}`);
    console.log(`   Iterations: ${metadata.outcomes.totalIterations}`);
    console.log(
      `   Convergence: ${metadata.outcomes.convergenceAchieved ? color("Yes", COLORS.GREEN) : color("No", COLORS.YELLOW)}`,
    );
  }

  console.log("");

  if (events.length === 0) {
    console.log("No events in this session.");
    console.log("");
    return;
  }

  // Group events by iteration and task for tree structure
  const grouped = groupEventsByStructure(events);

  // Render grouped tree
  renderGroupedEvents(grouped, options);

  console.log("");

  // Final Summary
  const statusIcon = getStatusIcon(metadata.status);
  if (metadata.status === "complete") {
    console.log(
      `${statusIcon} Session completed successfully in ${durationStr}`,
    );
  } else if (metadata.status === "stalled") {
    console.log(`${statusIcon} Session stalled after ${durationStr}`);
  } else if (metadata.status === "error") {
    console.log(`${statusIcon} Session ended with error after ${durationStr}`);
  } else if (metadata.status === "cancelled") {
    console.log(`${statusIcon} Session cancelled by user after ${durationStr}`);
  } else if (metadata.status === "running") {
    console.log(`${statusIcon} Session still running (not finalized)`);
  }

  // Usage hints
  console.log("");
  console.log(color("📁 Explore:", COLORS.BOLD));
  console.log(
    `   converge inspect --session=${session.sessionId} --dirs          Show directory structure`,
  );
  console.log(
    `   converge inspect --session=${session.sessionId} --toolDetails   Show detailed tool calls`,
  );
  console.log(
    `   converge inspect --session=${session.sessionId} --ai            Show AI activity`,
  );
  console.log("");
}

/**
 * Format a single event line
 */
function formatEventLine(
  event: SessionEvent,
  timestamp: string,
  icon: string,
  options: InspectOptions,
): string {
  const parts: string[] = [];

  // Timestamp
  parts.push(color(timestamp, COLORS.GRAY));

  // Icon + Event Type
  parts.push(`${icon} ${color(event.eventType, COLORS.BOLD)}`);

  // Message
  if (event.message && !options.compact) {
    parts.push(event.message);
  }

  return parts.join(" ");
}

/**
 * Format event details (metadata)
 */
function formatEventDetails(
  event: SessionEvent,
  options: InspectOptions,
): string {
  if (!event.metadata || options.compact) {
    return "";
  }

  const lines: string[] = [];
  const indent = "           ";

  // Task-related details
  if (event.metadata.taskId) {
    lines.push(`${indent}Task: ${event.metadata.taskId}`);
  }

  if (event.metadata.epicId) {
    lines.push(`${indent}Epic: ${event.metadata.epicId}`);
  }

  if (event.metadata.attempt) {
    lines.push(`${indent}Attempt: #${event.metadata.attempt}`);
  }

  // Duration
  if (event.metadata.duration && typeof event.metadata.duration === "number") {
    const duration = formatDuration(event.metadata.duration);
    lines.push(`${indent}Duration: ${duration}`);
  }

  // Success status
  if (typeof event.metadata.success === "boolean") {
    const status = event.metadata.success
      ? color("SUCCESS", COLORS.GREEN)
      : color("FAILED", COLORS.RED);
    lines.push(`${indent}Result: ${status}`);
  }

  // Gap type
  if (event.metadata.gapType) {
    lines.push(`${indent}Gap Type: ${event.metadata.gapType}`);
  }

  // Strategy
  if (event.metadata.strategy) {
    lines.push(`${indent}Strategy: ${event.metadata.strategy}`);
  }

  // Tool usage (if --tools flag)
  if (options.tools && event.metadata.toolName) {
    lines.push(`${indent}Tool: ${event.metadata.toolName}`);
    if (event.metadata.params) {
      const paramsStr = JSON.stringify(event.metadata.params);
      if (paramsStr.length < 80) {
        lines.push(`${indent}Params: ${paramsStr}`);
      }
    }
  }

  // AI activity (if --ai flag)
  if (options.ai && event.metadata.activityType) {
    lines.push(`${indent}AI Activity: ${event.metadata.activityType}`);
  }

  // Progress info
  if (
    event.metadata.tasksComplete !== undefined &&
    event.metadata.tasksTotal !== undefined
  ) {
    lines.push(
      `${indent}Progress: ${event.metadata.tasksComplete}/${event.metadata.tasksTotal}`,
    );
  }

  return lines.length > 0 ? lines.join("\n") : "";
}

/* ------------------------------------------------------------------ */
/*  Multi-Session Timeline                                            */
/* ------------------------------------------------------------------ */

/**
 * Render multi-session timeline (compact view)
 */
export function renderMultiSessionTimeline(
  sessions: SessionInfo[],
  options: InspectOptions,
): void {
  console.log("");
  console.log(color(`📊 Sessions (last ${sessions.length})`, COLORS.BOLD));
  console.log("");

  // Header row
  const idWidth = 28;
  const durationWidth = 10;
  const statusWidth = 10;
  const tasksWidth = 8;
  const failedWidth = 8;

  console.log(
    "ID".padEnd(idWidth) +
      "Duration".padEnd(durationWidth) +
      "Status".padEnd(statusWidth) +
      "Tasks".padEnd(tasksWidth) +
      "Failed".padEnd(failedWidth) +
      "Timestamp",
  );
  console.log("─".repeat(100));

  for (const session of sessions) {
    const { metadata } = session;
    const duration = metadata.duration
      ? formatDuration(metadata.duration)
      : "running";
    const statusIcon = getStatusIcon(metadata.status);

    // Parse timestamp for display
    const timestamp = new Date(metadata.startTime);
    const dateStr = timestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const timeStr = timestamp.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const tasksComplete = metadata.outcomes?.tasksCompleted?.toString() || "0";
    const tasksFailed = metadata.outcomes?.tasksFailed?.toString() || "0";

    console.log(
      session.sessionId.padEnd(idWidth) +
        duration.padEnd(durationWidth) +
        `${statusIcon} ${metadata.status}`.padEnd(statusWidth + 2) +
        tasksComplete.padEnd(tasksWidth) +
        tasksFailed.padEnd(failedWidth) +
        `${dateStr} ${timeStr}`,
    );
  }

  console.log("");
  console.log(
    color("📁 Session directories:", COLORS.GRAY) +
      " .converge/journal/sessions/",
  );
  console.log("");
  console.log(color("Usage:", COLORS.BOLD));
  console.log("  converge inspect --session=<id>     View session details");
  console.log(
    "  converge inspect --dirs              Show directory structure",
  );
  console.log("  converge inspect --last=N            Show last N sessions");
  console.log("");
}

/* ------------------------------------------------------------------ */
/*  Directory Navigation                                              */
/* ------------------------------------------------------------------ */

/**
 * Render directory tree for a session
 */
export function renderDirectoryTree(
  sessionDir: string,
  sessionId: string,
): void {
  console.log("");
  console.log(color(`📁 Session Directory: ${sessionId}`, COLORS.BOLD));
  console.log(color(`   Path: ${sessionDir}`, COLORS.GRAY));
  console.log("");

  if (!existsSync(sessionDir)) {
    console.log(color("   Directory not found", COLORS.RED));
    console.log("");
    return;
  }

  // Helper to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  // Helper to get file description
  const getFileDescription = (filename: string): string => {
    const descriptions: Record<string, string> = {
      "metadata.json": "Session config & outcomes",
      "events.jsonl": "Structured event log",
      "progress.jsonl": "Iteration snapshots",
      "session.log": "Human-readable log",
    };
    return descriptions[filename] || "";
  };

  // Recursively list directory contents
  const listDir = (
    dirPath: string,
    prefix: string = "",
    isLast: boolean = true,
  ): void => {
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true }).sort(
        (a: any, b: any) => {
          // Directories first, then files
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        },
      );

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const isLastEntry = i === entries.length - 1;
        const connector = isLastEntry ? "└── " : "├── ";
        const childPrefix = prefix + (isLastEntry ? "    " : "│   ");

        if (entry.isDirectory()) {
          console.log(
            `${prefix}${connector}${color("📁 " + entry.name + "/", COLORS.BLUE)}`,
          );
          listDir(join(dirPath, entry.name), childPrefix, isLastEntry);
        } else {
          const filePath = join(dirPath, entry.name);
          const stats = statSync(filePath);
          const size = formatFileSize(stats.size);
          const desc = getFileDescription(entry.name);
          const descText = desc ? color(` [${desc}]`, COLORS.GRAY) : "";
          console.log(
            `${prefix}${connector}📄 ${entry.name} ${color(`(${size})`, COLORS.GRAY)}${descText}`,
          );
        }
      }
    } catch (err) {
      console.log(`${prefix}${color("Error reading directory", COLORS.RED)}`);
    }
  };

  listDir(sessionDir);

  console.log("");
  console.log(color("Usage:", COLORS.BOLD));
  console.log(`  cat ${sessionDir}/events.jsonl`);
  console.log(`  converge inspect --session=${sessionId} --tools`);
  console.log("");
}

/* ------------------------------------------------------------------ */
/*  Convergence View                                                  */
/* ------------------------------------------------------------------ */

interface ConvergenceNode {
  id: string;
  handler: string;
  status: string;
  origin: string;
  result?: {
    action: string;
    success?: boolean;
    reason?: string;
    gaps?: Array<{
      id: string;
      type: string;
      severity?: string;
      description: string;
      resolved: boolean;
      metadata?: Record<string, unknown>;
    }>;
    durationMs: number;
  };
  data?: Record<string, unknown>;
}

interface ConvergenceEdge {
  from: string;
  to: string;
  iteration: number;
  ts: string;
}

interface WalkerStateData {
  iteration: number;
  stallCount: number;
  nodes: ConvergenceNode[];
  edges: ConvergenceEdge[];
}

/**
 * Humanize a node ID for display.
 * "check-wbs-seeded#3" → "Check WBS Seeded"
 * "run-strategy:task-run" → "Strategy: task-run"
 */
function humanizeNodeId(node: ConvergenceNode): string {
  // Strip iteration suffix like "#2", "#3"
  const base = node.id.replace(/#\d+$/, "");

  // Strategy nodes: show strategy name
  if (base.startsWith("run-strategy:")) {
    const stratName =
      (node.data?.strategy as string) || base.slice("run-strategy:".length);
    return `Strategy: ${stratName}`;
  }

  // Convert kebab-case to title case
  return base.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Shorten a gap description for inline display.
 * Strips "[task/path] " prefix and shortens common patterns.
 */
function shortenGapDesc(gap: {
  description: string;
  metadata?: Record<string, unknown>;
}): string {
  let desc = gap.description;
  // Strip task prefix "[task/path] "
  const prefixMatch = desc.match(/^\[.*?\]\s*/);
  if (prefixMatch) desc = desc.slice(prefixMatch[0].length);

  // Shorten "Task output not created: .stitch/system/META.md" → "Missing: META.md"
  const outputMatch = desc.match(/^Task output not created:\s*(.+)$/);
  if (outputMatch) {
    const file = outputMatch[1].split("/").pop() || outputMatch[1];
    return `Missing: ${file}`;
  }

  // Shorten "Check failed: META.md exists" → "Check: META.md exists"
  const checkMatch = desc.match(/^Check failed:\s*(.+)$/);
  if (checkMatch) {
    return `Check: ${checkMatch[1]}`;
  }

  return desc;
}

/**
 * Render comprehensive convergence progress for a task.
 */
export function renderConvergenceView(
  taskPath: string,
  state: WalkerStateData,
  options: InspectOptions,
): void {
  const { iteration, stallCount, nodes, edges } = state;

  // --- Compute wall time ---
  let wallTimeStr = "";
  if (edges.length >= 2) {
    const firstTs = edges[0].ts;
    const lastTs = edges[edges.length - 1].ts;
    if (firstTs && lastTs) {
      const totalMs = new Date(lastTs).getTime() - new Date(firstTs).getTime();
      if (totalMs > 0) {
        wallTimeStr = formatDuration(totalMs);
      }
    }
  }

  // --- Header ---
  console.log("");
  const headerParts = [`Iter ${iteration}`];
  if (stallCount > 0) headerParts.push(`Stalls ${stallCount}`);
  if (wallTimeStr) headerParts.push(wallTimeStr);
  console.log(
    color(`🎯 ${taskPath}`, COLORS.BOLD) +
      color(`  ${headerParts.join(" · ")}`, COLORS.GRAY),
  );

  // --- Timeline with inline gaps and decisions ---
  if (edges.length > 0) {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Pre-compute rows for column alignment
    interface TimelineRow {
      iteration: number;
      ts: string;
      icon: string;
      name: string;
      dur: string;
      action: string; // AI decision: continue / done / bail
      reason: string; // reason text if present
      origin: string; // planned / reactive (skip initial)
      gaps: Array<{ desc: string; resolved: boolean; kind: string }>;
      isLast: boolean;
    }

    const rows: TimelineRow[] = [];

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const targetNode = nodeMap.get(edge.to);
      const isLast = i === edges.length - 1;

      if (!targetNode) {
        rows.push({
          iteration: edge.iteration,
          ts: edge.ts ? formatTimestamp(edge.ts, true) : "",
          icon: "?",
          name: edge.to,
          dur: "",
          action: "",
          reason: "",
          origin: "",
          gaps: [],
          isLast,
        });
        continue;
      }

      const icon =
        targetNode.status === "done"
          ? "✅"
          : targetNode.status === "failed"
            ? "❌"
            : targetNode.status === "executing"
              ? "🔄"
              : targetNode.status === "skipped"
                ? "⏭️"
                : "⏳";

      const dur = targetNode.result
        ? formatDuration(targetNode.result.durationMs)
        : "";
      const action = targetNode.result?.action || "";
      const reason = targetNode.result?.reason || "";
      const origin = targetNode.origin !== "initial" ? targetNode.origin : "";

      // Inline gaps for this node
      const gaps: TimelineRow["gaps"] = [];
      if (targetNode.result?.gaps && targetNode.result.gaps.length > 0) {
        for (const g of targetNode.result.gaps) {
          gaps.push({
            desc: shortenGapDesc(g),
            resolved: g.resolved,
            kind: (g.metadata?.gapKind as string) || "",
          });
        }
      }

      rows.push({
        iteration: edge.iteration,
        ts: edge.ts ? formatTimestamp(edge.ts, true) : "",
        icon,
        name: humanizeNodeId(targetNode),
        dur,
        action,
        reason,
        origin,
        gaps,
        isLast,
      });
    }

    // Column widths
    const maxName = Math.max(...rows.map((r) => r.name.length));
    const maxDur = Math.max(...rows.map((r) => r.dur.length));

    let prevIteration = 0;

    for (const row of rows) {
      // Iteration separator
      if (row.iteration !== prevIteration) {
        console.log("");
        if (row.iteration > 1) {
          console.log(
            color(
              `  ── Iteration ${row.iteration} ${"─".repeat(50)}`,
              COLORS.GRAY,
            ),
          );
        }
        prevIteration = row.iteration;
      }

      const connector = row.isLast ? "└─" : "├─";
      const paddedName = row.name.padEnd(maxName);
      const paddedDur = row.dur.padStart(maxDur);

      // Build decision annotation: "→ continue" or "→ bail: Max stalls reached"
      let decision = "";
      if (row.action) {
        const actionColor =
          row.action === "done"
            ? COLORS.GREEN
            : row.action === "bail"
              ? COLORS.RED
              : COLORS.GRAY;
        decision = color(`  → ${row.action}`, actionColor);
        if (row.reason) {
          decision += color(`: ${row.reason}`, COLORS.GRAY);
        }
      }

      const originTag = row.origin
        ? color(` [${row.origin}]`, COLORS.BLUE)
        : "";

      console.log(
        color(`  ${row.ts}`, COLORS.GRAY) +
          `  ${connector} ${row.icon} ${paddedName}` +
          color(`  ${paddedDur}`, COLORS.GRAY) +
          decision +
          originTag,
      );

      // Inline gaps under this node
      if (row.gaps.length > 0) {
        const gapConnector = row.isLast ? " " : "│";
        for (const g of row.gaps) {
          const gIcon = g.resolved
            ? color("✓", COLORS.GREEN)
            : color("✗", COLORS.RED);
          const kind = g.kind ? color(` (${g.kind})`, COLORS.GRAY) : "";
          console.log(
            color(`            ${gapConnector}`, COLORS.GRAY) +
              `     ${gIcon} ${color(g.desc, COLORS.GRAY)}${kind}`,
          );
        }
      }
    }
  }

  // --- Buffered nodes (only in non-compact mode) ---
  const bufferedNodes = nodes.filter((n) => n.status === "buffered");
  if (bufferedNodes.length > 0 && !options.compact) {
    console.log("");
    console.log(
      color(
        `  Queued  ${bufferedNodes.length} nodes not executed`,
        COLORS.GRAY,
      ),
    );
    const sorted = [...bufferedNodes].sort(
      (a, b) =>
        ((b.data?.priority as number) || 0) -
        ((a.data?.priority as number) || 0),
    );
    for (const bn of sorted) {
      const cond = bn.data?.applicable
        ? ` requires: ${bn.data.applicable}`
        : "";
      console.log(color(`          ⏳ ${bn.id}${cond}`, COLORS.GRAY));
    }
  }

  // --- Outcome ---
  const verifyNode = [...nodes]
    .reverse()
    .find((n) => n.handler === "verify" && n.result);
  const lastFailedNode = [...nodes]
    .reverse()
    .find((n) => n.status === "failed" && n.result);
  const lastDoneNode = [...nodes]
    .reverse()
    .find((n) => n.status === "done" && n.result);
  const outcomeNode = lastFailedNode || verifyNode || lastDoneNode;

  if (outcomeNode?.result) {
    console.log("");
    const action = outcomeNode.result.action;
    const reason = outcomeNode.result.reason || "";
    let icon: string;
    let actionColor: string;
    if (action === "done") {
      icon = "🏁";
      actionColor = COLORS.GREEN;
    } else if (action === "bail") {
      icon = "🛑";
      actionColor = COLORS.RED;
    } else {
      icon = "🔄";
      actionColor = COLORS.YELLOW;
    }
    console.log(
      color(`${icon} `, actionColor) +
        color(action.toUpperCase(), actionColor) +
        (reason ? color(` — ${reason}`, COLORS.GRAY) : "") +
        (wallTimeStr ? color(`  (${wallTimeStr})`, COLORS.GRAY) : ""),
    );
  }

  console.log("");
}

/* ------------------------------------------------------------------ */
/*  Aggregated Inspection                                             */
/* ------------------------------------------------------------------ */

/**
 * Render comprehensive aggregated inspection across all sessions and journals
 */
export async function renderAggregatedInspection(
  projectDir: string,
  sessions: SessionInfo[],
  options: InspectOptions,
): Promise<void> {
  console.log("");
  console.log(
    color("🔍 Execution Timeline & Workflow Inspection", COLORS.BOLD),
  );
  console.log(
    color(
      "   Development tool - showing detailed session progression and issues",
      COLORS.GRAY,
    ),
  );
  console.log("");

  if (sessions.length === 0) {
    console.log("No execution sessions found.");
    console.log("");
    return;
  }

  // Load task journal data for issues and workflow
  const journalDir = getEpicsDir(projectDir);
  const taskIssues = await loadTaskIssues(journalDir);

  // Sort sessions chronologically (oldest first for timeline)
  const timeline = [...sessions].sort((a, b) =>
    a.metadata.startTime.localeCompare(b.metadata.startTime),
  );

  // Track all task IDs rendered from session events (across all sessions)
  const allRenderedTaskIds = new Set<string>();

  // Render chronological timeline of sessions with detailed workflow info
  for (let i = 0; i < timeline.length; i++) {
    const session = timeline[i];
    const { metadata } = session;

    // Session header
    const statusIcon = getStatusIcon(metadata.status);
    const timestamp = new Date(metadata.startTime);
    const timeStr = timestamp.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const dateStr = timestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    console.log("");
    console.log("═".repeat(80));
    console.log(
      color(`${statusIcon} Session ${i + 1}/${timeline.length}`, COLORS.BOLD) +
        color(` - ${session.sessionId}`, COLORS.GRAY),
    );
    console.log(
      color(`   ${dateStr} ${timeStr}`, COLORS.GRAY) +
        (metadata.duration
          ? color(
              ` • Duration: ${formatDuration(metadata.duration)}`,
              COLORS.GRAY,
            )
          : ""),
    );
    console.log("═".repeat(80));

    // Read events for this session
    const eventsPath = join(session.sessionDir, "events.jsonl");
    const sessionLogPath = join(session.sessionDir, "session.log");

    if (existsSync(eventsPath)) {
      try {
        const eventsContent = readFileSync(eventsPath, "utf-8");
        const events: SessionEvent[] = eventsContent
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line));

        // Group events by task
        const taskGroups = new Map<string, SessionEvent[]>();
        let currentTask: string | null = null;

        for (const event of events) {
          if (
            event.eventType === "TASK_SELECTED" ||
            event.eventType === "TASK_ATTEMPT_START"
          ) {
            currentTask = (event.metadata?.taskId as string) || "unknown";
            if (!taskGroups.has(currentTask)) {
              taskGroups.set(currentTask, []);
            }
          }
          if (currentTask) {
            taskGroups.get(currentTask)!.push(event);
          }
        }

        // Render each task's workflow
        const renderedTaskIds = new Set<string>();
        if (taskGroups.size > 0) {
          console.log("");
          console.log(color("📋 Tasks Executed:", COLORS.BOLD));
          console.log("");

          let taskNum = 1;
          for (const [taskId, taskEvents] of taskGroups) {
            renderTaskWorkflow(
              taskId,
              taskEvents,
              taskNum++,
              taskIssues.get(taskId),
            );
            renderedTaskIds.add(taskId);
          }
        } else {
          console.log(color("   No task execution found", COLORS.GRAY));
        }

        // Track which tasks appeared in session events across all sessions
        for (const id of renderedTaskIds) {
          allRenderedTaskIds.add(id);
        }
      } catch (err) {
        console.log(
          color("   ⚠️  Error reading session events", COLORS.YELLOW),
        );
      }
    }

    // Show session outcome
    if (metadata.outcomes) {
      console.log("");
      console.log(color("📊 Session Outcome:", COLORS.BOLD));
      console.log(`   Iterations: ${metadata.outcomes.totalIterations}`);
      console.log(
        `   Completed: ${color(String(metadata.outcomes.tasksCompleted), COLORS.GREEN)} tasks`,
      );
      if (metadata.outcomes.tasksFailed > 0) {
        console.log(
          `   Failed: ${color(String(metadata.outcomes.tasksFailed), COLORS.RED)} tasks`,
        );
      }
      console.log(
        `   Convergence: ${metadata.outcomes.convergenceAchieved ? color("✓ Achieved", COLORS.GREEN) : color("✗ Not achieved", COLORS.RED)}`,
      );
    }

    // Show session log path for deep dive
    if (existsSync(sessionLogPath)) {
      console.log("");
      console.log(color("📄 Detailed logs:", COLORS.GRAY));
      console.log(`   cat ${sessionLogPath}`);
      console.log(`   converge inspect --session=${session.sessionId}`);
    }
  }

  // Show tasks from journal that didn't appear in any session events
  const journalOnlyTasks = [...taskIssues.entries()]
    .filter(([id]) => !allRenderedTaskIds.has(id))
    .filter(([, data]) => data.checkpoint != null);

  if (journalOnlyTasks.length > 0) {
    console.log("");
    console.log("═".repeat(80));
    console.log(
      color(
        "📋 Tasks with journal data (no session events emitted):",
        COLORS.BOLD,
      ),
    );
    console.log("");

    let taskNum = 1;
    for (const [taskId, data] of journalOnlyTasks) {
      renderTaskWorkflow(taskId, [], taskNum++, data);
    }
  }

  console.log("");
  console.log("═".repeat(80));
  console.log("");
  console.log(color("🔍 Inspection Commands:", COLORS.BOLD));
  console.log(
    `   converge inspect --session=<id>    Deep dive into specific session`,
  );
  console.log(
    `   converge tree                       View task dependency tree`,
  );
  console.log(
    `   converge gantt                      Visualize execution order`,
  );
  console.log("");
}

/**
 * Render workflow for a single task showing attempts, strategies, gaps, outputs, checks
 */
function renderTaskWorkflow(
  taskId: string,
  events: SessionEvent[],
  taskNum: number,
  issueData?: TaskIssueData,
): void {
  // Find task completion event for status
  const completeEvent = events.find(
    (e) => e.eventType === "TASK_ATTEMPT_COMPLETE",
  );
  const success = (completeEvent?.metadata?.success as boolean) ?? false;
  const duration = (completeEvent?.metadata?.duration as number) ?? 0;

  // Determine status from checkpoint if available
  const cpStatus = issueData?.checkpoint?.status;
  let statusIcon: string;
  let statusText: string;
  if (cpStatus === "interrupted") {
    statusIcon = "⏸️";
    statusText = color("INTERRUPTED", COLORS.YELLOW);
  } else if (cpStatus === "complete" || success) {
    statusIcon = "✅";
    statusText = color("SUCCESS", COLORS.GREEN);
  } else {
    statusIcon = "❌";
    statusText = color("FAILED", COLORS.RED);
  }

  console.log(`   ${taskNum}. ${statusIcon} ${color(taskId, COLORS.BOLD)}`);
  console.log(
    `      ${statusText} ${duration > 0 ? color(`(${formatDuration(duration)})`, COLORS.GRAY) : ""}`,
  );

  // --- Attempt history from journal ---
  if (issueData?.attempts && issueData.attempts.length > 0) {
    console.log("");
    console.log(color("      Attempts:", COLORS.GRAY));
    for (const attempt of issueData.attempts) {
      const resultIcon = attempt.hasCheckResult
        ? attempt.checkPassed
          ? color("PASS", COLORS.GREEN)
          : color("FAIL", COLORS.RED)
        : color("incomplete", COLORS.YELLOW);
      const taskResult = attempt.hasTaskResult
        ? ""
        : color(" (no result)", COLORS.YELLOW);
      console.log(`         ${attempt.name}: ${resultIcon}${taskResult}`);
      if (attempt.checkSummary) {
        console.log(`            ${color(attempt.checkSummary, COLORS.GRAY)}`);
      }
    }
  }

  // --- Expected outputs from needs.json ---
  if (issueData?.outputs) {
    const { inputs, outputs: expectedOutputs, blocked } = issueData.outputs;
    if (expectedOutputs && expectedOutputs.length > 0) {
      console.log("");
      console.log(color("      Expected Outputs:", COLORS.GRAY));
      for (const out of expectedOutputs) {
        const exists = existsSync(join(process.cwd(), out));
        const icon = exists
          ? color("exists", COLORS.GREEN)
          : color("MISSING", COLORS.RED);
        console.log(`         ${out} [${icon}]`);
      }
    }
    if (inputs && inputs.length > 0) {
      console.log(color("      Inputs:", COLORS.GRAY));
      for (const inp of inputs) {
        const pattern = typeof inp === "string" ? inp : inp.pattern;
        const exists = existsSync(join(process.cwd(), pattern));
        const icon = exists
          ? color("ok", COLORS.GREEN)
          : color("MISSING", COLORS.RED);
        console.log(`         ${pattern} [${icon}]`);
      }
    }
    if (blocked) {
      console.log(
        `      ${color("BLOCKED", COLORS.RED)} — inputs not satisfied`,
      );
    }
  }

  // --- Checks from check.json ---
  if (issueData?.checks && issueData.checks.length > 0) {
    console.log("");
    console.log(color("      Checks Defined:", COLORS.GRAY));
    for (const check of issueData.checks) {
      const desc = check.description || check.id;
      const cmd = check.cmd ? color(` [${check.cmd}]`, COLORS.GRAY) : "";
      console.log(`         ${check.id}: ${desc}${cmd}`);
    }
  }

  // --- Repair strategy history from history.json ---
  if (issueData?.history) {
    const {
      totalAttempts,
      strategySummary,
      attempts: stratAttempts,
      failedApproaches,
    } = issueData.history;
    if (
      totalAttempts > 0 ||
      Object.keys(strategySummary).length > 0 ||
      stratAttempts.length > 0
    ) {
      console.log("");
      console.log(color("      Repair History:", COLORS.BLUE));
      console.log(`         Total repair attempts: ${totalAttempts}`);
      if (Object.keys(strategySummary).length > 0) {
        console.log("         Strategies used:");
        for (const [name, count] of Object.entries(strategySummary)) {
          console.log(`            ${name}: ${count}x`);
        }
      }
      for (const attempt of stratAttempts) {
        const sIcon = attempt.success ? "✓" : "✗";
        const err = attempt.error
          ? color(` — ${attempt.error}`, COLORS.GRAY)
          : "";
        console.log(`         ${sIcon} ${attempt.strategy}${err}`);
      }
      if (failedApproaches.length > 0) {
        console.log(
          `         Failed approaches: ${failedApproaches.join(", ")}`,
        );
      }
    } else if (cpStatus === "interrupted" || !success) {
      console.log("");
      console.log(color("      Repair History:", COLORS.BLUE));
      console.log(
        `         ${color("No repair strategies were attempted", COLORS.YELLOW)}`,
      );
      console.log(
        `         ${color("(ConvergeController loop retried without invoking GapResolutionPipeline)", COLORS.GRAY)}`,
      );
    }
  }

  // --- FEEDBACK.md ---
  if (issueData?.feedback) {
    console.log("");
    console.log(color("      Last Feedback:", COLORS.YELLOW));
    const lines = issueData.feedback.split("\n").slice(0, 8);
    for (const line of lines) {
      console.log(`         ${line}`);
    }
    if (issueData.feedback.split("\n").length > 8) {
      console.log(color("         ... (truncated)", COLORS.GRAY));
    }
  }

  // --- Session event: gaps detected ---
  const gapEvents = events.filter((e) => e.eventType === "GAP_DETECTED");
  if (gapEvents.length > 0) {
    console.log("");
    console.log(color("      Gaps Detected:", COLORS.YELLOW));
    // Deduplicate gap messages
    const seen = new Set<string>();
    for (const gap of gapEvents) {
      const msg =
        gap.message || (gap.metadata?.gapType as string) || "Unknown gap";
      if (!seen.has(msg)) {
        seen.add(msg);
        console.log(`         ⚠️  ${msg}`);
      }
    }
    if (gapEvents.length > seen.size) {
      console.log(
        color(
          `         (${gapEvents.length - seen.size} duplicate gap events omitted)`,
          COLORS.GRAY,
        ),
      );
    }
  }

  // --- Session event: strategies attempted ---
  const strategyEvents = events.filter(
    (e) => e.eventType === "STRATEGY_ATTEMPTED",
  );
  if (strategyEvents.length > 0) {
    console.log("");
    console.log(color("      Strategies (session events):", COLORS.GRAY));
    for (const stratEvent of strategyEvents) {
      const strategy = stratEvent.metadata?.strategy || stratEvent.message;
      const stratSuccess = events.some(
        (e) =>
          e.eventType === "CONVERGENCE_ACHIEVED" &&
          e.timestamp > stratEvent.timestamp,
      );
      const icon = stratSuccess ? "✓" : "→";
      console.log(`         ${icon} ${strategy}`);
    }
  }

  // --- Tool usage summary ---
  const toolCalls = events.filter((e) => e.eventType === "TOOL_CALL");
  if (toolCalls.length > 0) {
    const toolCount = toolCalls.length;
    const toolTypes = new Set(
      toolCalls.map((e) => e.metadata?.tool).filter(Boolean),
    );
    console.log("");
    console.log(
      color(`      Tools: ${toolCount} calls`, COLORS.GRAY) +
        color(` (${Array.from(toolTypes).join(", ")})`, COLORS.GRAY),
    );
  }

  // --- Issues summary ---
  if (issueData && issueData.issues.length > 0) {
    console.log("");
    console.log(color("      Issues:", COLORS.RED));
    for (const issue of issueData.issues.slice(0, 5)) {
      console.log(`         ✗ ${issue}`);
    }
    if (issueData.issues.length > 5) {
      console.log(
        color(
          `         ... and ${issueData.issues.length - 5} more`,
          COLORS.GRAY,
        ),
      );
    }
  }

  // --- Convergence status ---
  const convergenceEvent = events.find(
    (e) =>
      e.eventType === "CONVERGENCE_ACHIEVED" ||
      e.eventType === "CONVERGENCE_STALLED",
  );
  if (convergenceEvent) {
    const converged = convergenceEvent.eventType === "CONVERGENCE_ACHIEVED";
    const icon = converged ? "🎯" : "⏸️";
    const text = converged ? "Converged" : "Stalled";
    console.log("");
    console.log(
      color(`      ${icon} ${text}`, converged ? COLORS.GREEN : COLORS.YELLOW),
    );
  }

  console.log("");
}

interface TaskCheckpointData {
  type?: string;
  id?: string;
  status?: string;
  lastUpdated?: string;
  createdAt?: string;
  attempts?: Array<{
    attempt: number;
    startedAt: string;
    completedAt?: string;
    outcome?: string;
  }>;
  currentAttempt?: number;
}

interface TaskIssueData {
  issues: string[];
  attempts: AttemptInfo[];
  checkpoint: TaskCheckpointData | null;
  history: HistoryData | null;
  outputs: OutputSpec | null;
  checks: CheckSpec[];
  feedback: string | null;
}

interface AttemptInfo {
  name: string;
  hasCheckResult: boolean;
  checkPassed: boolean;
  checkSummary: string | null;
  hasTaskResult: boolean;
}

interface HistoryData {
  totalAttempts: number;
  strategySummary: Record<string, number>;
  attempts: Array<{ strategy: string; success: boolean; error?: string }>;
  failedApproaches: string[];
}

interface OutputSpec {
  inputs: Array<
    string | { pattern: string; count?: number; samples?: string[] }
  >;
  outputs: string[];
  blocked: boolean;
}

interface CheckSpec {
  id: string;
  cmd?: string;
  description?: string;
}

/**
 * Load rich task data from journal directories.
 *
 * Journal structure: epics/{epic-or-task}/ and epics/{epic}/{child-task}/
 * Each task dir may contain: checkpoint.json, history.json, attempts/{n}/
 */
async function loadTaskIssues(
  journalDir: string,
): Promise<Map<string, TaskIssueData>> {
  const result = new Map<string, TaskIssueData>();

  if (!existsSync(journalDir)) {
    return result;
  }

  try {
    const epics = readdirSync(journalDir, { withFileTypes: true }).filter((d) =>
      d.isDirectory(),
    );

    for (const epic of epics) {
      const epicDir = join(journalDir, epic.name);

      // Check if this epic dir itself is a task (has checkpoint.json)
      loadTaskJournalData(epicDir, epic.name, result);

      // Check for child tasks (direct subdirectories, not in tasks/ subdir)
      const children = readdirSync(epicDir, { withFileTypes: true }).filter(
        (d) => d.isDirectory() && d.name !== "attempts" && d.name !== "logs",
      );

      for (const child of children) {
        const childDir = join(epicDir, child.name);
        loadTaskJournalData(childDir, child.name, result);
      }
    }
  } catch {
    // Silently fail if we can't read journals
  }

  return result;
}

/**
 * Load journal data for a single task directory.
 */
function loadTaskJournalData(
  taskDir: string,
  taskId: string,
  result: Map<string, TaskIssueData>,
): void {
  const checkpointPath = join(taskDir, "checkpoint.json");
  if (!existsSync(checkpointPath)) return;

  const issues: string[] = [];
  let checkpoint: TaskCheckpointData | null = null;
  let history: HistoryData | null = null;
  let outputs: OutputSpec | null = null;
  const checks: CheckSpec[] = [];
  let feedback: string | null = null;
  const attempts: AttemptInfo[] = [];

  // Read checkpoint.json
  try {
    checkpoint = JSON.parse(readFileSync(checkpointPath, "utf-8"));
  } catch {
    /* skip */
  }

  // Read history.json
  const historyPath = join(taskDir, "history.json");
  if (existsSync(historyPath)) {
    try {
      history = JSON.parse(readFileSync(historyPath, "utf-8"));
    } catch {
      /* skip */
    }
  }

  // Scan attempts
  const attemptsDir = join(taskDir, "attempts");
  if (existsSync(attemptsDir)) {
    const attemptDirs = readdirSync(attemptsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const attemptEntry of attemptDirs) {
      const attemptDir = join(attemptsDir, attemptEntry.name);
      const info: AttemptInfo = {
        name: attemptEntry.name,
        hasCheckResult: false,
        checkPassed: false,
        checkSummary: null,
        hasTaskResult: false,
      };

      // CHECK.result.md
      const checkResultPath = join(attemptDir, "CHECK.result.md");
      if (existsSync(checkResultPath)) {
        info.hasCheckResult = true;
        try {
          const content = readFileSync(checkResultPath, "utf-8");
          info.checkPassed =
            !content.includes("FAILED") && !content.includes("ERROR");
          // Extract a one-line summary
          const lines = content.split("\n").filter(Boolean);
          const summaryLine = lines.find(
            (l) =>
              l.includes("✅") ||
              l.includes("❌") ||
              l.includes("FAILED") ||
              l.includes("SUCCESS"),
          );
          info.checkSummary = summaryLine?.trim() ?? null;
          if (!info.checkPassed) {
            issues.push(`Attempt ${attemptEntry.name}: check failed`);
          }
        } catch {
          /* skip */
        }
      }

      // TASK.result.md
      info.hasTaskResult = existsSync(join(attemptDir, "TASK.result.md"));

      // FEEDBACK.md (use the latest one found)
      const fbPath = join(attemptDir, "FEEDBACK.md");
      if (existsSync(fbPath)) {
        try {
          feedback = readFileSync(fbPath, "utf-8").trim();
        } catch {
          /* skip */
        }
      }

      // data/needs.json (use latest)
      const needsPath = join(attemptDir, "data", "needs.json");
      if (existsSync(needsPath)) {
        try {
          outputs = JSON.parse(readFileSync(needsPath, "utf-8"));
        } catch {
          /* skip */
        }
      }

      // data/check.json
      const checkJsonPath = join(attemptDir, "data", "check.json");
      if (existsSync(checkJsonPath) && checks.length === 0) {
        try {
          const parsed = JSON.parse(readFileSync(checkJsonPath, "utf-8"));
          if (Array.isArray(parsed)) {
            checks.push(...parsed);
          }
        } catch {
          /* skip */
        }
      }

      attempts.push(info);
    }
  }

  // Flag interrupted/failed tasks with no repair
  if (checkpoint?.status === "interrupted" && history?.totalAttempts === 0) {
    issues.push("Interrupted with no repair attempts");
  }

  result.set(taskId, {
    issues,
    attempts,
    checkpoint,
    history,
    outputs,
    checks,
    feedback,
  });
}
