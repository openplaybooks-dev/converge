/**
 * AgentRunner
 *
 * Thin wrapper over `agentfn` that adds:
 *   - Rich heartbeat: tails the live log file every minute so you can see
 *     what the AI is doing without opening the log manually
 *   - Journal event logging (CLAUDEFN_START / CLAUDEFN_COMPLETE / CLAUDEFN_FAILED)
 *   - Consistent log directory resolution from journal context
 *
 * All strategies should use this instead of calling agentfn directly.
 */

import { agentfn } from "@converge/agentfn";
import type { AgentFnOptions, AgentFnResult } from "@converge/agentfn";
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getJournalStructure } from "../journal/structure.ts";
import { logTaskEvent } from "../journal/writer.ts";
import type { JournalContext } from "./types.ts";
import { AgentManager } from "../agent-manager/index.js";
import { SimpleLogTailer } from "../journal/simple-log-tailer.ts";
// AI config loaded from project.yaml or PROJECT.md
import { FilesystemStorage } from "../storage/filesystem.ts";
import { loadConvergeConfig } from "../config/loader.ts";
import { resolveAIConfig, listAIProviders } from "../ai/factory.ts";

/* ------------------------------------------------------------------ */
/*  Log directory resolution                                           */
/* ------------------------------------------------------------------ */

export function getAgentLogDir(
  projectDir: string,
  ctx?: JournalContext,
): string {
  if (ctx) {
    const structure = getJournalStructure(projectDir, ctx.epicId, ctx.taskId);
    return join(structure.attempt ?? structure.task!, "logs");
  }
  return join(projectDir, ".converge", "logs", "claudefn");
}

/* ------------------------------------------------------------------ */
/*  Log file reader                                                    */
/* ------------------------------------------------------------------ */

interface LogLine {
  timestamp: Date;
  level: string;
  message: string;
}

/** Parse a single log line: `[2026-04-02T05:04:40.885Z] [STDOUT] message...` */
function parseLogLine(raw: string): LogLine | null {
  const m = raw.match(/^\[([^\]]+)\]\s+\[([A-Z_]+)\]\s+([\s\S]*)$/);
  if (!m) return null;
  const ts = new Date(m[1]);
  if (isNaN(ts.getTime())) return null;
  return { timestamp: ts, level: m[2], message: m[3].trim() };
}

/** Return all `.log` files in `logDir` sorted by creation time (oldest first). */
async function findAllLogs(logDir: string): Promise<string[]> {
  if (!existsSync(logDir)) return [];
  try {
    const files = (await readdir(logDir)).filter((f) => f.endsWith(".log"));
    if (files.length === 0) return [];
    // Sort by filename (ISO timestamp prefix) → chronological order
    files.sort();
    return files.map((f) => join(logDir, f));
  } catch {
    return [];
  }
}

/**
 * Read the last N *meaningful* lines across ALL log files in the directory.
 * Aggregating all sessions means TIMEOUT lines from old sessions stay visible
 * even after a new session starts, so the heartbeat always shows real activity.
 */
async function readLogTailAll(
  logDir: string,
  maxLines = 4,
): Promise<LogLine[]> {
  const logFiles = await findAllLogs(logDir);
  if (logFiles.length === 0) return [];

  const allLines: LogLine[] = [];

  for (const logPath of logFiles) {
    try {
      const content = await readFile(logPath, "utf-8");
      for (const raw of content.split("\n")) {
        const line = parseLogLine(raw);
        if (!line) continue;
        // Skip PROMPT (huge) and INFO startup lines
        if (line.level === "PROMPT") continue;
        if (
          line.level === "INFO" &&
          line.message.startsWith("Starting claudefn")
        )
          continue;
        if (line.level === "INFO" && line.message.startsWith("Timeout="))
          continue;
        allLines.push(line);
      }
    } catch {
      /* skip unreadable files */
    }
  }

  // Return last N lines chronologically
  return allLines.slice(-maxLines);
}

/** Return the most-recently modified `.log` file in `logDir`, or null. */
async function findLatestLog(logDir: string): Promise<string | null> {
  const files = await findAllLogs(logDir);
  return files.length > 0 ? files[files.length - 1] : null;
}

