/**
 * SimpleLower Tailer - Uses tail -f to stream logs in real-time
 *
 * Much simpler and more reliable than file watching.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface TailerOptions {
  showToolCalls?: boolean;
  showReasoning?: boolean;
  showResults?: boolean;
  showToolResults?: boolean;
}

const DEFAULT_OPTIONS: TailerOptions = {
  showToolCalls: true,
  showReasoning: false,
  showResults: true,
  showToolResults: false, // Show tool success/failure (verbose)
};

/**
 * Simple log tailer using tail -f
 */
export class SimpleLogTailer {
  private logDir: string;
  private options: TailerOptions;
  private tailProcess: ChildProcess | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private existingFilesAtStart: Set<string> = new Set();

  constructor(logDir: string, options?: TailerOptions) {
    this.logDir = logDir;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Start tailing logs
   */
  async start(): Promise<void> {
    // Snapshot which log files already exist so we only tail newly-created ones.
    // This prevents latching onto a stale log from a previous wip attempt.
    if (existsSync(this.logDir)) {
      try {
        const existing = await readdir(this.logDir);
        for (const f of existing) {
          if (f.endsWith(".log") && f !== "log.log") {
            this.existingFilesAtStart.add(f);
          }
        }
      } catch {
        // ignore
      }
    }

    // Poll for log files to appear
    this.pollInterval = setInterval(() => {
      void this.checkAndStartTail();
    }, 1000);

    // Initial check
    await this.checkAndStartTail();
  }

  /**
   * Stop tailing
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.tailProcess) {
      this.tailProcess.kill();
      this.tailProcess = null;
    }
  }

  /**
   * Check for log files and start tail if found
   */
  private async checkAndStartTail(): Promise<void> {
    if (this.tailProcess) return; // Already tailing
    if (!existsSync(this.logDir)) return; // Directory doesn't exist yet

    try {
      const files = await readdir(this.logDir);
      // Filter for timestamped log files that are NEW (not present when start() was called).
      // This prevents latching onto stale logs from a previous wip attempt.
      const logFiles = files
        .filter(
          (f) =>
            f.endsWith(".log") &&
            f !== "log.log" &&
            !this.existingFilesAtStart.has(f),
        )
        .sort()
        .reverse(); // Most recent first

      if (logFiles.length === 0) return; // No new log files yet

      // Start tailing the most recent log file
      const logFile = join(this.logDir, logFiles[0]);
      this.startTail(logFile);

      // Stop polling once we've started tailing
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    } catch (err) {
      // Ignore errors
    }
  }

  /**
   * Start tail -f process
   */
  private startTail(logFile: string): void {
    console.log(`   📡 Streaming logs from: ${logFile}`);
    this.tailProcess = spawn("tail", ["-f", "-n", "0", logFile]);

    this.tailProcess.stdout?.on("data", (chunk) => {
      const lines = chunk.toString().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          this.processLogLine(line);
        }
      }
    });

    this.tailProcess.stderr?.on("data", (chunk) => {
      console.warn(`   ⚠️  tail stderr: ${chunk.toString()}`);
    });

    this.tailProcess.on("error", (err) => {
      console.warn(`   ⚠️  tail process error: ${err.message}`);
    });

