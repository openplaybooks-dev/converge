/**
 * Inspect Display Utilities
 *
 * Formatting and rendering functions for the inspect command output.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExecutionMetadata } from "@converge/core/journal/execution-types.ts";
import { getEpicsDir } from "@converge/core/journal/structure.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SessionInfo {
  sessionId: string;
  sessionDir: string;
  metadata: ExecutionMetadata;
}

export interface TaskNode {
  id: string;
  path: string;
  status: string;
  totalChildren: number;
  completedChildren: number;
  failedChildren: number;
  currentAttempt?: number;
  attempts?: Array<{ attempt: number; outcome?: string; durationMs?: number }>;
  children: TaskNode[];
  lastUpdated?: string;
  createdAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Colors & Formatting                                               */
/* ------------------------------------------------------------------ */

export const COLORS = {
  RESET: "\x1b[0m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  RED: "\x1b[31m",
  BLUE: "\x1b[34m",
  GRAY: "\x1b[90m",
  BOLD: "\x1b[1m",
};

export function color(text: string, colorCode: string): string {
  return `${colorCode}${text}${COLORS.RESET}`;
}

export function formatTimestamp(timestamp: string, compact = false): string {
  const date = new Date(timestamp);
  if (compact) {
    return date.toISOString().slice(11, 19);
  }
  return `[${date.toISOString().slice(11, 19)}]`;
}

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

/* ------------------------------------------------------------------ */
/*  Status helpers                                                    */
/* ------------------------------------------------------------------ */

function statusLabel(status: string): string {
  switch (status) {
    case "complete":
      return color("OK  ", COLORS.GREEN);
    case "failed":
      return color("FAIL", COLORS.RED);
    case "running":
    case "in-progress":
      return color("RUN ", COLORS.BLUE);
    case "seeded":
      return color("SEED", COLORS.YELLOW);
    case "interrupted":
      return color("INT ", COLORS.YELLOW);
    case "partial":
      return color("PART", COLORS.YELLOW);
    default:
      return color("PEND", COLORS.GRAY);
  }
}

/* ------------------------------------------------------------------ */
/*  Project Overview                                                  */
/* ------------------------------------------------------------------ */

interface CheckpointCache {
  completedCount?: number;
  failedCount?: number;
  lastScan?: string;
}

interface ProjectCheckpoint {
  version?: number;
  timestamp?: string;
  _cache?: CheckpointCache;
}

export function renderProjectOverview(projectDir: string): void {
  const cpPath = join(projectDir, ".converge", "journal", ".checkpoint.json");
  if (!existsSync(cpPath)) {
    console.log(color("Project Overview", COLORS.BOLD));
    console.log("  No checkpoint data found.");
    console.log("");
    return;
  }

  try {
    const cp: ProjectCheckpoint = JSON.parse(readFileSync(cpPath, "utf-8"));
    const completed = cp._cache?.completedCount ?? 0;
    const failed = cp._cache?.failedCount ?? 0;
    const total = completed + failed;
    const lastUpdated = cp.timestamp
      ? new Date(cp.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "unknown";

    console.log(color("Project Overview", COLORS.BOLD));
    console.log(
      `  ${color(String(completed), COLORS.GREEN)} completed  ${color(String(failed), COLORS.RED)} failed  ${total} total`,
    );
    console.log(`  Last updated: ${lastUpdated}`);
    console.log("");
  } catch {
    console.log(color("Project Overview", COLORS.BOLD));
    console.log("  Error reading checkpoint.");
    console.log("");
  }
}

/* ------------------------------------------------------------------ */
/*  Sessions Summary                                                  */
/* ------------------------------------------------------------------ */

export function renderSessionsSummary(
  sessions: SessionInfo[],
  options: { json?: boolean },
): void {
  if (sessions.length === 0) {
    console.log("No sessions found.");
    console.log("");
    return;
  }

  console.log(
    color(`Sessions (${sessions.length} total, last 5)`, COLORS.BOLD),
  );

  const shown = sessions.slice(0, 5);

  for (const s of shown) {
    const { metadata } = s;
    const ts = new Date(metadata.startTime);
    const dateStr = ts.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const timeStr = ts.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Extract short suffix from session ID (last part after last dash)
    const idParts = s.sessionId.split("-");
    const shortId = idParts[idParts.length - 1] || s.sessionId;

    const duration = metadata.duration
      ? formatDuration(metadata.duration).padEnd(8)
      : "--".padEnd(8);

    const tasksCompleted = metadata.outcomes?.tasksCompleted ?? 0;
    const status = metadata.status.padEnd(10);

    console.log(
      `  ${dateStr} ${timeStr}  ${shortId.padEnd(8)}  ${status}  ${duration}  ${tasksCompleted} tasks`,
    );
  }

  if (sessions.length > 5) {
    console.log(color(`  ...${sessions.length - 5} more`, COLORS.GRAY));
  }
  console.log("");
}

/* ------------------------------------------------------------------ */
/*  Task Tree                                                         */
/* ------------------------------------------------------------------ */

export function renderTaskTree(
  nodes: TaskNode[],
  options: { depth?: number; json?: boolean },
  currentDepth = 0,
  prefix = "",
): void {
  if (currentDepth === 0) {
    console.log(color("Task Tree", COLORS.BOLD));
  }

  const maxDepth = options.depth === undefined ? 2 : options.depth;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = currentDepth === 0 ? "" : isLast ? "  " : "  ";
    const pipe = currentDepth === 0 ? "" : isLast ? "  " : "| ";

    const label = statusLabel(node.status);
    const childInfo =
      node.totalChildren > 0
        ? ` (${node.completedChildren}/${node.totalChildren})`
        : "";

    console.log(`${prefix}${connector}${label} ${node.id}${childInfo}`);

    // Show children or collapse
    if (node.children.length > 0) {
      const nextPrefix = prefix + pipe;

      if (maxDepth !== 0 && currentDepth + 1 >= maxDepth) {
        // Collapsed
        const completed = countCompleted(node);
        const failed = countFailed(node);
        const total = countTotal(node);
        const parts: string[] = [];
        if (completed > 0) parts.push(`${completed} complete`);
        if (failed > 0) parts.push(`${failed} failed`);
        console.log(
          `${nextPrefix}  ${color(`...${total} children (${parts.join(", ") || "none done"})`, COLORS.GRAY)}`,
        );
      } else {
        renderTaskTree(node.children, options, currentDepth + 1, nextPrefix);
      }
    }
  }

  if (currentDepth === 0) {
    console.log("");
  }
}

function countCompleted(node: TaskNode): number {
  let count = 0;
  for (const child of node.children) {
    if (child.status === "complete") count++;
    count += countCompleted(child);
  }
  return count;
}

function countFailed(node: TaskNode): number {
  let count = 0;
  for (const child of node.children) {
    if (child.status === "failed") count++;
    count += countFailed(child);
  }
  return count;
}

function countTotal(node: TaskNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countTotal(child);
  }
  return count;
}

