/**
 * Console Formatter - Reads events.jsonl and displays formatted output
 *
 * This is a READ-ONLY component. It never writes to the event file.
 * It tails the events file and formats events for human consumption.
 */

import { createReadStream, watch, ReadStream, statSync } from 'fs';
import { TaskEvent, TaskEventType } from './event-writer.js';

/**
 * Formatter configuration
 */
export interface FormatterConfig {
  /** Minimum event level to display (debug|info|warning|error|critical) */
  minLevel?: 'debug' | 'info' | 'warning' | 'error' | 'critical';

  /** Use colors in output */
  useColor?: boolean;

  /** Use icons in output */
  useIcons?: boolean;

  /** Show timestamps */
  showTimestamps?: boolean;

  /** Timestamp format: 'absolute' or 'relative' */
  timestampFormat?: 'absolute' | 'relative';
}

const DEFAULT_CONFIG: FormatterConfig = {
  minLevel: 'info',
  useColor: true,
  useIcons: true,
  showTimestamps: false,
  timestampFormat: 'relative',
};

/**
 * Console Formatter - tails events.jsonl and displays formatted output
 */
export class ConsoleFormatter {
  private config: FormatterConfig;
  private eventsFile: string;
  private lastPosition: number = 0;
  private readStream: ReadStream | null = null;
  private watcher: ReturnType<typeof watch> | null = null;
  private startTime: Date = new Date();
  private levelPriority: Record<string, number> = {
    debug: 0,
    info: 1,
    warning: 2,
    error: 3,
    critical: 4,
  };

