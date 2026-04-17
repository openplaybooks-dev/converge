/**
 * Event Writer - File-First Logging
 *
 * Core principle: ALL events written to JSONL file FIRST.
 * Console output is derived by reading/tailing this file.
 */

import { createWriteStream, WriteStream, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Task event types - comprehensive list of all trackable events
 */
export enum TaskEventType {
  // Lifecycle
  TASK_START = 'task_start',
  TASK_COMPLETE = 'task_complete',
  TASK_FAILED = 'task_failed',
  RETRY_START = 'retry_start',

  // Tool usage
  TOOL_USE_START = 'tool_use_start',
  TOOL_USE_COMPLETE = 'tool_use_complete',
  TOOL_USE_ERROR = 'tool_use_error',

  // File operations
  FILE_CREATED = 'file_created',
  FILE_MODIFIED = 'file_modified',
  FILE_DELETED = 'file_deleted',
  FILE_VERIFIED = 'file_verified',

  // Validation
  VALIDATION_START = 'validation_start',
  VALIDATION_RESULT = 'validation_result',
  CHECK_PASSED = 'check_passed',
  CHECK_FAILED = 'check_failed',

  // AI
  AI_REASONING = 'ai_reasoning',
  AI_PLANNING = 'ai_planning',
  AI_THINKING = 'ai_thinking',
  AI_ERROR = 'ai_error',

  // Gap resolution
  GAP_DETECTED = 'gap_detected',
  GAP_RESOLVED = 'gap_resolved',
  STRATEGY_APPLIED = 'strategy_applied',
  STRATEGY_FAILED = 'strategy_failed',

  // Internal (debug only)
  INTERNAL_STATE = 'internal_state',
  STREAM_CHUNK = 'stream_chunk',
}

/**
 * Base event structure - all events extend this
 */
export interface TaskEvent {
  /** ISO 8601 timestamp - added automatically if not provided */
  timestamp?: string;

  /** Event type */
  type: TaskEventType;

  /** Event priority for filtering */
  level?: 'debug' | 'info' | 'warning' | 'error' | 'critical';

  /** Event-specific data */
  [key: string]: any;
}

/**
 * Specific event interfaces for type safety
 */
export interface TaskStartEvent extends TaskEvent {
  type: TaskEventType.TASK_START;
  taskId: string;
  taskName: string;
  attempt: number;
  inputs: string[];
  outputs: string[];
}

export interface ToolUseStartEvent extends TaskEvent {
  type: TaskEventType.TOOL_USE_START;
  toolName: string;
  params: Record<string, any>;
}

export interface ToolUseCompleteEvent extends TaskEvent {
  type: TaskEventType.TOOL_USE_COMPLETE;
  toolName: string;
  success: boolean;
  duration?: number;
  result?: Record<string, any>;
  error?: string;
}

export interface FileCreatedEvent extends TaskEvent {
  type: TaskEventType.FILE_CREATED;
  path: string;
  size: number;
  lines?: number;
  verified: boolean;
}

export interface ValidationResultEvent extends TaskEvent {
  type: TaskEventType.VALIDATION_RESULT;
  output: string;
  exists: boolean;
  size?: number;
  checks: Array<{ id: string; passed: boolean; error?: string }>;
}

export interface AIReasoningEvent extends TaskEvent {
  type: TaskEventType.AI_REASONING;
  text: string;
  context?: Record<string, any>;
}

/**
 * Event Writer - writes all events to JSONL file
 *
 * This is the ONLY component that writes to the event log.
 * All other components read from it.
 */
export class TaskEventWriter {
  private eventsFile: string;
  private writeStream: WriteStream | null = null;
  private eventBuffer: TaskEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private closed = false;

  constructor(eventsFilePath: string) {
    this.eventsFile = eventsFilePath;

    // Ensure directory exists
    mkdirSync(dirname(this.eventsFile), { recursive: true });

    // Open append stream
    this.writeStream = createWriteStream(this.eventsFile, { flags: 'a' });

    // Handle stream errors
    this.writeStream.on('error', (err) => {
      console.error(`❌ Event writer error: ${err.message}`);
    });
  }

  /**
   * Write event to journal file (buffered for performance)
   */
  write(event: TaskEvent): void {
    if (this.closed) {
      throw new Error('Cannot write to closed event writer');
    }

    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    // Add default level if not present
    if (!event.level) {
      event.level = this.inferLevel(event.type);
    }

    // Add to buffer
    this.eventBuffer.push(event);

    // Flush immediately for critical events, otherwise buffer
    const isCritical = event.level === 'critical' || event.level === 'error';
    if (isCritical) {
      this.flush();
      return;
    }

    // Flush after 100ms of inactivity or when buffer reaches 10 events
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => this.flush(), 100);

    if (this.eventBuffer.length >= 10) {
      this.flush();
    }
  }

  /**
   * Flush buffered events to disk
   */
  private flush(): void {
    if (this.eventBuffer.length === 0 || !this.writeStream) return;

    for (const event of this.eventBuffer) {
      const line = JSON.stringify(event) + '\n';
      this.writeStream.write(line);
    }

    this.eventBuffer = [];
  }

  /**
   * Close the event writer (flushes buffer and closes stream)
   */
  close(): void {
    if (this.closed) return;

    // Clear flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // Flush remaining events
    this.flush();

    // Close stream
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }

    this.closed = true;
  }

  /**
   * Infer event level from type
   */
  private inferLevel(type: TaskEventType): TaskEvent['level'] {
    switch (type) {
      case TaskEventType.TASK_FAILED:
      case TaskEventType.TOOL_USE_ERROR:
      case TaskEventType.AI_ERROR:
        return 'error';

      case TaskEventType.VALIDATION_RESULT:
      case TaskEventType.CHECK_FAILED:
      case TaskEventType.STRATEGY_FAILED:
        return 'warning';

      case TaskEventType.TASK_START:
      case TaskEventType.TASK_COMPLETE:
      case TaskEventType.GAP_RESOLVED:
        return 'critical';

      case TaskEventType.INTERNAL_STATE:
      case TaskEventType.STREAM_CHUNK:
        return 'debug';

      default:
        return 'info';
    }
  }

  /**
   * Convenience methods for common events
   */

  taskStart(data: Omit<TaskStartEvent, 'type' | 'timestamp' | 'level'>): void {
    this.write({
      type: TaskEventType.TASK_START,
      ...data,
    });
  }

  taskComplete(taskId: string, duration: number, outputs: string[]): void {
    this.write({
      type: TaskEventType.TASK_COMPLETE,
      taskId,
      duration,
      outputs,
      success: true,
    });
  }

  taskFailed(taskId: string, error: string, duration: number): void {
    this.write({
      type: TaskEventType.TASK_FAILED,
      taskId,
      error,
      duration,
    });
  }

  toolUseStart(toolName: string, params: Record<string, any>): void {
    this.write({
      type: TaskEventType.TOOL_USE_START,
      toolName,
      params,
    });
  }

  toolUseComplete(
    toolName: string,
    success: boolean,
    result?: Record<string, any>,
    error?: string,
    duration?: number
  ): void {
    this.write({
      type: TaskEventType.TOOL_USE_COMPLETE,
      toolName,
      success,
      result,
      error,
      duration,
    });
  }

  fileCreated(path: string, size: number, lines?: number, verified = false): void {
    this.write({
      type: TaskEventType.FILE_CREATED,
      path,
      size,
      lines,
      verified,
    });
  }

  validationResult(
    output: string,
    exists: boolean,
    checks: Array<{ id: string; passed: boolean; error?: string }>,
    size?: number
  ): void {
    this.write({
      type: TaskEventType.VALIDATION_RESULT,
      output,
      exists,
      checks,
      size,
    });
  }

  aiReasoning(text: string, context?: Record<string, any>): void {
    this.write({
      type: TaskEventType.AI_REASONING,
      text,
      context,
    });
  }

  gapDetected(gapId: string, description: string, kind: string): void {
    this.write({
      type: TaskEventType.GAP_DETECTED,
      gapId,
      description,
      kind,
    });
  }

  gapResolved(gapId: string, strategy: string, duration: number): void {
    this.write({
      type: TaskEventType.GAP_RESOLVED,
      gapId,
      strategy,
      duration,
    });
  }
}