/* ------------------------------------------------------------------ */
/*  Task Detail                                                       */
/* ------------------------------------------------------------------ */

export function renderTaskDetail(
  node: TaskNode,
  projectDir: string,
  taskPath: string,
  options: { depth?: number; json?: boolean },
): void {
  console.log(color(`Task: ${taskPath}`, COLORS.BOLD));
  console.log(`  Status: ${statusLabel(node.status).trim()}`);
  if (node.createdAt) {
    console.log(`  Created: ${new Date(node.createdAt).toLocaleString()}`);
  }
  if (node.lastUpdated) {
    console.log(`  Updated: ${new Date(node.lastUpdated).toLocaleString()}`);
  }
  if (node.totalChildren > 0) {
    console.log(
      `  Children: ${node.completedChildren}/${node.totalChildren} complete, ${node.failedChildren} failed`,
    );
  }

  // Attempt history
  if (node.attempts && node.attempts.length > 0) {
    console.log("");
    console.log(color("  Attempts:", COLORS.BOLD));
    for (const a of node.attempts) {
      const outcomeStr = a.outcome
        ? a.outcome === "success"
          ? color("success", COLORS.GREEN)
          : color(a.outcome, COLORS.RED)
        : color("in-progress", COLORS.YELLOW);
      const durStr = a.durationMs ? formatDuration(a.durationMs) : "--";
      console.log(`    #${a.attempt}: ${outcomeStr}  ${color(durStr, COLORS.GRAY)}`);
    }
  }

  // Child tree (fully expanded)
  if (node.children.length > 0) {
    console.log("");
    renderTaskTree(node.children, { depth: 0 }, 0, "  ");
  }

  // Suggest convergence view
  const tasksDir = getEpicsDir(projectDir);
  const taskFsPath = resolveTaskFsPath(tasksDir, taskPath);
  const convergencePath = join(taskFsPath, "logs", "convergence.json");
  if (existsSync(convergencePath)) {
    console.log(
      color(
        `  Tip: Use --converge --task=${taskPath} for convergence graph`,
        COLORS.GRAY,
      ),
    );
    console.log("");
  }
}

