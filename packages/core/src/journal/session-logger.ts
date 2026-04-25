/**
 * Session Logger
 *
 * Captures complete orchestration runs in a structured session directory.
 * Provides debugging artifacts, execution timeline, and performance metrics.
 */

import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getSessionsDir } from "./structure.ts";
import type {
  SessionEvent,
  SessionEventType,
  SessionMetadata,
  ProgressSnapshot,
  SessionConfig,
  SessionOutcomes,
  SessionEnvironment,
  SessionStatus,
} from "./session-types.ts";

/* ------------------------------------------------------------------ */
/*  Session ID Generation                                             */
/* ------------------------------------------------------------------ */

/**
 * Generate unique session ID
 * Format: {timestamp}-{shortHash}
 * Example: 2026-04-03T15-17-00-abc123
 */
export function generateSessionId(): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\./g, "-")
    .slice(0, 19); // 2026-04-03T15-17-00

  // Generate short hash from timestamp + random
  const hashSource = `${now.getTime()}-${Math.random()}`;
  let hash = 0;
  for (let i = 0; i < hashSource.length; i++) {
    const char = hashSource.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const shortHash = Math.abs(hash).toString(36).slice(0, 6);

  return `${timestamp}-${shortHash}`;
}

/* ------------------------------------------------------------------ */
/*  Session Logger Class                                              */
/* ------------------------------------------------------------------ */

export class SessionLogger {
  private projectDir: string;
  private sessionId: string;
  private sessionDir: string;
  private sessionLogPath: string;
  private eventsPath: string;
  private metadataPath: string;
  private progressPath: string;
  private errorsDir: string;
  private metadata: SessionMetadata;