/** Format a duration in seconds as "Xm Ys" or "Zs". */
function fmtDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Format "Ns ago" / "just now". */
function fmtAgo(ts: Date): string {
  const secs = Math.floor((Date.now() - ts.getTime()) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s ago`;
}

/** Truncate a message to fit on one terminal line. */
function truncate(s: string, max = 100): string {
  const single = s.replace(/\r?\n[\s\S]*/g, " ↵…"); // collapse multiline
  if (single.length <= max) return single;
  return single.slice(0, max - 1) + "…";
}

/**
 * Classify an error from agentfn into a human-readable diagnosis.
 * Returns a short status string and optional hint for the operator.
 */
export function classifyAgentError(err: Error): {
  type:
    | "crash"
    | "timeout"
    | "api-error"
    | "config-error"
    | "mcp-error"
    | "unknown";
  summary: string;
  hint: string;
} {
  const msg = err.message ?? "";

  // Missing MCP tools (configuration error, not retryable)
  if (msg.includes("Missing required MCP tools")) {
    return {
      type: "config-error",
      summary: "Missing required MCP tools",
      hint: "Configure MCP servers in Claude desktop config. See error message above for example configuration.",
    };
  }

  // MCP server errors (not retryable)
  if (msg.includes("MCP")) {
    if (msg.includes("timeout")) {
      return {
        type: "mcp-error",
        summary: "MCP server timeout",
        hint: "The MCP server did not respond. Check if the server is running and accessible. For HTTP servers, verify the URL and network connectivity.",
      };
    }
    if (msg.includes("connection failed")) {
      return {
        type: "mcp-error",
        summary: "MCP server connection failed",
        hint: "Cannot connect to MCP server. Check server URL, network connectivity, and firewall settings.",
      };
    }
    if (msg.includes("authentication failed")) {
      return {
        type: "mcp-error",
        summary: "MCP server authentication failed",
        hint: "Invalid API key or credentials. Check your MCP server configuration and API key.",
      };
    }
    if (msg.includes("endpoint not found")) {
      return {
        type: "mcp-error",
        summary: "MCP server endpoint not found",
        hint: "The MCP server URL is incorrect. Verify the server URL in your configuration.",
      };
    }
    return {
      type: "mcp-error",
      summary: "MCP server error",
      hint: "An error occurred with the MCP server. Check the error message above for details.",
    };
  }

  // Content filtering / API-level errors (not retryable — same content will always be blocked)
  if (msg.includes("content filtering") || msg.includes("Output blocked")) {
    return {
      type: "api-error",
      summary: "Output blocked by content filtering policy",
      hint: "The AI's output was blocked by the API content filter. The task content may need to be provided as a static template instead of generated.",
    };
  }

  // API errors returned in the result (e.g. "API Error: 400 ...")
  if (msg.startsWith("API Error")) {
    return {
      type: "api-error",
      summary: msg.slice(0, 120),
      hint: "The API returned an error. Check the error details above.",
    };
  }

  // Process terminated unexpectedly (code=null) is a crash
  if (msg.includes("terminated unexpectedly")) {
    return {
      type: "crash",
      summary: "Process terminated unexpectedly (exit code null)",
      hint: "The Claude process was killed or crashed. Try running `claude --version` to verify it works. Antivirus or system resource limits may be the cause.",
    };
  }

  // Windows DLL / binary crash (exit code > 2^31 unsigned = STATUS_* codes)
  const exitMatch = msg.match(/exit(?:ed)? with exit code (\d+)/i);
  if (exitMatch) {
    const code = Number(exitMatch[1]);
    // Signed interpretation of uint32
    const signed = code > 2147483647 ? code - 4294967296 : code;
    // Common Windows STATUS codes
    const codeNames: Record<number, string> = {
      [-1073741510]: "CTRL_C (STATUS_CONTROL_C_EXIT)",
      [-1073740791]: "STATUS_STACK_BUFFER_OVERRUN",
      [-1073741502]: "STATUS_DLL_INIT_FAILED",
      3: "abort() called",
    };
    const codeName =
      codeNames[signed] ?? `0x${(code >>> 0).toString(16).toUpperCase()}`;
    if (signed < 0 || code > 255 || code === 3) {
      return {
        type: "crash",
        summary: `Process crashed: exit ${code} (${codeName})`,
        hint: "The Claude binary crashed. Try running `claude --version` in your shell to verify it works. Antivirus or a corrupted binary may be the cause.",
      };
    }
    return {
      type: "crash",
      summary: `Process exited with code ${code}`,
      hint: `Unexpected exit. Check if Claude CLI is installed correctly.`,
    };
  }

  // Startup hang (MCP connection issue)
  if (
    msg.includes("startup timeout") ||
    msg.includes("hung on startup") ||
    msg.includes("MCP server connection")
  ) {
    return {
      type: "mcp-error",
      summary: "Claude CLI hung on startup - MCP server connection issue",
      hint: "Claude CLI is trying to connect to an MCP server but it's not responding. Check if HTTP MCP servers are accessible, or temporarily remove them from config to isolate the issue.",
    };
  }

  // Idle timeout
  if (
    msg.includes("timed out") ||
    msg.includes("idle") ||
    msg.includes("inactivity")
  ) {
    return {
      type: "timeout",
      summary: "Claude API idle timeout (no response within 5 min)",
      hint: "Possible causes: large prompt, API overload, skill tool not available. Check the log file for the last prompt sent.",
    };
  }

  // API/network error
  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("network") ||
    msg.includes("fetch")
  ) {
    return {
      type: "api-error",
      summary: `Network error: ${msg.slice(0, 80)}`,
      hint: "Check network connectivity and Claude API availability.",
    };
  }

  return { type: "unknown", summary: msg.slice(0, 120), hint: "" };
}

// NOTE: resolveAIConfig and listAIProviders are now exported from ../ai/factory.ts
// Re-export them here for backward compatibility
export {
  resolveAIConfig,
  listAIProviders,
  type ResolvedAIConfig,
} from "../ai/factory.ts";

/* ------------------------------------------------------------------ */
/*  Heartbeat                                                          */
/* ------------------------------------------------------------------ */

/**
 * Print a rich heartbeat block: elapsed time + last N log lines.
 * Runs async-fire-and-forget inside setInterval.
 */
async function printHeartbeat(opts: {
  start: number;
  logDir: string;
  runLabel: string;
  label?: string;
}): Promise<void> {
  const { start, logDir, runLabel, label } = opts;
  const elapsed = fmtDuration(Date.now() - start);

  const logPath = await findLatestLog(logDir);
  const lines = await readLogTailAll(logDir, 4);

  const divider = "   " + "─".repeat(60);
  console.log(divider);

  // Header line
  const parts = [`⏳ ${elapsed}`, runLabel];
  if (label) parts.push(label);
  console.log(`   ${parts.join("  │  ")}`);

  if (lines.length === 0) {
    console.log(`   📋 No log activity yet — AI is initializing...`);
  } else {
    const lastLine = lines[lines.length - 1];
    // Detect crash: last event is EXIT with non-zero code
    const lastExit = lines
      .slice()
      .reverse()
      .find((l: (typeof lines)[number]) => l.level === "EXIT");
    const isCrash = lastExit && /exit code [1-9]/.test(lastExit.message);
    if (isCrash) {
      const info = classifyAgentError(new Error(lastExit.message));
      console.log(`   ❌ ${info.summary}`);
      if (info.hint) console.log(`   💡 ${info.hint}`);
    } else {
      console.log(`   📋 Last activity ${fmtAgo(lastLine.timestamp)}:`);
      for (const l of lines) {
        const levelIcon: Record<string, string> = {
          STDOUT: "▸",
          STDERR: "⚠",
          TOOL: "🔧",
          EXIT: "✓",
          TIMEOUT: "⌛",
          ERROR: "✗",
          INFO: "·",
        };
        const icon = levelIcon[l.level] ?? "·";
        console.log(`      ${icon} [${l.level}] ${truncate(l.message)}`);
      }
    }
  }

  if (logPath) {
    console.log(`   📂 Log: ${logPath}`);
  }

  console.log(divider);
}

/* ------------------------------------------------------------------ */
/*  Journal helpers                                                    */
/* ------------------------------------------------------------------ */

export async function logAgentStart(
  projectDir: string,
  ctx: JournalContext | undefined,
  phase: string,
  description: string,
): Promise<void> {
  if (!ctx) return;
  await logTaskEvent(
    projectDir,
    ctx.epicId,
    ctx.taskId,
    "CLAUDEFN_START",
    `claudefn ${phase}: ${description}`,
    { phase },
  );
}

export async function logAgentComplete(
  projectDir: string,
  ctx: JournalContext | undefined,
  phase: string,
  result: AgentFnResult<unknown>,
): Promise<void> {
  if (!ctx) return;
  await logTaskEvent(
    projectDir,
    ctx.epicId,
    ctx.taskId,
    "CLAUDEFN_COMPLETE",
    `claudefn ${phase} completed in ${result.durationMs}ms`,
    {
      phase,
      durationMs: result.durationMs,
      sessionId: result.sessionId,
      outputSnippet: tailString(result.raw, 500),
    },
  );
}

export async function logAgentFailed(
  projectDir: string,
  ctx: JournalContext | undefined,
  phase: string,
  error: Error,
  logPath?: string,
): Promise<void> {
  if (!ctx) return;

  let logTail = "";
  if (logPath) {
    try {
      const content = await readFile(logPath, "utf-8");
      logTail = content.split("\n").slice(-30).join("\n");
    } catch {
      /* log file may not exist */
    }
  }

  await logTaskEvent(
    projectDir,
    ctx.epicId,
    ctx.taskId,
    "CLAUDEFN_FAILED",
    `claudefn ${phase} failed: ${error.message}`,
    { phase, error: error.message, logPath, logTail },
  );
}

/* ------------------------------------------------------------------ */
/*  MCP Tool Validation                                                */
/* ------------------------------------------------------------------ */

/**
 * Extract MCP tool prefixes from allowedTools array.
 * Example: ["stitch*:*", "Read", "Write"] => ["stitch"]
 */
function extractMcpPrefixes(allowedTools?: string[]): string[] {
  if (!allowedTools) return [];

  const mcpPrefixes = new Set<string>();
  for (const tool of allowedTools) {
    // MCP tools follow pattern: "prefix*:*" or "mcp__prefix__*"
    const wildcardMatch = tool.match(/^([a-z-]+)\*:/);
    const mcpMatch = tool.match(/^mcp__([a-z-]+)__/);

    if (wildcardMatch) {
      mcpPrefixes.add(wildcardMatch[1]);
    } else if (mcpMatch) {
      mcpPrefixes.add(mcpMatch[1]);
    }
  }

  return Array.from(mcpPrefixes);
}

/**
 * Check if required MCP tools are available by parsing MCP config files.
 * Checks both project-local (.mcp.json) and Claude desktop config.
 * Returns an array of missing tool prefixes (e.g., ["stitch"]) or empty if all available.
 */
export async function checkMcpToolsAvailable(
  requiredPrefixes: string[],
  projectDir?: string,
): Promise<string[]> {
  if (requiredPrefixes.length === 0) return [];

  const availableServers = new Set<string>();

  // 1. Check project-local .mcp.json (highest priority)
  if (projectDir) {
    const localConfigPath = join(projectDir, ".mcp.json");
    if (existsSync(localConfigPath)) {
      try {
        const configContent = await readFile(localConfigPath, "utf-8");
        const config = JSON.parse(configContent);
        const servers = config.mcpServers || {};
        Object.keys(servers).forEach((s) => availableServers.add(s));
      } catch {
        // Ignore parse errors
      }
    }
  }

  // 2. Check Claude desktop config (fallback)
  try {
    const { homedir } = await import("node:os");
    const configPath = join(
      homedir(),
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json",
    );

    if (existsSync(configPath)) {
      const configContent = await readFile(configPath, "utf-8");
      const config = JSON.parse(configContent);
      const servers = config.mcpServers || {};
      Object.keys(servers).forEach((s) => availableServers.add(s));
    }
  } catch {
    // Ignore if we can't read the desktop config
  }

  // Check if any required prefix matches an available server
  const missing = requiredPrefixes.filter((prefix) => {
    return !Array.from(availableServers).some(
      (server) => server === prefix || server.startsWith(prefix + "-"),
    );
  });

  return missing;
}

/* ------------------------------------------------------------------ */
/*  AgentRunOptions                                                    */
/* ------------------------------------------------------------------ */

export interface AgentRunOptions {
  /** Human-readable phase name used in journal events and console output. */
  phase: string;
  /** Full prompt text. */
  prompt: string;
  /** agentfn options (schema, allowedTools, timeoutMs, etc.) */
  agentOptions: Omit<AgentFnOptions<unknown>, "prompt" | "cwd" | "logDir">;
  projectDir: string;
  journalCtx?: JournalContext;
  /** Short label for the heartbeat line (e.g. task title). */
  label?: string;
  /** Skill name to show in console. */
  skillName?: string;
  /** Agent name to show in console. */
  agentName?: string;
  /** How often to print the heartbeat (default: 60s). */
  heartbeatIntervalMs?: number;
}

/* ------------------------------------------------------------------ */
/*  runAgent                                                           */
/* ------------------------------------------------------------------ */

/**
 * Execute an AI call with rich heartbeat logging.
 * Returns the raw AgentFnResult on success, throws on error.
 */
export async function runAgent<T = unknown>(
  opts: AgentRunOptions,
): Promise<AgentFnResult<T>> {
  const {
    phase,
    prompt,
    agentOptions,
    projectDir,
    journalCtx,
    label,
    skillName,
    agentName,
    heartbeatIntervalMs = 60_000,
  } = opts;
  const logDir = getAgentLogDir(projectDir, journalCtx);

  // Check for project-local MCP config and add to CLI flags
  // Note: HTTP-based MCP servers (type: "http") must be configured in Claude desktop config
  // as --mcp-config only works reliably with command-based servers
  const projectMcpConfig = join(projectDir, ".mcp.json");
  const cliFlags = [...(agentOptions.cliFlags || [])];
  // MCP disabled - causing Claude CLI to hang on startup
  // if (existsSync(projectMcpConfig)) {
  //   try {
  //     const configContent = await readFile(projectMcpConfig, 'utf-8');
  //     const config = JSON.parse(configContent);
  //     const servers = config.mcpServers || {};

  //     // Only pass --mcp-config if all servers are command-based (not HTTP)
  //     const hasHttpServers = Object.values(servers).some((s: any) => s.type === 'http');
  //     if (!hasHttpServers) {
  //       // Use --strict-mcp-config to prevent Claude Code from also loading desktop config
  //       cliFlags.push('--strict-mcp-config', '--mcp-config', projectMcpConfig);
  //     }
  //   } catch {
  //     // If we can't parse, skip adding the flag
  //   }
  // }

  // MCP tools precheck: disabled to prevent Claude CLI hanging
  // const mcpPrefixes = extractMcpPrefixes(agentOptions.allowedTools);
  // if (mcpPrefixes.length > 0) {
  //   const missing = await checkMcpToolsAvailable(mcpPrefixes, projectDir);
  //   if (missing.length > 0) {
  //     const runLabel = skillName ? `skill: /${skillName}` : agentName ? `agent: ${agentName}` : 'AI';
  //     console.error(`\n❌ Missing required MCP tools for ${runLabel}`);
  //     console.error(`   Required: ${mcpPrefixes.join(', ')}`);
  //     console.error(`   Missing : ${missing.join(', ')}`);
  //     console.error(`\n💡 To fix: Configure MCP servers in Claude desktop config`);
  //     console.error(`   Location: ~/Library/Application Support/Claude/claude_desktop_config.json`);
  //     console.error(`\n   Note: HTTP-based MCP servers must be in desktop config, not .mcp.json`);
  //     console.error(`\n   Example configuration:`);
  //     console.error(`   {`);
  //     console.error(`     "mcpServers": {`);
  //     for (const tool of missing) {
  //       console.error(`       "${tool}": {`);
  //       console.error(`         "command": "npx",`);
  //       console.error(`         "args": ["-y", "@google/mcp-server-${tool}"]`);
  //       console.error(`       }${missing.indexOf(tool) < missing.length - 1 ? ',' : ''}`);
  //     }
  //     console.error(`     }`);
  //     console.error(`   }`);
  //     console.error('');
  //
  //     const error = new Error(`Missing required MCP tools: ${missing.join(', ')}. Configure MCP servers in Claude desktop config.`);
  //     await logAgentFailed(projectDir, journalCtx, phase, error);
  //     throw error;
  //   }
  // }

  await logAgentStart(projectDir, journalCtx, phase, label ?? phase);

  // Console header
  const runLabel = skillName
    ? `skill: /${skillName}`
    : agentName
      ? `agent: ${agentName}`
      : "AI";
  console.log(`\n🤖 Running ${runLabel}`);
  if (label) console.log(`   Task  : ${label}`);
  console.log(`   Phase : ${phase}`);
  console.log(`   Logs  : ${logDir}`);

  // Show prompt preview if available
  if (prompt && prompt.length > 0) {
    const promptLines = prompt.split("\n").length;
    const promptChars = prompt.length;
    console.log(`   Prompt: ${promptLines} lines, ${promptChars} chars`);
  }

  console.log("");

  const start = Date.now();
  const heartbeatOpts = { start, logDir, runLabel, label };

  // DISABLED: Timer-based heartbeat (replaced by event-driven logging)
  // Fire first heartbeat after the interval, then repeat
  const heartbeat: NodeJS.Timeout | null = null;
  // const heartbeat = setInterval(() => {
  //   void printHeartbeat(heartbeatOpts);
  // }, heartbeatIntervalMs);

  // Start real-time log streaming using tail -f
  const logTailer = new SimpleLogTailer(logDir, {
    showToolCalls: true,
    showReasoning: false, // Set to true for verbose AI thinking
    showResults: true,
  });

  try {
    // Start tailing logs (disabled for kimi - may cause hang)
    if ((agentOptions as any).provider !== "kimi") {
      await logTailer.start();
    } else {
      console.log(`   [runAgent] Log tailing disabled for kimi`);
    }
    // Get AgentManager instance
    const agentManager = AgentManager.getInstance();

    const skillDirsDebug = (agentOptions as AgentFnOptions<T>).skillDirs;
    console.log(
      `   🔍 skillDirs: ${skillDirsDebug ? Object.keys(skillDirsDebug).join(", ") || "(empty)" : "(not set)"}`,
    );

    // Load AI configuration from project.yaml or PROJECT.md
    let resolvedAI: import("../ai/factory.ts").ResolvedAIConfig | null = null;
    let availableProviders: string[] = [];
    let aiConfigSource = "default";
    let loadError: string | null = null;

    try {
      // Try project.yaml first (V2 storage-based config)
      const convergeDir = join(projectDir, ".converge");
      const projectYamlPath = join(convergeDir, "project.yaml");

      if (existsSync(projectYamlPath)) {
        const storage = new FilesystemStorage(convergeDir);
        const projectConfig = storage.readProject();

        if (projectConfig.ai) {
          aiConfigSource = "project.yaml";
          // Debug: log the actual structure of the ai config
          const aiConfigDebug = projectConfig.ai as any;
          console.log(
            `   📋 AI config type: ${aiConfigDebug.default ? "multi-provider" : "single-provider"}`,
          );
          console.log(
            `   📋 AI config keys: ${Object.keys(aiConfigDebug).join(", ")}`,
          );
          if (aiConfigDebug.providers) {
            console.log(
              `   📋 Providers: ${Object.keys(aiConfigDebug.providers).join(", ")}`,
            );
          }

          availableProviders = listAIProviders(projectConfig.ai);
          const preferredProvider = agentOptions.provider as string | undefined;
          resolvedAI = resolveAIConfig(projectConfig.ai, preferredProvider);

          if (!resolvedAI) {
            loadError = `Could not resolve AI config from project.yaml (providers: ${availableProviders.join(", ")})`;
          }
        } else {
          loadError = "No ai section found in project.yaml";
        }
      } else {
        loadError = `project.yaml not found at ${projectYamlPath}`;
      }

      // Fall back to PROJECT.md (playbook-based config)
      if (!resolvedAI) {
        const projectMdPath = join(convergeDir, "PROJECT.md");
        if (existsSync(projectMdPath)) {
          try {
            const convergeConfig = await loadConvergeConfig(projectMdPath);

            if (convergeConfig.ai) {
              aiConfigSource = "PROJECT.md";
              availableProviders = listAIProviders(convergeConfig.ai as any);
              const preferredProvider = agentOptions.provider as
                | string
                | undefined;
              resolvedAI = resolveAIConfig(
                convergeConfig.ai as any,
                preferredProvider,
              );

              if (!resolvedAI) {
                loadError = `Could not resolve AI config from PROJECT.md (providers: ${availableProviders.join(", ")})`;
              }
            } else if (!loadError) {
              loadError = "No ai section found in PROJECT.md";
            }
          } catch (mdErr: any) {
            if (!loadError)
              loadError = `Failed to load PROJECT.md: ${mdErr.message}`;
          }
        } else if (!loadError) {
          loadError = `PROJECT.md not found at ${projectMdPath}`;
        }
      }

      if (resolvedAI) {
        console.log(
          `   🤖 AI Provider: ${resolvedAI.name} (${resolvedAI.resolvedProvider})${resolvedAI.baseUrl ? ` → ${resolvedAI.baseUrl}` : ""}`,
        );
        console.log(`      Config source: ${aiConfigSource}`);
        if (availableProviders.length > 1) {
          const preferredProvider = agentOptions.provider as string | undefined;
          console.log(
            `      Available providers: ${availableProviders.join(", ")}${!preferredProvider ? " (using default)" : ""}`,
          );
        }
      } else {
        console.warn(
          `   ⚠️  ${loadError || "AI configuration missing provider field"}`,
        );
      }
    } catch (err: any) {
      // Ignore config loading errors - use defaults
      console.warn(`   ⚠️  Failed to load AI config: ${err.message}`);
    }

    // Set environment variables from config (for Claude CLI with custom backends like Kimi)
    const envBackup: Record<string, string | undefined> = {};
    if (resolvedAI?.env) {
      console.log(
        `   🔧 Setting env vars: ${Object.keys(resolvedAI.env).join(", ")}`,
      );
      for (const [key, value] of Object.entries(resolvedAI.env)) {
        envBackup[key] = process.env[key];
        process.env[key] = value;
      }
    }

    const agentOpts: Record<string, unknown> = {
      ...(agentOptions as AgentFnOptions<T>),
      prompt,
      cwd: projectDir,
      logDir,
      // cliFlags DISABLED - may be causing hang with kimi
      // cliFlags,
      // Apply AI configuration from project config (if not overridden in agentOptions)
      // Use resolvedProvider which is the actual provider type (acp, claude, kimi, etc.)
      ...(resolvedAI?.resolvedProvider && !agentOptions.provider
        ? { provider: resolvedAI.resolvedProvider }
        : {}),
      ...(resolvedAI?.apiKey && !agentOptions.apiKey
        ? { apiKey: resolvedAI.apiKey }
        : {}),
      ...(resolvedAI?.baseUrl && !agentOptions.baseUrl
        ? { baseUrl: resolvedAI.baseUrl }
        : {}),
      ...(resolvedAI?.model && !agentOptions.model
        ? { model: resolvedAI.model }
        : {}),
      ...(resolvedAI?.timeoutMs && !agentOptions.timeoutMs
        ? { timeoutMs: resolvedAI.timeoutMs }
        : {}),
      ...(resolvedAI?.maxRetries && !agentOptions.maxRetries
        ? { maxRetries: resolvedAI.maxRetries }
        : {}),
      // Hook to register process with AgentManager (disabled for kimi)
      ...(agentOptions.provider !== "kimi"
        ? {
            onProcessSpawned: (
              proc: import("node:child_process").ChildProcess,
              logPath: string,
            ) => {
              if (proc.pid) {
                agentManager.register(proc, {
                  sessionId: proc.pid.toString(),
                  logPath,
                  command: "claude",
                  args: [],
                  cwd: projectDir,
                  convergeMetadata: {
                    projectDir,
                    epicId: journalCtx?.epicId,
                    taskId: journalCtx?.taskId,
                    phase: phase as "analysis" | "execution" | "verification",
                    strategyType: agentName || phase,
                  },
                });
              }
            },
          }
        : {}),
    };
    try {
      const executor = agentfn<T>(agentOpts as AgentFnOptions<T>);
      const result = await executor();
      if (heartbeat) clearInterval(heartbeat);

      // Stop log tailing (only if started)
      if ((agentOptions as any).provider !== "kimi") {
        logTailer.stop();
      }

      await logAgentComplete(projectDir, journalCtx, phase, result);

      console.log(`\n✅ Done in ${fmtDuration(result.durationMs)}`);
      return result;
    } catch (err: any) {
      if (heartbeat) clearInterval(heartbeat);

      // Stop log tailing (only if started)
      if ((agentOptions as any).provider !== "kimi") {
        logTailer.stop();
      }

      // Classify and surface the error clearly
      const diagnosis = classifyAgentError(err);
      console.error(
        `\n❌ Agent failed [${diagnosis.type}]: ${diagnosis.summary}`,
      );
      if (diagnosis.hint) console.error(`   💡 ${diagnosis.hint}`);

      const logPath = await findLatestLog(logDir);
      await logAgentFailed(
        projectDir,
        journalCtx,
        phase,
        err,
        logPath ?? undefined,
      );
      throw err;
    } finally {
      // Restore environment variables
      for (const [key, value] of Object.entries(envBackup)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  } catch (err: any) {
    // Handle any errors from the outer try block (log tailer startup, etc.)
    console.error(`\n❌ Agent execution failed: ${err.message}`);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function tailString(s: string, maxLen: number): string {
  if (!s || s.length <= maxLen) return s ?? "";
  return "...[truncated]\n" + s.slice(-maxLen);
}