/**
 * Resolve a user-facing task path like "03-build-screens/001-home"
 * to the filesystem path under the tasks directory:
 * {tasksDir}/03-build-screens/tasks/001-home
 */
export function resolveTaskFsPath(tasksDir: string, taskPath: string): string {
  const segments = taskPath.split("/");
  let fsPath = tasksDir;
  for (let i = 0; i < segments.length; i++) {
    if (i === 0) {
      fsPath = join(fsPath, segments[i]);
    } else {
      fsPath = join(fsPath, "tasks", segments[i]);
    }
  }
  return fsPath;
}

/* ------------------------------------------------------------------ */
/*  Convergence View (kept verbatim from old code)                    */
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

function humanizeNodeId(node: ConvergenceNode): string {
  const base = node.id.replace(/#\d+$/, "");
  if (base.startsWith("run-strategy:")) {
    const stratName =
      (node.data?.strategy as string) || base.slice("run-strategy:".length);
    return `Strategy: ${stratName}`;
  }
  return base.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function shortenGapDesc(gap: {
  description: string;
  metadata?: Record<string, unknown>;
}): string {
  let desc = gap.description;
  const prefixMatch = desc.match(/^\[.*?\]\s*/);
  if (prefixMatch) desc = desc.slice(prefixMatch[0].length);

  const outputMatch = desc.match(/^Task output not created:\s*(.+)$/);
  if (outputMatch) {
    const file = outputMatch[1].split("/").pop() || outputMatch[1];
    return `Missing: ${file}`;
  }

  const checkMatch = desc.match(/^Check failed:\s*(.+)$/);
  if (checkMatch) {
    return `Check: ${checkMatch[1]}`;
  }

  return desc;
}

export function renderConvergenceView(
  taskPath: string,
  state: WalkerStateData,
  options: { compact?: boolean },
): void {
  const { iteration, stallCount, nodes, edges } = state;

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

  console.log("");
  const headerParts = [`Iter ${iteration}`];
  if (stallCount > 0) headerParts.push(`Stalls ${stallCount}`);
  if (wallTimeStr) headerParts.push(wallTimeStr);
  console.log(
    color(`🎯 ${taskPath}`, COLORS.BOLD) +
      color(`  ${headerParts.join(" · ")}`, COLORS.GRAY),
  );

  if (edges.length > 0) {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    interface TimelineRow {
      iteration: number;
      ts: string;
      icon: string;
      name: string;
      dur: string;
      action: string;
      reason: string;
      origin: string;
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

    const maxName = Math.max(...rows.map((r) => r.name.length));
    const maxDur = Math.max(...rows.map((r) => r.dur.length));

    let prevIteration = 0;

    for (const row of rows) {
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