  constructor(
    projectDir: string,
    sessionId: string,
    projectName: string,
    config: SessionConfig,
  ) {
    this.projectDir = projectDir;
    this.sessionId = sessionId;
    this.sessionDir = join(getSessionsDir(projectDir), sessionId);
    this.sessionLogPath = join(this.sessionDir, "session.log");
    this.eventsPath = join(this.sessionDir, "events.jsonl");
    this.metadataPath = join(this.sessionDir, "metadata.json");
    this.progressPath = join(this.sessionDir, "progress.jsonl");
    this.errorsDir = join(this.sessionDir, "errors");

    // Initialize metadata
    const environment: SessionEnvironment = {
      nodeVersion: process.version,
      platform: process.platform,
    };

    this.metadata = {
      sessionId,
      projectName,
      startTime: new Date().toISOString(),
      status: "running",
      config,
      environment,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Session Lifecycle                                               */
  /* ---------------------------------------------------------------- */

  /**
   * Initialize session directory and write initial metadata
   */
  async writeSessionStart(): Promise<void> {
    // Create session directory structure
    await mkdir(this.sessionDir, { recursive: true });
    await mkdir(this.errorsDir, { recursive: true });

    // Write initial metadata
    await this.saveMetadata();

    // Write session start event
    await this.writeSessionEvent("SESSION_START", "Session started", {
      projectName: this.metadata.projectName,
      config: this.metadata.config,
    });

    // Write to session log
    await this.writeSessionLog(`
╔════════════════════════════════════════════════════════════╗
║         🤖 Autonomous AI Orchestrator Starting...         ║
╚════════════════════════════════════════════════════════════╝

Session ID: ${this.sessionId}
Project: ${this.metadata.projectName}
Max Iterations: ${this.metadata.config.maxIterations}
Started: ${this.metadata.startTime}

🤖 Starting autonomous run (snap → execute → snap)
`);
  }

  /**
   * Write iteration snapshot to progress log
   */
  async writeIterationSnapshot(snapshot: ProgressSnapshot): Promise<void> {
    // Write to progress.jsonl
    const line = JSON.stringify(snapshot) + "\n";
    await appendFile(this.progressPath, line, "utf-8");

    // Write iteration event
    await this.writeSessionEvent(
      "ITERATION_START",
      `Iteration ${snapshot.iteration} started`,
      {
        iteration: snapshot.iteration,
        tasksComplete: snapshot.tasksComplete,
        tasksTotal: snapshot.tasksTotal,
      },
    );

    // Write to human-readable log
    const separator = "─".repeat(60);
    let logEntry = `\n${separator}\n`;
    logEntry += `── Iteration ${snapshot.iteration} ${separator.slice(0, separator.length - 15)}\n`;
    logEntry += `📍 Progress: ${snapshot.tasksComplete}/${snapshot.tasksTotal} tasks complete\n`;

    if (snapshot.currentTask) {
      logEntry += `▶  Next task: ${snapshot.currentTask.id}\n`;
      logEntry += `   Epic: ${snapshot.currentTask.epic}  Task: ${snapshot.currentTask.id.split("/").pop()}\n`;
      logEntry += `   Attempt #${snapshot.currentTask.attempt}\n`;
    }

    if (snapshot.gaps.length > 0) {
      logEntry += `\nGaps detected:\n`;
      for (const gap of snapshot.gaps) {
        logEntry += `  - [${gap.type}] ${gap.task}: ${gap.count} gap(s)\n`;
      }
    }

    await this.writeSessionLog(logEntry);
  }

  /**
   * Finalize session with outcomes
   */
  async writeSessionEnd(
    outcomes: SessionOutcomes,
    status: SessionStatus = "complete",
  ): Promise<void> {
    const endTime = new Date().toISOString();
    const startTime = new Date(this.metadata.startTime).getTime();
    const duration = Date.now() - startTime;

    this.metadata.endTime = endTime;
    this.metadata.duration = duration;
    this.metadata.status = status;
    this.metadata.outcomes = outcomes;

    // Save final metadata
    await this.saveMetadata();

    // Write session end event
    await this.writeSessionEvent("SESSION_END", `Session ${status}`, {
      status,
      outcomes,
      duration,
    });

    // Write final summary to log
    const statusIcon =
      status === "complete"
        ? "✅"
        : status === "cancelled"
          ? "🛑"
          : status === "stalled"
            ? "⚠️"
            : "❌";
    let summary = `\n${"=".repeat(60)}\n`;
    summary += `${statusIcon} SESSION ${status.toUpperCase()}\n`;
    summary += `${"=".repeat(60)}\n`;
    summary += `Session ID: ${this.sessionId}\n`;
    summary += `Duration: ${Math.round(duration / 1000)}s\n`;
    summary += `Iterations: ${outcomes.totalIterations}\n`;
    summary += `Tasks Completed: ${outcomes.tasksCompleted}\n`;
    summary += `Tasks Failed: ${outcomes.tasksFailed}\n`;
    summary += `Gaps Resolved: ${outcomes.gapsResolved}\n`;
    summary += `Convergence: ${outcomes.convergenceAchieved ? "Yes" : "No"}\n`;
    summary += `\nSession artifacts: ${this.sessionDir}\n`;

    await this.writeSessionLog(summary);
  }

  /* ---------------------------------------------------------------- */
  /*  Event Writing                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Write structured event to events.jsonl
   */
  async writeSessionEvent(
    eventType: SessionEventType,
    message?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const event: SessionEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      message,
      metadata,
    };

    await this.ensureSessionDir();
    const line = JSON.stringify(event) + "\n";
    await appendFile(this.eventsPath, line, "utf-8");
  }

  /**
   * Append to human-readable session log
   */
  async writeSessionLog(message: string): Promise<void> {
    await this.ensureSessionDir();
    await appendFile(this.sessionLogPath, message, "utf-8");
  }

  /**
   * Ensure session directory exists — `writeSessionStart()` may not have been
   * called yet (or was skipped because another logger owns the lifecycle).
   */
  private async ensureSessionDir(): Promise<void> {
    if (!existsSync(this.sessionDir)) {
      await mkdir(this.sessionDir, { recursive: true });
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Task-Level Events                                               */
  /* ---------------------------------------------------------------- */

  /**
   * Log task selection
   */
  async logTaskSelected(
    taskId: string,
    epicId: string,
    attempt: number,
  ): Promise<void> {
    await this.writeSessionEvent("TASK_SELECTED", `Task selected: ${taskId}`, {
      taskId,
      epicId,
      attempt,
    });

    const separator = "=".repeat(60);
    const message = `
${separator}
Running: ${taskId.split("/").pop()}
  Path: ${taskId}
  Epic: ${epicId}
  Attempt: ${attempt}
${separator}
`;
    await this.writeSessionLog(message);
  }

  /**
   * Log task attempt start
   */
  async logTaskAttemptStart(taskId: string, attempt: number): Promise<void> {
    await this.writeSessionEvent(
      "TASK_ATTEMPT_START",
      `Attempt ${attempt} started`,
      {
        taskId,
        attempt,
      },
    );

    await this.writeSessionLog(`\n── Running ${"─".repeat(48)}\n`);
  }

  /**
   * Log task attempt complete
   */
  async logTaskAttemptComplete(
    taskId: string,
    attempt: number,
    success: boolean,
    duration: number,
  ): Promise<void> {
    await this.writeSessionEvent(
      "TASK_ATTEMPT_COMPLETE",
      `Attempt ${attempt} ${success ? "succeeded" : "failed"}`,
      {
        taskId,
        attempt,
        success,
        duration,
      },
    );

    const icon = success ? "✅" : "❌";
    await this.writeSessionLog(
      `\n${icon} ${success ? "Done" : "Failed"} in ${Math.round(duration / 1000)}s\n`,
    );
  }

  /**
   * Log upstream trigger
   */
  async logUpstreamTriggered(
    taskId: string,
    upstreamTask: string,
  ): Promise<void> {
    await this.writeSessionEvent(
      "UPSTREAM_TRIGGERED",
      `Upstream triggered: ${upstreamTask}`,
      {
        taskId,
        upstreamTask,
      },
    );

    const message = `\n🔗 Upstream: ${upstreamTask}\n   → Running upstream task\n`;
    await this.writeSessionLog(message);
  }

  /**
   * Log gap detection
   */
  async logGapDetected(
    taskId: string,
    gapType: string,
    description: string,
  ): Promise<void> {
    await this.writeSessionEvent("GAP_DETECTED", description, {
      taskId,
      gapType,
    });

    await this.writeSessionLog(
      `   Gap detected: [${gapType}] ${description}\n`,
    );
  }

  /**
   * Log resolution strategy
   */
  async logStrategyAttempted(taskId: string, strategy: string): Promise<void> {
    await this.writeSessionEvent(
      "STRATEGY_ATTEMPTED",
      `Strategy: ${strategy}`,
      {
        taskId,
        strategy,
      },
    );

    await this.writeSessionLog(`   [→] Trying strategy: ${strategy}\n`);
  }

  /**
   * Log convergence
   */
  async logConvergence(taskId: string, achieved: boolean): Promise<void> {
    const eventType = achieved ? "CONVERGENCE_ACHIEVED" : "CONVERGENCE_STALLED";
    await this.writeSessionEvent(
      eventType,
      `Task ${achieved ? "converged" : "stalled"}`,
      {
        taskId,
      },
    );

    if (achieved) {
      await this.writeSessionLog(`   ✅ Task converged\n`);
    } else {
      await this.writeSessionLog(`   ⚠️  Stalled — no progress. Giving up.\n`);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Tool/Command Tracking                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Log tool/command execution from task-level events
   */
  async logToolUse(
    taskId: string,
    toolName: string,
    params: Record<string, any>,
  ): Promise<void> {
    await this.writeSessionEvent("TASK_ATTEMPT_START", `Tool: ${toolName}`, {
      taskId,
      toolName,
      params,
    });
  }

  /**
   * Log AI activity from task-level events
   */
  async logAiActivity(
    taskId: string,
    activityType: string,
    details: Record<string, any>,
  ): Promise<void> {
    await this.writeSessionEvent("TASK_ATTEMPT_START", `AI: ${activityType}`, {
      taskId,
      activityType,
      ...details,
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                         */
  /* ---------------------------------------------------------------- */

  /**
   * Save metadata to file. Ensures the session directory exists — callers
   * may update metadata before `writeSessionStart()` has been invoked (or
   * after it was skipped because another logger owns the lifecycle).
   */
  private async saveMetadata(): Promise<void> {
    await this.ensureSessionDir();
    const json = JSON.stringify(this.metadata, null, 2);
    await writeFile(this.metadataPath, json, "utf-8");
  }

  /**
   * Get session directory path
   */
  getSessionDir(): string {
    return this.sessionDir;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}