  constructor(eventsFile: string, config?: FormatterConfig) {
    this.eventsFile = eventsFile;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start tailing the events file
   */
  async start(): Promise<void> {
    // Create empty file if it doesn't exist
    const { writeFileSync, existsSync, mkdirSync } = await import('node:fs');
    const { dirname } = await import('node:path');

    let fileExisted = existsSync(this.eventsFile);

    if (!fileExisted) {
      mkdirSync(dirname(this.eventsFile), { recursive: true });
      writeFileSync(this.eventsFile, '');
      this.lastPosition = 0; // File is empty, start from beginning
    }

    // Only read existing events if file had content before we started
    if (fileExisted) {
      await this.readExisting();
    }

    // Then watch for new events
    this.startWatching();
  }

  /**
   * Read existing events from file
   */
  private async readExisting(): Promise<void> {
    try {
      const stats = statSync(this.eventsFile);
      if (stats.size === 0) return;

      const stream = createReadStream(this.eventsFile, { encoding: 'utf8' });
      let buffer = '';

      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const event = JSON.parse(line);
              this.formatAndLog(event);
            } catch (err) {
              // Malformed JSON - skip
            }
          }
        }
      });

      await new Promise((resolve, reject) => {
        stream.on('end', () => {
          this.lastPosition = stats.size;
        });
        stream.on('close', () => resolve(undefined));
        stream.on('error', reject);
      });
    } catch (err: any) {
      // File doesn't exist yet - that's ok
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  /**
   * Watch file for new events
   */
  private isReading = false;

  private startWatching(): void {
    this.watcher = watch(this.eventsFile, (eventType) => {
      if (eventType === 'change' && !this.isReading) {
        this.isReading = true;
        this.readNew();
        // Reset flag after a short delay to allow for batched reads
        setTimeout(() => { this.isReading = false; }, 50);
      }
    });
    this.watcher.on('error', (err: any) => {
      if (err.code !== 'EPERM' && err.code !== 'ENOENT') throw err;
    });
  }

  /**
   * Read new events since last position
   */
  private readNew(): void {
    try {
      const stats = statSync(this.eventsFile);
      if (stats.size <= this.lastPosition) return;

      const stream = createReadStream(this.eventsFile, {
        encoding: 'utf8',
        start: this.lastPosition,
      });

      let buffer = '';

      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const event = JSON.parse(line);
              this.formatAndLog(event);
            } catch (err) {
              // Malformed JSON - skip
            }
          }
        }
      });

      stream.on('end', () => {
        this.lastPosition = stats.size;
      });
    } catch (err) {
      // File might have been deleted/recreated - reset position
      this.lastPosition = 0;
    }
  }

  /**
   * Format and log event to console
   */
  private formatAndLog(event: TaskEvent): void {
    // Filter by level
    if (!this.shouldDisplay(event)) {
      return;
    }

    const formatted = this.format(event);
    if (formatted) {
      console.log(formatted);
    }
  }

  /**
   * Check if event should be displayed based on level
   */
  private shouldDisplay(event: TaskEvent): boolean {
    const eventLevel = event.level || 'info';
    const minLevel = this.config.minLevel || 'info';

    return this.levelPriority[eventLevel] >= this.levelPriority[minLevel];
  }

  /**
   * Format event for console display
   */
  private format(event: TaskEvent): string | null {
    switch (event.type) {
      case TaskEventType.TASK_START:
        return this.formatTaskStart(event);

      case TaskEventType.TASK_COMPLETE:
        return this.formatTaskComplete(event);

      case TaskEventType.TASK_FAILED:
        return this.formatTaskFailed(event);

      case TaskEventType.RETRY_START:
        return this.formatRetryStart(event);

      case TaskEventType.TOOL_USE_START:
        return null; // Don't log start, wait for complete

      case TaskEventType.TOOL_USE_COMPLETE:
        return this.formatToolComplete(event);

      case TaskEventType.FILE_CREATED:
        return this.formatFileCreated(event);

      case TaskEventType.VALIDATION_RESULT:
        return this.formatValidation(event);

      case TaskEventType.AI_REASONING:
        return this.formatReasoning(event);

      case TaskEventType.GAP_DETECTED:
        return this.formatGapDetected(event);

      case TaskEventType.GAP_RESOLVED:
        return this.formatGapResolved(event);

      // Internal events - don't display
      case TaskEventType.INTERNAL_STATE:
      case TaskEventType.STREAM_CHUNK:
        return null;

      default:
        return null;
    }
  }

  private formatTaskStart(event: any): string {
    const icon = this.config.useIcons ? '🎬' : '';
    return `${icon} Starting: ${event.taskName}\n   └─ Inputs: ${event.inputs.length}  Outputs: ${event.outputs.length}`;
  }

  private formatTaskComplete(event: any): string {
    const icon = this.config.useIcons ? '✅' : '';
    const duration = this.formatDuration(event.duration);
    return `${icon} COMPLETED in ${duration}`;
  }

  private formatTaskFailed(event: any): string {
    const icon = this.config.useIcons ? '❌' : '';
    const duration = this.formatDuration(event.duration);
    return `${icon} FAILED in ${duration}\n   Error: ${event.error}`;
  }

  private formatRetryStart(event: any): string {
    const icon = this.config.useIcons ? '🔄' : '';
    return `${icon} Retry #${event.attemptNumber}: ${event.reason}`;
  }

  private formatToolComplete(event: any): string {
    const { toolName, success, result, error } = event;

    if (!success) {
      return `❌ ${toolName} failed: ${error}`;
    }

    switch (toolName) {
      case 'Read':
        return `📖 Read ${result.file || event.params?.file} (${this.formatSize(result.size)})`;

      case 'Write':
        return `✍️  Write ${result.file || event.params?.file} (${this.formatSize(result.size)}${result.lines ? `, ${result.lines} lines` : ''})`;

      case 'Skill':
        return `🛠️  Skill: ${event.params?.skill || result.skill} → ${result.output || 'completed'}`;

      case 'Bash':
        return `⚙️  Bash: ${event.params?.command?.substring(0, 50) || 'command'} → ${success ? 'success' : 'failed'}`;

      default:
        return `✅ ${toolName} completed`;
    }
  }

  private formatFileCreated(event: any): string {
    const icon = event.verified ? '✅' : '📄';
    return `${icon} Created: ${event.path} (${this.formatSize(event.size)}${event.lines ? `, ${event.lines} lines` : ''})`;
  }

  private formatValidation(event: any): string {
    const allPassed = event.checks.every((c: any) => c.passed);
    const icon = allPassed ? '✅' : '❌';

    const checkStatus = event.checks
      .map((c: any) => `   ${c.passed ? '✓' : '✗'} ${c.id}${c.error ? `: ${c.error}` : ''}`)
      .join('\n');

    return `${icon} Validation ${allPassed ? 'passed' : 'failed'}\n${checkStatus}`;
  }

  private formatReasoning(event: any): string {
    const icon = this.config.useIcons ? '💭' : '';
    let output = `${icon} ${event.text}`;

    if (event.context) {
      const contextLines = Object.entries(event.context)
        .map(([key, value]) => `   └─ ${key}: ${value}`)
        .join('\n');
      output += '\n' + contextLines;
    }

    return output;
  }

  private formatGapDetected(event: any): string {
    if (event.kind === 'plan') {
      return `📋 Generating plan...`;
    }
    if (event.kind === 'wbs') {
      return `📋 Seeding subtasks...`;
    }
    return `🔍 Gap detected: ${event.description}\n   └─ Kind: ${event.kind}`;
  }

  private formatGapResolved(event: any): string {
    const duration = this.formatDuration(event.duration);
    return `✅ Gap resolved by: ${event.strategy} (${duration})`;
  }

  /**
   * Utility: Format file size
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Utility: Format duration
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Stop watching events file
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.readStream) {
      this.readStream.destroy();
      this.readStream = null;
    }
  }
}
