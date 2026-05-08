/**
 * Execution Logger
 *
 * Captures run output to the target directory. Single-target model:
 * every run writes to the same target/{playbook}/. Previous runstate
 * and manifest are rotated to .prev.json for change detection.
 */

import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getTargetDir, getTargetEventsPath } from "./structure.ts";
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
/*  Execution Logger Class                                            */
/* ------------------------------------------------------------------ */

export class ExecutionLogger {
  private projectDir: string;
  private playbookName: string;
  private targetDir: string;
  private executionLogPath: string;
  private eventsPath: string;
  private metadataPath: string;
  private progressPath: string;
  private errorsDir: string;
  private metadata: ExecutionMetadata;

  constructor(
    projectDir: string,
    projectName: string,
    config: ExecutionConfig,
    playbookName?: string,
  ) {
    this.projectDir = projectDir;
    this.playbookName = playbookName ?? "default";
    this.targetDir = getTargetDir(projectDir, this.playbookName);
    this.executionLogPath = join(this.targetDir, "execution.log");
    this.eventsPath = getTargetEventsPath(projectDir, this.playbookName);
    this.metadataPath = join(this.targetDir, "metadata.json");
    this.progressPath = join(this.targetDir, "progress.jsonl");
    this.errorsDir = join(this.targetDir, "errors");

    const environment: ExecutionEnvironment = {
      nodeVersion: process.version,
      platform: process.platform,
    };

    this.metadata = {
      executionId: "latest",
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

  async writeExecutionStart(): Promise<void> {
    await mkdir(this.targetDir, { recursive: true });
    await mkdir(this.errorsDir, { recursive: true });

    await this.saveMetadata();
    await this.writeExecutionEvent("EXECUTION_START", "Execution started", {
      projectName: this.metadata.projectName,
      config: this.metadata.config,
    });

    await this.writeExecutionLog(`
╔════════════════════════════════════════════════════════════╗
║         Converge Run Starting...                           ║
╚════════════════════════════════════════════════════════════╝

Project: ${this.metadata.projectName}
Playbook: ${this.playbookName}
Started: ${this.metadata.startTime}
Target: ${this.targetDir}
`);
  }

  async writeIterationSnapshot(snapshot: ProgressSnapshot): Promise<void> {
    const line = JSON.stringify(snapshot) + "\n";
    await appendFile(this.progressPath, line, "utf-8");

    await this.writeExecutionEvent(
      "PROGRESS",
      `Layer ${snapshot.iteration}: ${snapshot.tasksComplete}/${snapshot.tasksTotal} complete`,
      {
        layer: snapshot.iteration,
        tasksComplete: snapshot.tasksComplete,
        tasksTotal: snapshot.tasksTotal,
      },
    );

    const separator = "─".repeat(60);
    let logEntry = `\n${separator}\n`;
    logEntry += `Layer ${snapshot.iteration} — ${snapshot.tasksComplete}/${snapshot.tasksTotal} complete\n`;

    if (snapshot.currentTask) {
      logEntry += `  Node: ${snapshot.currentTask.id}\n`;
    }

    await this.writeExecutionLog(logEntry);
  }

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

    await this.saveMetadata();

    await this.writeExecutionEvent("EXECUTION_END", `Execution ${status}`, {
      status,
      outcomes,
      duration,
    });

    const statusIcon =
      status === "complete" ? "PASS"
      : status === "cancelled" ? "CANCELLED"
      : status === "stalled" ? "STALLED"
      : "FAILED";

    let summary = `\n${"=".repeat(60)}\n`;
    summary += `${statusIcon} EXECUTION ${status.toUpperCase()}\n`;
    summary += `${"=".repeat(60)}\n`;
    summary += `Duration: ${Math.round(duration / 1000)}s\n`;
    summary += `Tasks Completed: ${outcomes.tasksCompleted}\n`;
    summary += `Tasks Failed: ${outcomes.tasksFailed}\n`;
    summary += `Target: ${this.targetDir}\n`;

    await this.writeExecutionLog(summary);
  }

  /* ---------------------------------------------------------------- */
  /*  Event Writing                                                   */
  /* ---------------------------------------------------------------- */

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

    await this.ensureTargetDir();
    const line = JSON.stringify(event) + "\n";
    await appendFile(this.eventsPath, line, "utf-8");
  }

