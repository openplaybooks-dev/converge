/**
 * Execution Logger
 *
 * Captures complete orchestration runs in a structured execution directory.
 * Provides debugging artifacts, execution timeline, and performance metrics.
 */

import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getExecutionsDir } from "./structure.ts";
import type {
  ExecutionEvent,
  ExecutionEventType,
  ExecutionMetadata,
  ProgressSnapshot,
  ExecutionConfig,
  ExecutionOutcomes,
  ExecutionEnvironment,
  ExecutionStatus,
} from "./execution-types.ts";

/* ------------------------------------------------------------------ */
/*  Execution ID Generation                                           */
/* ------------------------------------------------------------------ */

/**
 * Generate unique execution ID
 * Format: {timestamp}-{shortHash}
 * Example: 2026-04-03T15-17-00-abc123
 */
export function generateExecutionId(): string {
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
  const shortHash = Math.abs(hash).toString(36).slice(0, 6).padStart(6, "0");

  return `${timestamp}-${shortHash}`;
}

/* ------------------------------------------------------------------ */
/*  Execution Logger Class                                            */
/* ------------------------------------------------------------------ */

export class ExecutionLogger {
  private projectDir: string;
  private executionId: string;
  private executionDir: string;
  private executionLogPath: string;
  private eventsPath: string;
  private metadataPath: string;
  private progressPath: string;
  private errorsDir: string;
  private metadata: ExecutionMetadata;