    this.tailProcess.on("exit", (code) => {
      this.tailProcess = null;
    });
  }

  /**
   * Process a log line
   */
  private processLogLine(line: string): void {
    // Parse: [timestamp] [LEVEL] message
    const match = line.match(/^\[([^\]]+)\]\s+\[([A-Z_]+)\]\s+([\s\S]*)$/);
    if (!match) return;

    const [, , level, message] = match;

    // Handle different log types
    if (level === "TOOL_USE" && this.options.showToolCalls) {
      this.formatToolUse(message);
    } else if (level === "TOOL_RESULT" && this.options.showToolResults) {
      this.formatToolResult(message);
    } else if (level === "TEXT_BLOCK" && this.options.showReasoning) {
      const textShort =
        message.length > 100 ? message.substring(0, 97) + "..." : message;
      console.log(`   💬 ${textShort}`);
    } else if (level === "FINAL_RESULT" && this.options.showResults) {
      // Agent invocation finished — does NOT mean the task converged.
      // The runner still has to validate checks before marking the task done.
      console.log(`   🤖 Agent finished (awaiting check validation)`);
    } else if (level === "ERROR" || level === "STDERR") {
      const errShort =
        message.length > 120 ? message.substring(0, 117) + "..." : message;
      console.log(`   ❌ ${errShort}`);
    } else if (level === "STDOUT" && this.options.showToolCalls) {
      this.parseStdout(message);
    }
  }

  /**
   * Format tool use
   */
  private formatToolUse(message: string): void {
    const lines = message.split("\n");
    const toolMatch = lines[0]?.match(/Tool:\s+(\w+)/);

    if (toolMatch) {
      const tool = toolMatch[1];

      // Try to extract input from next lines
      let input: any = {};
      try {
        const inputStart = message.indexOf("Input: {");
        if (inputStart > -1) {
          const jsonStr = message.substring(inputStart + 7);
          input = JSON.parse(jsonStr);
        }
      } catch {
        // Ignore parse errors
      }

      this.printTool(tool, input);
    }
  }

  /**
   * Parse STDOUT for tool calls
   */
  private parseStdout(message: string): void {
    try {
      const event = JSON.parse(message);

      if (event.type === "assistant" && event.message?.content) {
        for (const item of event.message.content) {
          if (item.type === "tool_use") {
            this.printTool(item.name, item.input);
          }
        }
      }
    } catch {
      // Not JSON or not a tool call
    }
  }

  /**
   * Format tool result
   */
  private formatToolResult(message: string): void {
    // Only show if explicitly enabled (verbose)
    if (message.includes("success") || message.includes("Success")) {
      const resultShort = message.substring(0, 80);
      console.log(`      ✓ ${resultShort}${message.length > 80 ? "..." : ""}`);
    } else if (
      message.includes("error") ||
      message.includes("Error") ||
      message.includes("failed")
    ) {
      const resultShort = message.substring(0, 80);
      console.log(`      ✗ ${resultShort}${message.length > 80 ? "..." : ""}`);
    }
  }

  /**
   * Print tool with icon
   */
  private printTool(tool: string, input: any = {}): void {
    switch (tool) {
      case "Read":
        const readPath = input.file_path || "file";
        const readOffset = input.offset ? ` (offset: ${input.offset})` : "";
        const readLimit = input.limit ? ` (limit: ${input.limit} lines)` : "";
        console.log(`   📖 Read ${readPath}${readOffset}${readLimit}`);
        break;

      case "Write":
        const writePath = input.file_path || "file";
        const writeSize = input.content?.length || 0;
        const writeSizeStr =
          writeSize > 0 ? ` (${this.formatBytes(writeSize)})` : "";
        console.log(`   ✍️  Write ${writePath}${writeSizeStr}`);
        break;

      case "Edit":
        const editPath = input.file_path || "file";
        const oldLen = input.old_string?.length || 0;
        const newLen = input.new_string?.length || 0;
        const editInfo = oldLen > 0 ? ` (${oldLen} → ${newLen} chars)` : "";
        console.log(`   ✏️  Edit ${editPath}${editInfo}`);
        break;

      case "Bash":
        const cmd = input.command || "command";
        const cmdShort = cmd.length > 80 ? cmd.substring(0, 77) + "..." : cmd;
        const desc = input.description ? ` - ${input.description}` : "";
        console.log(`   ⚙️  ${cmdShort}${desc}`);
        break;

      case "Skill":
        const skill = input.skill || "unknown";
        const args = input.args ? ` ${input.args}` : "";
        console.log(`   🛠️  Skill: /${skill}${args}`);
        break;

      case "WebSearch":
        const query = input.query || "";
        const queryShort =
          query.length > 60 ? query.substring(0, 57) + "..." : query;
        console.log(`   🔍 Search: ${queryShort}`);
        break;

      case "WebFetch":
        const url = input.url || "";
        const urlShort = url.length > 70 ? url.substring(0, 67) + "..." : url;
        console.log(`   🌐 Fetch: ${urlShort}`);
        break;

      case "Glob":
        const pattern = input.pattern || "*";
        const globPath = input.path ? ` in ${input.path}` : "";
        console.log(`   📂 Glob: ${pattern}${globPath}`);
        break;

      case "Grep":
        const grepPattern = input.pattern || "";
        const grepFile = input.path ? ` in ${input.path}` : "";
        const grepShort =
          grepPattern.length > 50
            ? grepPattern.substring(0, 47) + "..."
            : grepPattern;
        console.log(`   🔎 Grep: "${grepShort}"${grepFile}`);
        break;

      case "TodoWrite":
      case "TaskCreate":
      case "TaskUpdate":
        // Skip todo/task management tools (too verbose)
        return;

      default:
        // Show other tools with their name
        const params =
          Object.keys(input).length > 0
            ? ` (${Object.keys(input).join(", ")})`
            : "";
        console.log(`   🔧 ${tool}${params}`);
    }
  }

  /**
   * Format bytes to human-readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
