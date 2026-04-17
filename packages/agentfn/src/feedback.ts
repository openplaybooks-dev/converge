/**
 * Agent Feedback — send follow-up messages to a completed agent session.
 *
 * Uses the session ID from an initial agentfn() call to resume the
 * conversation and request structured output (status, summary, errors, etc.).
 */

import { sendFeedback as claudeSendFeedback } from "@crew/claudefn";
import type { AgentFnResult, Provider } from "./types.js";

export interface AgentFeedbackOptions {
  /** Session ID from the original agentfn result */
  sessionId: string;
  /** Follow-up prompt to send */
  prompt: string;
  /** Which provider was used (only "claude" supports resume) */
  provider?: Provider;
  /** Working directory */
  cwd?: string;
  /** Max time in ms (default: 120_000) */
  timeoutMs?: number;
  /** Extra CLI flags */
  cliFlags?: string[];
  /** Allowed tools for the follow-up */
  allowedTools?: string[];
}

/**
 * Send a follow-up message to an existing agent session.
 *
 * This resumes the conversation so the agent has full context from the
 * initial task execution. Useful for requesting structured completion
 * reports after a oneshot task finishes.
 *
 * @example
 * ```typescript
 * const ask = agentfn({ prompt: "Build the component" });
 * const result = await ask("Create a Button component");
 *
 * // Ask for a structured completion report
 * const report = await agentSendFeedback({
 *   sessionId: result.sessionId!,
 *   prompt: TASK_COMPLETION_PROMPT,
 * });
 * ```
 */
export async function agentSendFeedback(
  opts: AgentFeedbackOptions,
): Promise<AgentFnResult<string>> {
  const provider = opts.provider ?? "claude";

  if (provider !== "claude") {
    throw new Error(
      `agentSendFeedback: resume/feedback is only supported for the "claude" provider, got "${provider}"`,
    );
  }

  if (!opts.sessionId) {
    throw new Error("agentSendFeedback: sessionId is required");
  }

  const result = await claudeSendFeedback({
    sessionId: opts.sessionId,
    prompt: opts.prompt,
    cwd: opts.cwd,
    timeoutMs: opts.timeoutMs,
    cliFlags: opts.cliFlags,
    allowedTools: opts.allowedTools,
  });

  return {
    data: result.data,
    raw: result.raw,
    durationMs: result.durationMs,
    provider: "claude",
    sessionId: opts.sessionId,
  };
}

/* ------------------------------------------------------------------ */
/*  Standard Feedback Prompts                                         */
/* ------------------------------------------------------------------ */

/**
 * Standard follow-up prompt for task completion reports.
 *
 * Asks the agent to produce a structured XML report with:
 * - Task status (completed | partial | failed)
 * - Summary of what was done
 * - Errors encountered
 * - Follow-up action suggestions
 */
export const TASK_COMPLETION_PROMPT = `Now that you have finished the task, provide a structured completion report.

Respond ONLY with the following XML — no other text before or after:

<task-report>
  <status>completed | partial | failed</status>
  <summary>
    A concise summary of what you did (2-4 sentences).
    Include key files created or modified.
  </summary>
  <errors>
    List any errors encountered, or "none" if everything succeeded.
    Include error messages and which step they occurred in.
  </errors>
  <follow-up-actions>
    Suggest 1-3 concrete next steps the user should take.
    Each action should be specific and actionable.
  </follow-up-actions>
</task-report>`;

/**
 * Parse the XML task-report into a structured object.
 */
export interface TaskCompletionReport {
  status: "completed" | "partial" | "failed";
  summary: string;
  errors: string;
  followUpActions: string;
}

/**
 * Parse a task completion report from XML output.
 * Falls back to raw text if XML parsing fails.
 */
export function parseTaskReport(raw: string): TaskCompletionReport {
  const extract = (tag: string): string => {
    const match = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
    return match ? match[1].trim() : "";
  };

  const statusRaw = extract("status");
  const status = (["completed", "partial", "failed"].includes(statusRaw)
    ? statusRaw
    : "partial") as TaskCompletionReport["status"];

  return {
    status,
    summary: extract("summary") || raw.slice(0, 500),
    errors: extract("errors") || "none",
    followUpActions: extract("follow-up-actions") || "none",
  };
}

/**
 * Format a TaskCompletionReport as a markdown document.
 */
export function formatReportAsMarkdown(
  report: TaskCompletionReport,
  meta?: {
    taskId?: string;
    taskTitle?: string;
    epicTitle?: string;
    durationMs?: number;
    timestamp?: string;
  },
): string {
  const lines: string[] = [];

  // Header
  const title = meta?.taskTitle || "Task Completion Report";
  lines.push(`# ${title}`);
  lines.push("");

  // Metadata
  if (meta) {
    lines.push("## Metadata");
    lines.push("");
    if (meta.taskId) lines.push(`- **Task ID:** ${meta.taskId}`);
    if (meta.epicTitle) lines.push(`- **Epic:** ${meta.epicTitle}`);
    if (meta.durationMs) lines.push(`- **Duration:** ${(meta.durationMs / 1000).toFixed(1)}s`);
    lines.push(`- **Timestamp:** ${meta.timestamp || new Date().toISOString()}`);
    lines.push("");
  }

  // Status
  const statusEmoji =
    report.status === "completed" ? "DONE" :
    report.status === "partial" ? "PARTIAL" :
    "FAILED";
  lines.push(`## Status: ${statusEmoji}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(report.summary);
  lines.push("");

  // Errors
  if (report.errors && report.errors !== "none") {
    lines.push("## Errors");
    lines.push("");
    lines.push(report.errors);
    lines.push("");
  }

  // Follow-up Actions
  if (report.followUpActions && report.followUpActions !== "none") {
    lines.push("## Follow-up Actions");
    lines.push("");
    lines.push(report.followUpActions);
    lines.push("");
  }

  return lines.join("\n");
}
