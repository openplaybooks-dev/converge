import { readFileSync, statSync } from "node:fs";
import { AgentManager, ProcessInfo } from "./agent-manager.js";
import { ActivityLog, ResourceSnapshot } from "./agent-monitor.js";

export interface DiagnosticReport {
  process: ProcessInfo;
  monitor: {
    lastActivity: number;
    idleDurationMs: number;
    recentActivity: ActivityLog[];
    resourceUsage?: ResourceSnapshot;
  };
  logs: {
    path: string;
    size: number;
    lastLines: string[];
  };
  classification: {
    type: "healthy" | "idle" | "hung" | "crashed" | "leaked";
    reason: string;
    recommendation: string;
  };
}

export class AgentDiagnostics {
  static async generateReport(pid: number): Promise<DiagnosticReport | null> {
    const manager = AgentManager.getInstance();
    const processInfo = manager.getProcess(pid);

    if (!processInfo) {
      console.warn(
        `⚠️  Cannot generate report for PID=${pid}: not found in registry`,
      );
      return null;
    }

    // Get log file info
    const logInfo = this.getLogInfo(processInfo.logPath);

    // Calculate idle duration
    const now = Date.now();
    const idleDurationMs = now - processInfo.lastActivityAt;

    // Classify process state
    const classification = this.classifyProcess(processInfo, idleDurationMs);

    return {
      process: processInfo,
      monitor: {
        lastActivity: processInfo.lastActivityAt,
        idleDurationMs,
        recentActivity: [],
        resourceUsage: undefined,
      },
      logs: logInfo,
      classification,
    };
  }

  static async dumpAllReports(outputDir: string): Promise<void> {
    const manager = AgentManager.getInstance();
    const processes = manager.getAllProcesses();

    console.log(
      `📊 Generating diagnostic reports for ${processes.length} processes...`,
    );

    for (const proc of processes) {
      const report = await this.generateReport(proc.pid);
      if (report) {
        const filename = `${outputDir}/agent-${proc.pid}-${proc.sessionId}.json`;
        const fs = await import("node:fs/promises");
        await fs.writeFile(filename, JSON.stringify(report, null, 2), "utf-8");
        console.log(`  ✅ ${filename}`);
      }
    }
  }

  // Exit code decoding
  static decodeExitCode(code: number | null | undefined): {
    name: string;
    description: string;
    isRetryable: boolean;
  } {
    if (code === null || code === undefined) {
      return {
        name: "UNKNOWN",
        description: "Process exited without exit code",
        isRetryable: false,
      };
    }

    if (code === 0) {
      return {
        name: "SUCCESS",
        description: "Process completed successfully",
        isRetryable: false,
      };
    }

    // Standard Unix exit codes
    if (code === 1) {
      return {
        name: "GENERAL_ERROR",
        description: "General error",
        isRetryable: true,
      };
    }

    if (code === 2) {
      return {
        name: "MISUSE",
        description: "Misuse of shell command",
        isRetryable: false,
      };
    }

    if (code === 126) {
      return {
        name: "NOT_EXECUTABLE",
        description: "Command cannot execute",
        isRetryable: false,
      };
    }

    if (code === 127) {
      return {
        name: "COMMAND_NOT_FOUND",
        description: "Command not found",
        isRetryable: false,
      };
    }

    if (code === 130) {
      return {
        name: "SIGINT",
        description: "Interrupted by Ctrl+C",
        isRetryable: false,
      };
    }

    if (code === 137) {
      return {
        name: "SIGKILL",
        description: "Killed by SIGKILL",
        isRetryable: false,
      };
    }

    if (code === 143) {
      return {
        name: "SIGTERM",
        description: "Terminated by SIGTERM",
        isRetryable: false,
      };
    }

    // Windows STATUS codes (converted to unsigned)
    const windowsCode = this.getWindowsStatusCode(code);
    if (windowsCode) {
      return windowsCode;
    }

    // JavaScript/Node.js specific errors
    if (code === 12) {
      return {
        name: "INVALID_ARGUMENT",
        description: "Invalid argument",
        isRetryable: false,
      };
    }

    // Default
    return {
      name: `EXIT_${code}`,
      description: `Unknown exit code ${code}`,
      isRetryable: true,
    };
  }

