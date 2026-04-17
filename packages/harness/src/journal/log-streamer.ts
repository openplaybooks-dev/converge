/**
 * LogStreamer - Real-time streaming of agentfn execution logs to console
 *
 * Tails the .log files created by agentfn and formats interesting events
 * for display in the console, providing visibility into what the AI is doing.
 */

import { watch, statSync, createReadStream, existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

interface StreamOptions {
  /** Show tool calls (Read, Write, Bash, etc.) */
  showToolCalls?: boolean;
  /** Show AI reasoning/thinking */
  showReasoning?: boolean;
  /** Show results/completions */
  showResults?: boolean;
  /** Minimum log level to show */
  minLevel?: 'debug' | 'info' | 'warning' | 'error';
  /** Use colors in output */
  useColor?: boolean;
  /** Debounce interval (ms) to batch updates */
  debounceMs?: number;
}

const DEFAULT_OPTIONS: StreamOptions = {
  showToolCalls: true,
  showReasoning: false, // Too verbose for most users
  showResults: true,
  minLevel: 'info',
  useColor: true,
  debounceMs: 100,
};

/**
 * Real-time log file streamer
 */
export class LogStreamer {
  private logDir: string;
  private options: StreamOptions;
  private watcher: ReturnType<typeof watch> | null = null;
  private lastPositions: Map<string, number> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(logDir: string, options?: StreamOptions) {
    this.logDir = logDir;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Start streaming logs
   */
  async start(): Promise<void> {
    try {
      // Read any existing logs first
      await this.processExistingLogs();

      // Then watch for new log files
      this.startWatching();
    } catch (err: any) {
      console.warn(`   ⚠️  LogStreamer failed to start: ${err.message}`);
    }
  }

  /**
   * Stop streaming
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Process existing log files
   */
  private async processExistingLogs(): Promise<void> {
    if (!existsSync(this.logDir)) return;

    try {
      const files = await readdir(this.logDir);
      const logFiles = files
        .filter(f => f.endsWith('.log'))
        .sort(); // Chronological order

      for (const file of logFiles) {
        const filePath = join(this.logDir, file);
        this.lastPositions.set(filePath, 0);
        await this.readLogFile(filePath);
      }
    } catch (err) {
      // Directory doesn't exist yet - that's ok
    }
  }

  /**
   * Watch for new log files and changes
   */
  private startWatching(): void {
    // Use polling approach instead of watching parent directory
    if (!existsSync(this.logDir)) {
      // Poll for directory creation
      const pollInterval = setInterval(() => {
        if (existsSync(this.logDir)) {
          clearInterval(pollInterval);
          this.startWatching();
        }
      }, 500);

      // Give up after 30 seconds
      setTimeout(() => clearInterval(pollInterval), 30000);
      return;
    }

    try {
      this.watcher = watch(this.logDir, (eventType, filename) => {
        if (eventType === 'change' && filename?.endsWith('.log')) {
          this.scheduleUpdate(join(this.logDir, filename));
        }
      });
      this.watcher.on('error', (err: any) => {
        if (err.code !== 'EPERM' && err.code !== 'ENOENT') throw err;
      });
    } catch (err: any) {
      console.warn(`   ⚠️  Failed to watch log directory: ${err.message}`);
    }
  }

  /**
   * Schedule a debounced update
   */
  private scheduleUpdate(filePath: string): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      if (!this.isProcessing) {
        this.isProcessing = true;
        this.readLogFile(filePath).finally(() => {
          this.isProcessing = false;
        });
      }
    }, this.options.debounceMs);
  }

  /**
   * Read new content from a log file
   */
  private async readLogFile(filePath: string): Promise<void> {
    try {
      const stats = statSync(filePath);
      const lastPosition = this.lastPositions.get(filePath) || 0;

      if (stats.size <= lastPosition) return;

      const stream = createReadStream(filePath, {
        encoding: 'utf8',
        start: lastPosition,
      });

      let buffer = '';

      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            this.processLogLine(line);
          }
        }
      });

      stream.on('end', () => {
        this.lastPositions.set(filePath, stats.size);
      });
    } catch (err) {
      // File might have been deleted - ignore
    }
  }

  /**
   * Process a single log line
   */
  private processLogLine(line: string): void {
    // Parse log line: [timestamp] [LEVEL] message
    const match = line.match(/^\[([^\]]+)\]\s+\[([A-Z_]+)\]\s+([\s\S]*)$/);
    if (!match) return;

    const [, timestamp, level, message] = match;

    // Filter by level
    if (level === 'DEBUG' && this.options.minLevel !== 'debug') return;

    // Parse and format based on event type
    if (level === 'TOOL_USE') {
      if (this.options.showToolCalls) {
        this.formatToolCall(message);
      }
    } else if (level === 'TOOL_RESULT') {
      if (this.options.showToolCalls) {
        this.formatToolResult(message);
      }
    } else if (level === 'TEXT_BLOCK') {
      if (this.options.showReasoning) {
        this.formatReasoning(message);
      }
    } else if (level === 'FINAL_RESULT' || level === 'RESULT') {
      if (this.options.showResults) {
        this.formatResult(message);
      }
    } else if (level === 'STDOUT' || level === 'STREAM_EVENT') {
      // Parse JSON events
      try {
        const event = JSON.parse(message);

        // Check for tool_use in assistant message
        if (event.type === 'assistant' && event.message?.content) {
          const toolUse = event.message.content.find((c: any) => c.type === 'tool_use');
          if (toolUse && this.options.showToolCalls) {
            this.formatToolUseFromMessage(toolUse);
          }
        } else if (event.type === 'result') {
          if (this.options.showResults) {
            this.formatAgentResult(event);
          }
        }
      } catch {
        // Not JSON - ignore
      }
    } else if (level === 'ERROR' || level === 'STDERR') {
      this.formatError(message);
    }
  }

  /**
   * Format tool call event (from [TOOL_USE] log line)
   */
  private formatToolCall(message: string): void {
    // Format: Tool: {name}\nInput: {...}
    const lines = message.split('\n');
    if (lines.length >= 1) {
      const toolLine = lines[0];
      const toolMatch = toolLine.match(/Tool:\s+(\w+)/);
      if (toolMatch) {
        const tool = toolMatch[1];
        this.printToolIcon(tool);
      }
    }
  }

  /**
   * Format tool use from assistant message content
   */
  private formatToolUseFromMessage(toolUse: any): void {
    const tool = toolUse.name;
    const input = toolUse.input;

    this.printToolIcon(tool, input);
  }

  /**
   * Print tool icon and description
   */
  private printToolIcon(tool: string, input?: any): void {
    switch (tool) {
      case 'Read':
        console.log(`   📖 Reading ${input?.file_path || 'file'}`);
        break;
      case 'Write':
        console.log(`   ✍️  Writing ${input?.file_path || 'file'}`);
        break;
      case 'Edit':
        console.log(`   ✏️  Editing ${input?.file_path || 'file'}`);
        break;
      case 'Bash':
        const cmd = input?.command?.substring(0, 50) || 'command';
        console.log(`   ⚙️  Running: ${cmd}${input?.command?.length > 50 ? '...' : ''}`);
        break;
      case 'Skill':
        console.log(`   🛠️  Skill: /${input?.skill || 'unknown'}`);
        break;
      case 'WebSearch':
        console.log(`   🔍 Searching: ${input?.query || ''}`);
        break;
      case 'WebFetch':
        console.log(`   🌐 Fetching: ${input?.url || ''}`);
        break;
      default:
        console.log(`   🔧 ${tool}`);
    }
  }

  /**
   * Format tool result event
   */
  private formatToolResult(message: string): void {
    // Tool results can be very long - only show errors or short messages
    if (message.includes('error') || message.includes('Error') || message.includes('failed')) {
      const shortMsg = message.substring(0, 100);
      console.log(`   ❌ ${shortMsg}${message.length > 100 ? '...' : ''}`);
    }
    // Otherwise, tool results are usually successful and verbose - skip them
  }

  /**
   * Format AI reasoning
   */
  private formatReasoning(message: string): void {
    console.log(`   💬 ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
  }

  /**
   * Format final result
   */
  private formatResult(message: string): void {
    // Results can be very long - just show a snippet
    const lines = message.split('\n').slice(0, 3);
    for (const line of lines) {
      if (line.trim()) {
        console.log(`   ${line}`);
      }
    }
  }

  /**
   * Format agent result (from STREAM_EVENT)
   */
  private formatAgentResult(event: any): void {
    if (event.subtype === 'success') {
      const duration = (event.duration_ms / 1000).toFixed(1);
      console.log(`   ✅ Done in ${duration}s`);
    } else if (event.subtype === 'error') {
      console.log(`   ❌ Error: ${event.error || 'Unknown error'}`);
    }
  }

  /**
   * Format error message
   */
  private formatError(message: string): void {
    console.log(`   ❌ ${message}`);
  }
}
