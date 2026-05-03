/**
 * Session Event Bridge
 *
 * Bridges task-level events from TaskEventWriter to session-level SessionLogger.
 * This allows comprehensive session logging by aggregating all task execution details.
 *
 * Architecture:
 * - Task-level events → events.jsonl (in attempt directory)
 * - Session Event Bridge → reads task events, aggregates to session
 * - Session-level events → sessions/{sessionId}/events.jsonl
 *
 * Benefits:
 * - Complete session audit trail
 * - Cross-task analysis and debugging
 * - Performance profiling across entire session
 * - Gap detection patterns across tasks
 */

import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import type { ExecutionLogger } from "./execution-logger.ts";
import type { TaskEvent } from "./event-writer.ts";

export class ExecutionEventBridge {
  private watchers: Array<() => void> = [];
  private processedLines = new Map<string, number>(); // filepath -> last processed line number

  constructor(private executionLogger: ExecutionLogger) {}

  /**
   * Start monitoring a task's event file
   */
  async monitorTaskEvents(
    taskId: string,
    eventsFilePath: string,
  ): Promise<void> {
    // Read initial events from file
    await this.processEventsFile(taskId, eventsFilePath);

    // Watch for new events (file may be written in real-time)
    const watcher = watch(eventsFilePath, async (eventType) => {
      if (eventType === "change") {
        await this.processEventsFile(taskId, eventsFilePath);
      }
    });
    watcher.on("error", (err: any) => {
      if (err.code !== "EPERM" && err.code !== "ENOENT") throw err;
    });

    this.watchers.push(() => watcher.close());
  }

  /**
   * Process events from JSONL file and bridge to session logger
   */
  private async processEventsFile(
    taskId: string,
    filePath: string,
  ): Promise<void> {
    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content
        .trim()
        .split("\n")
        .filter((l) => l.trim());

      const lastProcessed = this.processedLines.get(filePath) || 0;
      const newLines = lines.slice(lastProcessed);

      for (const line of newLines) {
        try {
          const event: TaskEvent = JSON.parse(line);
          await this.bridgeEvent(taskId, event);
        } catch (err) {
          // Skip malformed lines
          console.warn(`[SessionBridge] Failed to parse event: ${err}`);
        }
      }

      this.processedLines.set(filePath, lines.length);
    } catch (err: any) {
      // File may not exist yet or be locked
      if (err.code !== "ENOENT") {
        console.warn(
          `[SessionBridge] Error reading events file: ${err.message}`,
        );
      }
    }
  }

  /**
   * Bridge a single task event to session logger
   */
  private async bridgeEvent(taskId: string, event: TaskEvent): Promise<void> {
    const eventType = event.type;

    switch (eventType) {
      case "gap_detected":
        await this.executionLogger.logGapDetected(
          taskId,
          (event as any).gapType || "unknown",
          (event as any).description || "",
        );
        break;

      case "strategy_applied":
        await this.executionLogger.logStrategyAttempted(
          taskId,
          (event as any).strategy || "unknown",
        );
        break;

      case "gap_resolved":
        // Log to session with metadata
        await this.executionLogger.writeExecutionEvent(
          "GAP_RESOLVED",
          `Gap resolved in ${taskId}`,
          {
            taskId,
            gapId: (event as any).gapId,
            strategy: (event as any).strategy,
            duration: (event as any).duration,
          },
        );
        break;

      case "tool_use_start":
        await this.executionLogger.logToolUse(
          taskId,
          (event as any).toolName || "unknown",
          (event as any).params || {},
        );
        break;

      case "ai_reasoning":
      case "ai_planning":
      case "ai_thinking":
        await this.executionLogger.logAiActivity(
          taskId,
          eventType.replace("ai_", ""),
          {
            message: (event as any).message,
            metadata: (event as any).metadata,
          },
        );
        break;

      case "task_complete":
      case "task_failed":
        // These are already logged by task-runner.ts via logTaskAttemptComplete
        // Skip to avoid duplicates
        break;

      default:
        // Bridge all other events generically
        await this.executionLogger.writeExecutionEvent(
          "TASK_ATTEMPT_START", // Generic event type for task activity
          `${eventType}: ${(event as any).message || ""}`,
          {
            taskId,
            eventType,
            ...event,
          },
        );
    }
  }

  /**
   * Stop monitoring all task events
   */
  stop(): void {
    for (const cleanup of this.watchers) {
      cleanup();
    }
    this.watchers = [];
    this.processedLines.clear();
  }
}