  // Windows STATUS code interpretation
  private static getWindowsStatusCode(code: number): {
    name: string;
    description: string;
    isRetryable: boolean;
  } | null {
    // Convert signed to unsigned for Windows STATUS codes
    const unsigned = code >>> 0;

    const windowsStatusCodes: Record<
      number,
      { name: string; description: string; isRetryable: boolean }
    > = {
      0xc0000005: {
        name: "ACCESS_VIOLATION",
        description: "Access violation (segfault)",
        isRetryable: false,
      },
      0xc00000fd: {
        name: "STACK_OVERFLOW",
        description: "Stack overflow",
        isRetryable: false,
      },
      0xc0000374: {
        name: "HEAP_CORRUPTION",
        description: "Heap corruption detected",
        isRetryable: false,
      },
      0xc0000142: {
        name: "DLL_INIT_FAILED",
        description: "DLL initialization failed",
        isRetryable: true,
      },
      0xc0000409: {
        name: "STACK_BUFFER_OVERRUN",
        description: "Stack buffer overrun",
        isRetryable: false,
      },
      0xe0434352: {
        name: "CLR_EXCEPTION",
        description: ".NET CLR exception",
        isRetryable: true,
      },
      0x40010004: {
        name: "DBG_TERMINATE_PROCESS",
        description: "Debugger terminated process",
        isRetryable: false,
      },
    };

    const match = windowsStatusCodes[unsigned];
    if (match) {
      return match;
    }

    // Check if it looks like a Windows STATUS code
    if (unsigned >= 0x80000000 && unsigned <= 0xffffffff) {
      return {
        name: `WINDOWS_STATUS_0x${unsigned.toString(16).toUpperCase()}`,
        description: `Windows STATUS code 0x${unsigned.toString(16).toUpperCase()}`,
        isRetryable: true,
      };
    }

    return null;
  }

  // Classify process state
  private static classifyProcess(
    processInfo: ProcessInfo,
    idleDurationMs: number,
  ): {
    type: "healthy" | "idle" | "hung" | "crashed" | "leaked";
    reason: string;
    recommendation: string;
  } {
    // Check if crashed
    if (processInfo.status === "dead" && processInfo.exitCode !== 0) {
      const exitInfo = this.decodeExitCode(processInfo.exitCode);
      return {
        type: "crashed",
        reason: `Process crashed with ${exitInfo.name}: ${exitInfo.description}`,
        recommendation: exitInfo.isRetryable
          ? "Retry the operation. If it persists, check logs for errors."
          : "Fix the underlying issue before retrying. Check logs and stack traces.",
      };
    }

    // Check if dead (successful)
    if (processInfo.status === "dead") {
      return {
        type: "healthy",
        reason: "Process completed successfully",
        recommendation: "No action needed.",
      };
    }

    // Check if leaked (parent died)
    try {
      process.kill(processInfo.parentPid, 0);
    } catch {
      return {
        type: "leaked",
        reason: "Parent process no longer exists",
        recommendation: "Kill this orphaned process to free resources.",
      };
    }

    // Check if hung
    const hangThresholdMs = 5 * 60 * 1000; // 5 minutes
    if (idleDurationMs > hangThresholdMs) {
      return {
        type: "hung",
        reason: `No activity for ${Math.round(idleDurationMs / 1000)}s (threshold: ${Math.round(hangThresholdMs / 1000)}s)`,
        recommendation:
          "Kill the process and retry. Check if the prompt is causing the hang.",
      };
    }

    // Check if idle
    const idleThresholdMs = 60 * 1000; // 1 minute
    if (idleDurationMs > idleThresholdMs) {
      return {
        type: "idle",
        reason: `No activity for ${Math.round(idleDurationMs / 1000)}s`,
        recommendation:
          "Monitor for progress. May be waiting for user input or processing.",
      };
    }

    // Healthy
    return {
      type: "healthy",
      reason: "Process is actively running",
      recommendation: "No action needed.",
    };
  }

  // Get log file info
  private static getLogInfo(logPath: string): {
    path: string;
    size: number;
    lastLines: string[];
  } {
    try {
      const stats = statSync(logPath);
      const content = readFileSync(logPath, "utf-8");
      const lines = content.split("\n");
      const lastLines = lines.slice(-50); // Last 50 lines

      return {
        path: logPath,
        size: stats.size,
        lastLines,
      };
    } catch (error: any) {
      return {
        path: logPath,
        size: 0,
        lastLines: [`Error reading log: ${error.message}`],
      };
    }
  }
}