  constructor(
    projectDir: string,
    executionId: string,
    projectName: string,
    config: ExecutionConfig,
  ) {
    this.projectDir = projectDir;
    this.executionId = executionId;
    this.executionDir = join(getExecutionsDir(projectDir), executionId);
    this.executionLogPath = join(this.executionDir, "execution.log");
    this.eventsPath = join(this.executionDir, "events.jsonl");
    this.metadataPath = join(this.executionDir, "metadata.json");
    this.progressPath = join(this.executionDir, "progress.jsonl");
    this.errorsDir = join(this.executionDir, "errors");

    // Initialize metadata
    const environment: ExecutionEnvironment = {
      nodeVersion: process.version,
      platform: process.platform,
    };

    this.metadata = {
      executionId,
      projectName,
      startTime: new Date().toISOString(),
      status: "running",
      config,
      environment,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Execution Lifecycle                                             */
  /* ---------------------------------------------------------------- */

  /**
   * Initialize execution directory and write initial metadata
   */
  async writeExecutionStart(): Promise<void> {
    // Create execution directory structure
    await mkdir(this.executionDir, { recursive: true });
    await mkdir(this.errorsDir, { recursive: true });

    // Write initial metadata
    await this.saveMetadata();

    // Write execution start event
    await this.writeExecutionEvent("EXECUTION_START", "Execution started", {
      projectName: this.metadata.projectName,
      config: this.metadata.config,
    });

    // Write to execution log
    await this.writeExecutionLog(`
╔════════════════════════════════════════════════════════════╗
║         🤖 Autonomous AI Orchestrator Starting...         ║
╚════════════════════════════════════════════════════════════╝

Execution ID: ${this.executionId}
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
    await this.writeExecutionEvent(
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

    await this.writeExecutionLog(logEntry);
  }

  /**
   * Finalize execution with outcomes
   */
  async writeExecutionEnd(
    outcomes: ExecutionOutcomes,
    status: ExecutionStatus = "complete",
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

    // Write execution end event
    await this.writeExecutionEvent("EXECUTION_END", `Execution ${status}`, {
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
    summary += `${statusIcon} EXECUTION ${status.toUpperCase()}\n`;
    summary += `${"=".repeat(60)}\n`;
    summary += `Execution ID: ${this.executionId}\n`;
    summary += `Duration: ${Math.round(duration / 1000)}s\n`;
    summary += `Iterations: ${outcomes.totalIterations}\n`;
    summary += `Tasks Completed: ${outcomes.tasksCompleted}\n`;
    summary += `Tasks Failed: ${outcomes.tasksFailed}\n`;
    summary += `Gaps Resolved: ${outcomes.gapsResolved}\n`;
    summary += `Convergence: ${outcomes.convergenceAchieved ? "Yes" : "No"}\n`;
    summary += `\nExecution artifacts: ${this.executionDir}\n`;

    await this.writeExecutionLog(summary);
  }

  /* ---------------------------------------------------------------- */
  /*  Event Writing                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Write structured event to events.jsonl
   */
  async writeExecutionEvent(
    eventType: ExecutionEventType,
    message?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const event: ExecutionEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      message,
      metadata,
    };

    await this.ensureExecutionDir();
    const line = JSON.stringify(event) + "\n";
    await appendFile(this.eventsPath, line, "utf-8");
  }

  /**
   * Append to human-readable execution log
   */
  async writeExecutionLog(message: string): Promise<void> {
    await this.ensureExecutionDir();
    await appendFile(this.executionLogPath, message, "utf-8");
  }

  /**
   * Ensure execution directory exists — `writeExecutionStart()` may not have been
   * called yet (or was skipped because another logger owns the lifecycle).
   */
  private async ensureExecutionDir(): Promise<void> {
    if (!existsSync(this.executionDir)) {
      await mkdir(this.executionDir, { recursive: true });
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
    await this.writeExecutionEvent("TASK_SELECTED", `Task selected: ${taskId}`, {
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
    await this.writeExecutionLog(message);
  }

  /**
   * Log task attempt start
   */
  async logTaskAttemptStart(taskId: string, attempt: number): Promise<void> {
    await this.writeExecutionEvent(
      "TASK_ATTEMPT_START",
      `Attempt ${attempt} started`,
      {
        taskId,
        attempt,
      },
    );

    await this.writeExecutionLog(`\n── Running ${"─".repeat(48)}\n`);
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
    await this.writeExecutionEvent(
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
    await this.writeExecutionLog(
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
    await this.writeExecutionEvent(
      "UPSTREAM_TRIGGERED",
      `Upstream triggered: ${upstreamTask}`,
      {
        taskId,
        upstreamTask,
      },
    );

    const message = `\n🔗 Upstream: ${upstreamTask}\n   → Running upstream task\n`;
    await this.writeExecutionLog(message);
  }

  /**
   * Log gap detection
   */
  async logGapDetected(
    taskId: string,
    gapType: string,
    description: string,
  ): Promise<void> {
    await this.writeExecutionEvent("GAP_DETECTED", description, {
      taskId,
      gapType,
    });

    await this.writeExecutionLog(
      `   Gap detected: [${gapType}] ${description}\n`,
    );
  }

  /**
   * Log resolution strategy
   */
  async logStrategyAttempted(taskId: string, strategy: string): Promise<void> {
    await this.writeExecutionEvent(
      "STRATEGY_ATTEMPTED",
      `Strategy: ${strategy}`,
      {
        taskId,
        strategy,
      },
    );

    await this.writeExecutionLog(`   [→] Trying strategy: ${strategy}\n`);
  }

  /**
   * Log convergence
   */
  async logConvergence(taskId: string, achieved: boolean): Promise<void> {
    const eventType = achieved ? "CONVERGENCE_ACHIEVED" : "CONVERGENCE_STALLED";
    await this.writeExecutionEvent(
      eventType,
      `Task ${achieved ? "converged" : "stalled"}`,
      {
        taskId,
      },
    );

    if (achieved) {
      await this.writeExecutionLog(`   ✅ Task converged\n`);
    } else {
      await this.writeExecutionLog(`   ⚠️  Stalled — no progress. Giving up.\n`);
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
    await this.writeExecutionEvent("TASK_ATTEMPT_START", `Tool: ${toolName}`, {
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
    await this.writeExecutionEvent("TASK_ATTEMPT_START", `AI: ${activityType}`, {
      taskId,
      activityType,
      ...details,
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                         */
  /* ---------------------------------------------------------------- */

  /**
   * Save metadata to file. Ensures the execution directory exists — callers
   * may update metadata before `writeExecutionStart()` has been invoked (or
   * after it was skipped because another logger owns the lifecycle).
   */
  private async saveMetadata(): Promise<void> {
    await this.ensureExecutionDir();
    const json = JSON.stringify(this.metadata, null, 2);
    await writeFile(this.metadataPath, json, "utf-8");
  }

  /**
   * Get execution directory path
   */
  getExecutionDir(): string {
    return this.executionDir;
  }

  /**
   * Get execution ID
   */
  getExecutionId(): string {
    return this.executionId;
  }
}