  async writeExecutionLog(message: string): Promise<void> {
    await this.ensureTargetDir();
    await appendFile(this.executionLogPath, message, "utf-8");
  }

  private async ensureTargetDir(): Promise<void> {
    if (!existsSync(this.targetDir)) {
      await mkdir(this.targetDir, { recursive: true });
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Task-Level Events                                               */
  /* ---------------------------------------------------------------- */

  async logTaskSelected(taskId: string, epicId: string, attempt: number): Promise<void> {
    await this.writeExecutionEvent("NODE_START", `Task: ${taskId}`, {
      taskId, epicId, attempt,
    });

    const separator = "=".repeat(60);
    const message = `
${separator}
Running: ${taskId.split("/").pop()}
  Path: ${taskId}
  Attempt: ${attempt}
${separator}
`;
    await this.writeExecutionLog(message);
  }

  async logTaskAttemptStart(taskId: string, attempt: number): Promise<void> {
    await this.writeExecutionEvent("ATTEMPT_START", `Attempt ${attempt}`, {
      taskId, attempt,
    });
  }

  async logTaskAttemptComplete(
    taskId: string, attempt: number, success: boolean, duration: number,
  ): Promise<void> {
    await this.writeExecutionEvent(
      "ATTEMPT_COMPLETE",
      `Attempt ${attempt} ${success ? "succeeded" : "failed"}`,
      { taskId, attempt, success, duration },
    );

    const icon = success ? "PASS" : "FAIL";
    await this.writeExecutionLog(
      `\n${icon} in ${Math.round(duration / 1000)}s\n`,
    );
  }

  async logUpstreamTriggered(taskId: string, upstreamTask: string): Promise<void> {
    await this.writeExecutionEvent("UPSTREAM", `Upstream: ${upstreamTask}`, {
      taskId, upstreamTask,
    });
  }

  async logGapDetected(taskId: string, gapType: string, description: string): Promise<void> {
    await this.writeExecutionEvent("CHECK_FAIL", description, {
      taskId, gapType,
    });
  }

  async logStrategyAttempted(taskId: string, strategy: string): Promise<void> {
    await this.writeExecutionEvent("RETRY", `Strategy: ${strategy}`, {
      taskId, strategy,
    });
  }

  async logConvergence(taskId: string, achieved: boolean): Promise<void> {
    const eventType = achieved ? "NODE_COMPLETE" : "NODE_FAIL";
    await this.writeExecutionEvent(eventType, `Task ${achieved ? "complete" : "failed"}`, {
      taskId,
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Tool/Command Tracking                                           */
  /* ---------------------------------------------------------------- */

  async logToolUse(taskId: string, toolName: string, params: Record<string, any>): Promise<void> {
    await this.writeExecutionEvent("TOOL_USE", `Tool: ${toolName}`, {
      taskId, toolName, params,
    });
  }

  async logAiActivity(
    taskId: string, activityType: string, details: Record<string, any>,
  ): Promise<void> {
    await this.writeExecutionEvent("AI_ACTIVITY", `AI: ${activityType}`, {
      taskId, activityType, ...details,
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                         */
  /* ---------------------------------------------------------------- */

  private async saveMetadata(): Promise<void> {
    await this.ensureTargetDir();
    const json = JSON.stringify(this.metadata, null, 2);
    await writeFile(this.metadataPath, json, "utf-8");
  }

  getTargetDir(): string {
    return this.targetDir;
  }

  /**
   * @deprecated Use getTargetDir() instead.
   */
  getExecutionDir(): string {
    return this.targetDir;
  }

  /**
   * @deprecated Single-target model — always returns "latest".
   */
  getExecutionId(): string {
    return "latest";
  }
}

/**
 * @deprecated Single-target model — no execution ID needed.
 * Always returns "latest".
 */
export function generateExecutionId(): string {
  return "latest";
}
