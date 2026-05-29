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
  private executionId: string = "latest";

  constructor(
    projectDir: string,
    executionIdOrProjectName: string,
    projectNameOrConfig: string | ExecutionConfig,
    configOrPlaybookName?: ExecutionConfig | string,
  ) {
    // Support two call shapes:
    //  - (projectDir, projectName, config, playbookName?)  ← legacy
    //  - (projectDir, executionId, projectName, config)    ← smoke-test shape
    let projectName: string;
    let config: ExecutionConfig;
    let playbookName: string | undefined;
    let executionId = "latest";
    if (
      typeof projectNameOrConfig === "string" &&
      configOrPlaybookName !== undefined &&
      typeof configOrPlaybookName === "object"
    ) {
      executionId = executionIdOrProjectName;
      projectName = projectNameOrConfig;
      config = configOrPlaybookName as ExecutionConfig;
    } else {
      projectName = executionIdOrProjectName;
      config = projectNameOrConfig as ExecutionConfig;
      playbookName =
        typeof configOrPlaybookName === "string"
          ? configOrPlaybookName
          : undefined;
    }
    this.projectDir = projectDir;
    this.playbookName = playbookName ?? "default";
    this.targetDir = getTargetDir(projectDir, this.playbookName);
    this.executionLogPath = join(this.targetDir, "execution.log");
    this.eventsPath = getTargetEventsPath(projectDir, this.playbookName);
    this.metadataPath = join(this.targetDir, "metadata.json");
    this.progressPath = join(this.targetDir, "progress.jsonl");
    this.errorsDir = join(this.targetDir, "errors");
    this.executionId = executionId;

    const environment: ExecutionEnvironment = {
      nodeVersion: process.version,
      platform: process.platform,
    };

    this.metadata = {
      executionId: this.executionId,
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
║         Autonomous AI Orchestrator Starting...             ║
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

    // Emit both event names so legacy consumers (PROGRESS) and the new
    // smoke-test contract (ITERATION_START) both see the event.
    const message = `Iteration ${snapshot.iteration}: ${snapshot.tasksComplete}/${snapshot.tasksTotal} complete`;
    const metadata = {
      iteration: snapshot.iteration,
      tasksComplete: snapshot.tasksComplete,
      tasksTotal: snapshot.tasksTotal,
    };
    await this.writeExecutionEvent("ITERATION_START", message, metadata);
    await this.writeExecutionEvent("PROGRESS", message, metadata);

    const separator = "─".repeat(60);
    let logEntry = `\n${separator}\n`;
    logEntry += `Iteration ${snapshot.iteration} — ${snapshot.tasksComplete}/${snapshot.tasksTotal} complete\n`;

    if (snapshot.currentTask) {
      logEntry += `  Task: ${snapshot.currentTask.id}\n`;
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
    if (typeof outcomes.totalIterations === "number") {
      summary += `Iterations: ${outcomes.totalIterations}\n`;
    }
    const total = outcomes.tasksTotal;
    const cached = outcomes.tasksCached;
    const executed = outcomes.tasksExecuted;
    if (typeof total === "number") {
      summary += `Tasks Completed: ${outcomes.tasksCompleted} / ${total}`;
      if (typeof executed === "number" || typeof cached === "number") {
        const parts: string[] = [];
        if (typeof executed === "number") parts.push(`${executed} executed`);
        if (typeof cached === "number" && cached > 0) parts.push(`${cached} cached`);
        if (parts.length > 0) summary += ` (${parts.join(", ")})`;
      }
      summary += `\n`;
    } else {
      summary += `Tasks Completed: ${outcomes.tasksCompleted}\n`;
    }
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
    // Emit both names so legacy consumers (NODE_START) and the smoke-test
    // contract (TASK_SELECTED) both see the event.
    const meta = { taskId, epicId, attempt };
    await this.writeExecutionEvent("TASK_SELECTED", `Task: ${taskId}`, meta);
    await this.writeExecutionEvent("NODE_START", `Task: ${taskId}`, meta);

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
    // Emit both names so legacy consumers (NODE_COMPLETE/NODE_FAIL) and the
    // smoke-test contract (CONVERGENCE_ACHIEVED/CONVERGENCE_STALLED) both see
    // the event.
    const newEventType = achieved ? "CONVERGENCE_ACHIEVED" : "CONVERGENCE_STALLED";
    const legacyEventType = achieved ? "NODE_COMPLETE" : "NODE_FAIL";
    const message = `Task ${achieved ? "converged" : "stalled"}`;
    const meta = { taskId };
    await this.writeExecutionEvent(newEventType, message, meta);
    await this.writeExecutionEvent(legacyEventType, message, meta);
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
