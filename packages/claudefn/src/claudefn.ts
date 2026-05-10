import { spawn, execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  writeFileSync,
  unlinkSync,
  mkdirSync,
  appendFileSync,
  existsSync,
  readFileSync,
  statSync,
  readdirSync,
} from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import type {
  ClaudeFnOptions,
  ClaudeFnResult,
  ClaudeFn,
  PromptInput,
} from "./types.js";
import { GlobalQueue, getDefaultQueue } from "./queue.js";
import type { GlobalQueueOptions } from "./queue.js";
import { extractJson, resolvePrompt } from "./utils.js";

// ─── Crash Detection ──────────────────────────────────────────

/** Returns true if the error looks like a process crash (not a logical failure). */
function isCrashError(err: Error): boolean {
  const msg = err.message ?? "";

  // Process terminated unexpectedly (code=null) is a crash
  if (msg.includes("terminated unexpectedly")) return true;

  const exitMatch = msg.match(/exit(?:ed)? with exit code (\d+)/i);
  if (exitMatch) {
    const code = Number(exitMatch[1]);
    // Signed interpretation of uint32
    const signed = code > 2147483647 ? code - 4294967296 : code;
    // STATUS_DLL_INIT_FAILED, STATUS_STACK_BUFFER_OVERRUN, CTRL_C, abort(), etc.
    if (signed < 0 || code > 255 || code === 3) return true;
  }
  // Abort signal is not a crash — don't retry
  if (msg.includes("aborted via signal")) return false;
  return false;
}

/** Sleep for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Log File Helpers ──────────────────────────────────────────

/** Resolve (and create) the log directory, return the log file path */
function createLogFile(
  cwd: string | undefined,
  sessionId: string,
  logDir?: string,
): string {
  if (!logDir) {
    throw new Error(
      "logDir is required - claudefn no longer uses a default log directory",
    );
  }
  mkdirSync(logDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return join(logDir, `${ts}_${sessionId.slice(0, 8)}.log`);
}

function appendLog(logPath: string, prefix: string, data: string): void {
  try {
    const timestamp = new Date().toISOString();
    appendFileSync(logPath, `[${timestamp}] [${prefix}] ${data}`);
  } catch {
    // Best-effort logging — never crash the main flow
  }
}

/** Append a compact JSONL index entry for high-level progress tracking */
function appendIndexLog(
  logPath: string,
  entry: {
    ts: string;
    type: string;
    event: string;
    data?: any;
    duration_ms?: number;
    line_start?: number;
    line_end?: number;
  },
): void {
  try {
    const indexPath = logPath.replace(".log", ".index.jsonl");
    appendFileSync(indexPath, JSON.stringify(entry) + "\n");
  } catch {
    // Best-effort logging
  }
}

/** Resolve the queue option to a GlobalQueue instance or null */
function resolveQueue(option: ClaudeFnOptions["queue"]): GlobalQueue | null {
  if (!option) return null;
  if (option === true) return getDefaultQueue();
  if (option instanceof GlobalQueue) return option;
  return getDefaultQueue(option as GlobalQueueOptions);
}

/**
 * Create a callable function backed by the Claude Code CLI.
 *
 * Spawns `claude --dangerously-skip-permissions -p "..."` and returns the result.
 *
 * @example
 * ```typescript
 * const fn = claudefn({ prompt: "Translate {{input}} to French" });
 * const { data } = await fn("hello");
 * ```
 */
export function claudefn<T = string>(
  options?: ClaudeFnOptions<T>,
): ClaudeFn<T> {
  const opts = options ?? ({} as ClaudeFnOptions<T>);

  const {
    prompt: promptTemplate,
    schema,
    hooks,
    timeoutMs = 600_000,
    wallClockTimeoutMs = Math.max(timeoutMs * 2, 900_000),
    meaningfulActivityTimeoutMs = Math.min(timeoutMs, 90_000),
    cliFlags = [],
    maxRetries = 0,
    cwd,
    queue: queueOption,
    allowedTools,
    mode = "call",
    systemPrompt,
    systemPromptFile,
    signal,
    logDir,
    onProcessSpawned,
    enableMCP = false,
    env: customEnv,
  } = opts;

  const queue = resolveQueue(queueOption);

  return async (input?: string): Promise<ClaudeFnResult<T>> => {
    let attempt = 0;
    let lastError: Error | undefined;

    // Crash retry: disabled because spawn-runner.ts handles crash retries with proper
    // journal logging. If claudefn is used standalone (outside converge), crashes will
    // fail immediately without retry. For converge usage, spawn-runner provides 3 retries.
    const crashRetryLimit = 0;
    let crashRetries = 0;

    while (attempt <= maxRetries || crashRetries < crashRetryLimit) {
      attempt++;
      try {
        const run = () =>
          executeViaCli(
            promptTemplate,
            input,
            schema,
            hooks,
            timeoutMs,
            wallClockTimeoutMs,
            meaningfulActivityTimeoutMs,
            cliFlags,
            cwd,
            allowedTools,
            mode,
            systemPrompt,
            signal,
            systemPromptFile,
            logDir,
            onProcessSpawned,
            enableMCP,
            customEnv,
          );
        return queue ? await queue.wrap(run) : await run();
      } catch (err: unknown) {
        lastError = err as Error;

        // If aborted externally, don't retry at all
        if (signal?.aborted) break;

        const crash = isCrashError(lastError);

        if (crash && crashRetries < crashRetryLimit) {
          crashRetries++;
          const delayMs = Math.min(1000 * Math.pow(2, crashRetries - 1), 8000); // 1s, 2s, 4s, 8s
          console.warn(
            `   ❌ Process crashed (attempt ${crashRetries}/${crashRetryLimit})`,
          );
          console.warn(`   ⏳ Retrying in ${delayMs / 1000}s...`);
          await sleep(delayMs);
          continue;
        }

        // Normal retry budget (for non-crash errors)
        if (!crash && attempt <= maxRetries) continue;

        break;
      }
    }

    throw lastError!;
  };
}

// ─── CLI Execution ──────────────────────────────────────────

export async function executeViaCli<T>(
  promptTemplate: PromptInput | undefined,
  input: string | undefined,
  schema: ClaudeFnOptions<T>["schema"],
  hooks: ClaudeFnOptions<T>["hooks"],
  timeoutMs: number,
  wallClockTimeoutMs: number,
  meaningfulActivityTimeoutMs: number,
  cliFlags: string[],
  cwd: string | undefined,
  allowedTools: string[] | undefined,
  mode: ClaudeFnOptions<T>["mode"] = "call",
  systemPrompt?: string,
  signal?: AbortSignal,
  systemPromptFile?: string,
  logDir?: string,
  onProcessSpawned?: (proc: any, logPath: string) => void,
  enableMCP = false,
  customEnv?: Record<string, string>,
): Promise<ClaudeFnResult<T>> {
  let prompt: string;
  if (promptTemplate) {
    prompt = resolvePrompt(promptTemplate, input);
  } else if (input != null) {
    prompt = input;
  } else {
    throw new Error(
      'claudefn requires either a "prompt" option or an input argument',
    );
  }

  // If schema is provided, append JSON output instructions to the prompt
  if (schema) {
    // Try to extract field names from the Zod schema
    let schemaStructure = "";
    try {
      // For Zod object schemas, get the shape
      const schemaShape = (schema as any)._def?.shape?.();
      if (schemaShape) {
        const fields = Object.keys(schemaShape);
        schemaStructure = JSON.stringify(
          Object.fromEntries(
            fields.map((key) => {
              const field = schemaShape[key];
              const typeName = field._def?.typeName;
              // Get description or type name
              let value = `<${typeName || "value"}>`;
              if (field._def?.description) {
                value = field._def.description;
              }
              return [key, value];
            }),
          ),
          null,
          2,
        );
      }
    } catch {
      // Fall back if schema introspection fails
      schemaStructure = '{\n  "field": "value"\n}';
    }

    prompt = `${prompt}

IMPORTANT: You MUST respond with valid JSON matching this EXACT structure.
Do NOT add extra fields. Do NOT add explanatory text outside the JSON.

Required JSON structure:
\`\`\`json
${schemaStructure}
\`\`\`

Return ONLY the JSON object inside a code fence. After the JSON, you may include a brief explanation if needed.`;
  }

  // before hook
  if (hooks?.before) {
    const modified = await hooks.before({ prompt });
    if (typeof modified === "string") {
      prompt = modified;
    }
  }

  const start = Date.now();

  // Always use stream mode to get thinking blocks and real-time progress
  const useStream = true;

  // Generate a session ID so we can resume this conversation later
  // Note: --session-id expects a pure UUID, not prefixed with "session-"
  const sessionId = randomUUID();

  // User prompt is always piped via stdin — no size limit there.
  // System prompt: on Windows we use shell:true, so the cmd line limit is ~8191
  // chars and special characters break the arg. Always write to a temp file
  // on Windows; on other platforms only do so when > 30 000 chars.
  const SAFE_ARG_LIMIT = process.platform === "win32" ? 0 : 30_000;
  let tempSystemPromptFile: string | undefined;
  let tempMcpConfigFile: string | undefined;

  // Resolve system prompt file: explicit file takes priority,
  // then fall back to writing a temp file when inline is unsafe.
  let resolvedSystemPromptFile = systemPromptFile;
  if (
    !resolvedSystemPromptFile &&
    systemPrompt &&
    systemPrompt.length > SAFE_ARG_LIMIT
  ) {
    tempSystemPromptFile = join(tmpdir(), `claudefn-sysprompt-${sessionId}.md`);
    writeFileSync(tempSystemPromptFile, systemPrompt, "utf-8");
    resolvedSystemPromptFile = tempSystemPromptFile;
  }

  // Disable MCP servers by default to prevent tool confusion
  // Claude will use built-in CLI tools (Bash, Read, Write, etc.) and skills
  // Set enableMCP: true in task options if MCP tools are explicitly needed
  let mcpConfigPath: string | undefined;
  if (!enableMCP) {
    tempMcpConfigFile = join(tmpdir(), `claudefn-mcp-${sessionId}.json`);
    writeFileSync(tempMcpConfigFile, '{"mcpServers":{}}', "utf-8");
    mcpConfigPath = tempMcpConfigFile;
  }

  const args = [
    "--dangerously-skip-permissions",
    // Prompt is piped via stdin to avoid CLI arg length limits
    "-p",
    // Don't use --session-id with --no-session-persistence (causes conflicts)
    // Let Claude CLI generate its own session ID
    // Disable session persistence to avoid "session already in use" errors
    "--no-session-persistence",
    // MCP bypass: Use --strict-mcp-config with empty config to prevent loading
    // MCP servers from desktop config (which can cause HTTP connection timeouts)
    ...(mcpConfigPath
      ? ["--strict-mcp-config", "--mcp-config", mcpConfigPath]
      : []),
    // System prompt: prefer file-based delivery to avoid CLI arg limits
    ...(resolvedSystemPromptFile
      ? ["--append-system-prompt-file", resolvedSystemPromptFile]
      : systemPrompt
        ? ["--append-system-prompt", systemPrompt]
        : []),
    ...(useStream ? ["--output-format", "stream-json", "--verbose"] : []),
    // NEVER pass --allowedTools flag to avoid MCP connection delays
    // ...(allowedTools?.length
    //   ? ["--allowedTools", allowedTools.join(",")]
    //   : []),
    ...cliFlags,
  ];

  // Set up log file for this execution
  const logPath = createLogFile(cwd, sessionId, logDir);
  const startTime = Date.now();

  appendLog(logPath, "INFO", `Starting claudefn session=${sessionId}\n`);
  appendLog(
    logPath,
    "INFO",
    `Timeout=${timeoutMs}ms (activity-based idle timeout); wallClockTimeout=${wallClockTimeoutMs}ms; meaningfulActivityTimeout=${meaningfulActivityTimeoutMs}ms\n`,
  );
  appendLog(logPath, "CMD", `claude ${args.join(" ")}\n`);
  appendLog(
    logPath,
    "PROMPT",
    `${prompt.slice(0, 500)}${prompt.length > 500 ? "...[truncated]" : ""}\n`,
  );

  // Index: Session started
  appendIndexLog(logPath, {
    ts: new Date().toISOString(),
    type: "session",
    event: "started",
    data: { session_id: sessionId, timeout_ms: timeoutMs, wall_clock_timeout_ms: wallClockTimeoutMs, meaningful_activity_timeout_ms: meaningfulActivityTimeoutMs },
  });

  const raw = await new Promise<string>((resolve, reject) => {
    const onStream = hooks?.onStream;

    /** Emit a formatted chunk to the onStream callback */
    const emit = (text: string): void => {
      if (text) onStream?.(text);
    };

    /** Counters for index summary */
    let toolUseCount = 0;
    let thinkingBlockCount = 0;
    let textBlockCount = 0;

    /** Parse one stream-json event and log ALL blocks to file */
    const handleEvent = (event: any): void => {
      // Log the raw event for debugging
      appendLog(logPath, "STREAM_EVENT", JSON.stringify(event) + "\n");

      if (event.type === "assistant" || event.type === "user" || event.type === "result") {
        hasMeaningfulActivity = true;
        clearTimeout(meaningfulActivityTimer);
      }

      if (event.type === "assistant" && Array.isArray(event.message?.content)) {
        for (const block of event.message.content) {
          if (block.type === "text" && block.text) {
            appendLog(logPath, "TEXT_BLOCK", block.text + "\n");
            emit(block.text);
            textBlockCount++;

            // Index: Text block with full message for debugging
            appendIndexLog(logPath, {
              ts: new Date().toISOString(),
              type: "output",
              event: "text",
              data: {
                text: block.text.slice(0, 200), // More context
                size: block.text.length,
              },
            });
          } else if (block.type === "thinking" && block.thinking) {
            // Stream thinking/reasoning blocks
            appendLog(logPath, "THINKING", block.thinking + "\n");
            emit(`\n[thinking] ${block.thinking}\n`);
            thinkingBlockCount++;

            // Index: Thinking block with meaningful preview
            appendIndexLog(logPath, {
              ts: new Date().toISOString(),
              type: "thinking",
              event: "reasoning",
              data: {
                text: block.thinking.slice(0, 200), // More context for debugging
                size: block.thinking.length,
              },
            });
          } else if (block.type === "tool_use") {
            const inputStr = JSON.stringify(block.input ?? {}, null, 2);
            appendLog(
              logPath,
              "TOOL_USE",
              `Tool: ${block.name}\nInput: ${inputStr}\n`,
            );
            const inputPreview = inputStr.slice(0, 120);
            emit(`\n[tool:${block.name}] ${inputPreview}\n`);
            toolUseCount++;

            // Index: Tool use with compact input summary
            const input = block.input ?? {};
            const inputSummary: any = {};

            // For common tools, extract key parameters
            if (block.name === "Read" && input.file_path) {
              inputSummary.file = input.file_path;
            } else if (block.name === "Write" && input.file_path) {
              inputSummary.file = input.file_path;
              inputSummary.size = input.content?.length || 0;
            } else if (block.name === "Edit" && input.file_path) {
              inputSummary.file = input.file_path;
              inputSummary.old_len = input.old_string?.length || 0;
              inputSummary.new_len = input.new_string?.length || 0;
            } else if (block.name === "Bash" && input.command) {
              inputSummary.cmd =
                input.command.length > 60
                  ? input.command.slice(0, 60) + "..."
                  : input.command;
            } else if (block.name === "Grep") {
              inputSummary.pattern = input.pattern;
              inputSummary.path = input.path;
            } else if (block.name === "Glob") {
              inputSummary.pattern = input.pattern;
            } else {
              // For other tools, include all params but truncate long values
              for (const [key, value] of Object.entries(input)) {
                if (typeof value === "string" && value.length > 100) {
                  inputSummary[key] = value.slice(0, 100) + "...";
                } else {
                  inputSummary[key] = value;
                }
              }
            }

            appendIndexLog(logPath, {
              ts: new Date().toISOString(),
              type: "tool",
              event: "call",
              data: {
                tool: block.name,
                id: block.id,
                input: inputSummary,
              },
            });
          }
        }
      }
      // Tool results live in user messages
      if (event.type === "user" && Array.isArray(event.message?.content)) {
        for (const block of event.message.content) {
          if (block.type === "tool_result") {
            const resultText = Array.isArray(block.content)
              ? block.content
                  .filter((b: any) => b.type === "text")
                  .map((b: any) => b.text ?? "")
                  .join("")
              : String(block.content ?? "");
            appendLog(logPath, "TOOL_RESULT", resultText + "\n");
            if (resultText) {
              const preview = resultText.slice(0, 200);
              emit(
                `[result] ${preview}${resultText.length > 200 ? "..." : ""}\n`,
              );
            }

            // Index: Tool result with preview for debugging
            const isError = !!block.is_error;
            let resultPreview = "";
            let errorMsg = "";

            if (isError) {
              // For errors, capture the error message
              errorMsg = resultText.slice(0, 200);
            } else {
              // For success, provide a meaningful preview
              resultPreview = resultText.slice(0, 150);
            }

            appendIndexLog(logPath, {
              ts: new Date().toISOString(),
              type: "tool",
              event: "result",
              data: {
                tool_use_id: block.tool_use_id,
                success: !isError,
                size: resultText.length,
                ...(isError ? { error: errorMsg } : { preview: resultPreview }),
              },
            });
          }
        }
      }
      // Capture final result text from the result event
      if (event.type === "result" && typeof event.result === "string") {
        resultText = event.result;
        appendLog(logPath, "FINAL_RESULT", event.result + "\n");
      }
    };

    // Strip Node.js-specific env vars that tsx/ts-node inject.
    // Claude CLI is an Electron app with its own bundled Node.js runtime.
    // Inheriting --experimental-loader, --require, or similar flags from the
    // parent tsx process causes Electron's DLL/V8 init to fail (STATUS_DLL_INIT_FAILED).
    const spawnEnv = { ...process.env };
    delete spawnEnv["NODE_OPTIONS"];
    delete spawnEnv["NODE_PATH"];
    delete spawnEnv["TS_NODE_PROJECT"];
    delete spawnEnv["TS_NODE_FILES"];

    // CRITICAL: Disable Claude CLI background task mode
    // Without this, Claude runs commands in background and writes to temp files
    // instead of stdout, causing claudefn to hang waiting for output
    spawnEnv["CLAUDE_CODE_DISABLE_BACKGROUND_TASKS"] = "1";

    // Merge custom environment variables from config (e.g., for MiniMax API)
    // Custom env vars take precedence over process.env
    if (customEnv) {
      for (const [key, value] of Object.entries(customEnv)) {
        spawnEnv[key] = value;
      }
    }

    const proc = spawn("claude", args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: spawnEnv,
    });

    // Index: Process spawned
    appendIndexLog(logPath, {
      ts: new Date().toISOString(),
      type: "process",
      event: "spawned",
      data: { pid: proc.pid },
    });

    // Call onProcessSpawned hook if provided
    if (onProcessSpawned) {
      onProcessSpawned(proc, logPath);
    }

    // Pipe the prompt via stdin to avoid ENAMETOOLONG on large prompts
    proc.stdin!.write(prompt);
    proc.stdin!.end();

    let stdoutRaw = "";
    let resultText = "";
    let stderr = "";
    let settled = false;
    let lineBuffer = "";

    // Activity-based idle timeout: resets whenever Claude produces output.
    // If no new stdout/stderr arrives within `timeoutMs`, assume Claude is stuck.
    let idleTimer: ReturnType<typeof setTimeout>;
    let wallClockTimer: ReturnType<typeof setTimeout>;
    let meaningfulActivityTimer: ReturnType<typeof setTimeout>;
    let hasInitialActivity = false; // Track if we've seen ANY output
    let hasMeaningfulActivity = false; // assistant/user/result output, not system init

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          clearTimeout(wallClockTimer);
          clearTimeout(meaningfulActivityTimer);
          // Distinguish between startup hang vs runtime idle timeout
          const timeoutMsg = hasInitialActivity
            ? `claudefn idle-timed out after ${timeoutMs}ms of inactivity`
            : `claudefn startup timeout after ${timeoutMs}ms - Claude CLI may be hanging on MCP server connection`;

          appendLog(logPath, "TIMEOUT", timeoutMsg + "\n");

          // Index: Timeout with reason
          appendIndexLog(logPath, {
            ts: new Date().toISOString(),
            type: "error",
            event: "timeout",
            duration_ms: Date.now() - startTime,
            data: {
              reason: hasInitialActivity ? "idle" : "startup",
              message: timeoutMsg,
              timeout_ms: timeoutMs,
            },
          });

          proc.kill();
          reject(new Error(timeoutMsg));
        }
      }, timeoutMs);
    };

    // Startup timeout: 3 minutes for initial response
    // Claude CLI can take 2-3 minutes to load when many skills are present
    // This gives enough time for skill loading + MCP server connections
    const startupTimeoutMs = 180_000;
    const startupTimer = setTimeout(() => {
      if (!hasInitialActivity && !settled) {
        settled = true;
        clearTimeout(idleTimer);
        clearTimeout(wallClockTimer);
        clearTimeout(meaningfulActivityTimer);
        clearInterval(heartbeatInterval);
        const msg = `Claude CLI hung on startup (no output after ${startupTimeoutMs / 1000}s) - likely too many skills or MCP connection issue`;
        appendLog(logPath, "TIMEOUT", msg + "\n");

        // Index: Startup timeout with context
        appendIndexLog(logPath, {
          ts: new Date().toISOString(),
          type: "error",
          event: "startup_timeout",
          duration_ms: startupTimeoutMs,
          data: {
            timeout_s: startupTimeoutMs / 1000,
            message: msg,
            pid: proc.pid,
          },
        });

        proc.kill();
        reject(new Error(msg));
      }
    }, startupTimeoutMs);

    resetIdleTimer(); // start the initial idle timer

    wallClockTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        clearTimeout(idleTimer);
        clearTimeout(startupTimer);
        clearTimeout(meaningfulActivityTimer);
        clearInterval(heartbeatInterval);
        const msg = `claudefn wall-clock timed out after ${wallClockTimeoutMs}ms`;
        appendLog(logPath, "TIMEOUT", msg + "\n");
        appendIndexLog(logPath, {
          ts: new Date().toISOString(),
          type: "error",
          event: "wall_clock_timeout",
          duration_ms: Date.now() - startTime,
          data: { timeout_ms: wallClockTimeoutMs, message: msg, pid: proc.pid },
        });
        proc.kill();
        reject(new Error(msg));
      }
    }, wallClockTimeoutMs);

    meaningfulActivityTimer = setTimeout(() => {
      if (!settled && !hasMeaningfulActivity) {
        settled = true;
        clearTimeout(idleTimer);
        clearTimeout(startupTimer);
        clearTimeout(wallClockTimer);
        clearTimeout(meaningfulActivityTimer);
        clearInterval(heartbeatInterval);
        const msg = `claudefn produced startup output but no model activity after ${meaningfulActivityTimeoutMs}ms`;
        appendLog(logPath, "TIMEOUT", msg + "\n");
        appendIndexLog(logPath, {
          ts: new Date().toISOString(),
          type: "error",
          event: "no_meaningful_activity_timeout",
          duration_ms: Date.now() - startTime,
          data: { timeout_ms: meaningfulActivityTimeoutMs, message: msg, pid: proc.pid },
        });
        proc.kill();
        reject(new Error(msg));
      }
    }, meaningfulActivityTimeoutMs);

    // Heartbeat: Log every 10 seconds to show process is alive (until first output)
    const heartbeatInterval = setInterval(() => {
      if (!hasInitialActivity) {
        const elapsed = Math.floor((Date.now() - start) / 1000);

        // Check if process is still running
        try {
          // process.kill(pid, 0) checks if process exists without killing it
          process.kill(proc.pid!, 0);
          appendLog(
            logPath,
            "HEARTBEAT",
            `Waiting for Claude CLI response... ${elapsed}s elapsed (process alive, PID=${proc.pid})\n`,
          );
        } catch (err) {
          // Process no longer exists
          clearInterval(heartbeatInterval);
          if (!settled) {
            settled = true;
            clearTimeout(idleTimer);
            clearTimeout(startupTimer);
            clearTimeout(wallClockTimer);
            clearTimeout(meaningfulActivityTimer);
            const msg = `Claude CLI process died unexpectedly (PID=${proc.pid} not found after ${elapsed}s)`;
            appendLog(logPath, "ERROR", msg + "\n");

            // Index: Process crashed
            appendIndexLog(logPath, {
              ts: new Date().toISOString(),
              type: "error",
              event: "process_died",
              duration_ms: Date.now() - startTime,
              data: {
                pid: proc.pid,
                elapsed_s: elapsed,
                message: msg,
              },
            });

            reject(new Error(msg));
          }
        }
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 10000);

    proc.stdout!.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      appendLog(logPath, "STDOUT", text);
      if (!hasInitialActivity) {
        hasInitialActivity = true;
        clearTimeout(startupTimer); // Clear startup timeout once we get first output

        // Index: First output received (startup complete)
        const startupDuration = Date.now() - startTime;
        appendIndexLog(logPath, {
          ts: new Date().toISOString(),
          type: "process",
          event: "first_output",
          duration_ms: startupDuration,
        });
      }
      resetIdleTimer(); // activity detected — reset idle timeout

      if (useStream) {
        // Parse as JSONL events and stream text to onStream
        lineBuffer += text;
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            handleEvent(JSON.parse(line));
          } catch {
            /* skip malformed */
          }
        }
      } else {
        stdoutRaw += text;
      }
    });

    proc.stderr!.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      appendLog(logPath, "STDERR", text);
      resetIdleTimer(); // stderr activity also counts
      stderr += text;
    });

    proc.on("close", (code: number | null, exitSignal: string | null) => {
      clearTimeout(idleTimer);
      clearTimeout(startupTimer);
      clearTimeout(wallClockTimer);
      clearTimeout(meaningfulActivityTimer);
      clearInterval(heartbeatInterval);
      if (signal) signal.removeEventListener("abort", onAbort);
      if (settled) return;
      settled = true;

      if (code === 0 || (code === null && resultText)) {
        // Success case. Some Anthropic-compatible Claude Code backends can
        // leave the wrapped CLI without a numeric close code even after a
        // valid stream-json result event has been emitted. Treat a captured
        // final result as successful so proxy transport quirks do not strand
        // autonomous runs after the model already answered.
        appendLog(logPath, "EXIT", `code=${code} (success with result=${Boolean(resultText)})\n`);

        // Index: Session completed successfully
        const totalDuration = Date.now() - startTime;
        appendIndexLog(logPath, {
          ts: new Date().toISOString(),
          type: "session",
          event: "completed",
          duration_ms: totalDuration,
          data: {
            tool_calls: toolUseCount,
            thinking_blocks: thinkingBlockCount,
            text_blocks: textBlockCount,
          },
        });

        if (useStream && resultText) {
          resolve(resultText);
        } else {
          resolve(stdoutRaw || "");
        }
        return;
      }

      if (code === null || code === undefined) {
        // Process was killed/terminated abnormally
        // PTY doesn't have separate stderr, so check stdoutRaw for error patterns
        let msg =
          stdoutRaw.trim() || "claude process was terminated unexpectedly";

        // Detect MCP-specific errors
        if (stderr.includes("MCP") || stderr.includes("mcp")) {
          if (stderr.includes("timeout") || stderr.includes("timed out")) {
            msg =
              "MCP server timeout - server did not respond within expected time";
          } else if (
            stderr.includes("connection") ||
            stderr.includes("connect")
          ) {
            msg = "MCP server connection failed - server is not reachable";
          } else if (
            stderr.includes("authentication") ||
            stderr.includes("auth") ||
            stderr.includes("unauthorized")
          ) {
            msg =
              "MCP server authentication failed - check API key/credentials";
          } else if (stderr.includes("not found") || stderr.includes("404")) {
            msg = "MCP server endpoint not found - check server URL";
          } else {
            // Generic MCP error with stderr context
            const mcpError = stderr
              .split("\n")
              .find(
                (line) =>
                  line.toLowerCase().includes("mcp") ||
                  line.toLowerCase().includes("error"),
              );
            if (mcpError) {
              msg = `MCP error: ${mcpError.trim()}`;
            } else {
              msg = `MCP server error - check logs for details`;
            }
          }
        }

        appendLog(logPath, "EXIT", `code=null error=${msg}\n`);
        if (stderr.trim()) {
          appendLog(logPath, "STDERR_FULL", stderr + "\n");
        }

        // Index: Process terminated abnormally
        appendIndexLog(logPath, {
          ts: new Date().toISOString(),
          type: "error",
          event: "process_terminated",
          duration_ms: Date.now() - startTime,
          data: {
            exit_code: null,
            message: msg,
            stderr_preview: stderr.trim().slice(0, 200),
          },
        });

        reject(new Error(msg));
      } else if (code !== 0) {
        // Parse stderr for specific error types.
        // When stderr is empty, check resultText for API-level errors
        // (e.g. content filtering) that arrive via the JSON stream, not stderr.
        let msg =
          stderr.trim() ||
          (resultText && resultText.startsWith("API Error")
            ? resultText.slice(0, 200)
            : "") ||
          `claude exited with exit code ${code}`;

        // Detect MCP-specific errors in non-zero exits
        if (stderr.includes("MCP") || stderr.includes("mcp")) {
          if (stderr.includes("timeout") || stderr.includes("timed out")) {
            msg =
              "MCP server timeout - server did not respond within expected time";
          } else if (
            stderr.includes("connection") ||
            stderr.includes("connect")
          ) {
            msg = "MCP server connection failed - server is not reachable";
          } else if (
            stderr.includes("authentication") ||
            stderr.includes("auth") ||
            stderr.includes("unauthorized")
          ) {
            msg =
              "MCP server authentication failed - check API key/credentials";
          }
        }

        appendLog(logPath, "EXIT", `code=${code} error=${msg}\n`);
        if (stderr.trim() && !msg.includes(stderr.trim())) {
          appendLog(logPath, "STDERR_FULL", stderr + "\n");
        }

        // Index: Process exited with error
        appendIndexLog(logPath, {
          ts: new Date().toISOString(),
          type: "error",
          event: "process_exit_error",
          duration_ms: Date.now() - startTime,
          data: {
            exit_code: code,
            message: msg,
            stderr_preview: stderr.trim().slice(0, 200),
          },
        });

        reject(new Error(msg));
      } else {
        appendLog(logPath, "EXIT", `code=0 (success)\n`);
        resolve(useStream ? resultText : stdoutRaw);
      }
    });

    // Abort signal — kill the child process on external cancellation
    const onAbort = () => {
      if (!settled) {
        settled = true;
        clearTimeout(idleTimer);
        clearTimeout(wallClockTimer);
        clearTimeout(meaningfulActivityTimer);
        clearInterval(heartbeatInterval);
        appendLog(logPath, "ABORT", "claudefn aborted via signal\n");
        // On Windows, proc.kill() only kills the shell, not the child tree.
        // Use taskkill /T to terminate the entire process tree.
        if (process.platform === "win32" && proc.pid) {
          try {
            execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
          } catch {
            proc.kill("SIGTERM");
          }
        } else {
          proc.kill("SIGTERM");
        }
        reject(new Error("claudefn aborted via signal"));
      }
    };
    if (signal) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    }
  });

  // Clean up temp files if we created them
  if (tempSystemPromptFile) {
    try {
      unlinkSync(tempSystemPromptFile);
    } catch {
      /* ignore */
    }
  }
  if (tempMcpConfigFile) {
    try {
      unlinkSync(tempMcpConfigFile);
    } catch {
      /* ignore */
    }
  }

  const durationMs = Date.now() - start;

  // after hook
  if (hooks?.after) {
    await hooks.after({ result: raw, durationMs });
  }

  // Schema parsing — with AI self-repair via sendFeedback
  let data: T;
  if (schema) {
    data = await parseWithRepair<T>(
      raw,
      schema,
      sessionId,
      cwd,
      timeoutMs,
      logDir,
    );
  } else {
    data = raw as unknown as T;
  }

  return { data, raw, durationMs, sessionId, logPath };
}

// ─── Schema Parse with AI Self-Repair ────────────────────────

/**
 * Parse AI output into a typed schema, using sendFeedback to self-repair
 * if the initial JSON is malformed. Resumes the same Claude session so
 * the AI has full context to fix its own output.
 */
async function parseWithRepair<T>(
  raw: string,
  schema: ClaudeFnOptions<T>["schema"],
  sessionId: string,
  cwd: string | undefined,
  timeoutMs: number,
  logDir?: string,
): Promise<T> {
  const jsonStr = extractJson(raw);
  try {
    const parsed = JSON.parse(jsonStr);
    return schema!.parse(parsed);
  } catch (firstError: any) {
    // Truncate the broken JSON for the repair prompt (keep enough context)
    const snippet =
      jsonStr.length > 800
        ? jsonStr.slice(0, 400) + "\n...[truncated]...\n" + jsonStr.slice(-400)
        : jsonStr;

    const repairPrompt = `Your previous response contained invalid JSON that failed to parse:

ERROR: ${firstError.message}

The broken output started with:
\`\`\`
${snippet}
\`\`\`

Please re-emit the COMPLETE, valid JSON object inside a \`\`\`json code fence.
Fix any unterminated strings, missing closing braces, unescaped characters, or trailing commas.
Do NOT add any text outside the code fence.`;

    console.warn(`   ⚠️  JSON parse failed: ${firstError.message}`);
    console.warn(`   🔄 Sending repair feedback to session ${sessionId}...`);

    try {
      const repairResult = await sendFeedback({
        sessionId,
        prompt: repairPrompt,
        cwd,
        timeoutMs: Math.min(timeoutMs, 60_000), // cap repair at 60s
        logDir,
      });

      const repairedJson = extractJson(repairResult.raw);
      const parsed = JSON.parse(repairedJson);
      const data = schema!.parse(parsed);
      console.warn(`   ✅ JSON repaired via AI feedback`);
      return data;
    } catch (repairError: any) {
      // Repair failed — throw the original error with context
      console.warn(`   ❌ AI repair also failed: ${repairError.message}`);
      throw new Error(
        `JSON parse failed and AI self-repair failed.\n` +
          `Original: ${firstError.message}\n` +
          `Repair: ${repairError.message}`,
      );
    }
  }
}

// ─── Feedback / Resume ──────────────────────────────────────

export interface SendFeedbackOptions {
  /** Session ID from the original call */
  sessionId: string;
  /** Follow-up prompt to send */
  prompt: string;
  /** Working directory */
  cwd?: string;
  /** Max idle time in ms — resets on new output (default: 600_000) */
  timeoutMs?: number;
  /** Max wall-clock runtime in ms before aborting. */
  wallClockTimeoutMs?: number;
  /** Extra CLI flags */
  cliFlags?: string[];
  /** Allowed tools for the follow-up */
  allowedTools?: string[];
  /** Log directory for this feedback session */
  logDir?: string;
}

/**
 * Send a follow-up message to an existing Claude session.
 *
 * Uses `claude --resume <sessionId> -p "..."` to continue the conversation,
 * allowing the agent to access its full prior context.
 */
export async function sendFeedback(
  opts: SendFeedbackOptions,
): Promise<ClaudeFnResult<string>> {
  const {
    sessionId,
    prompt,
    cwd,
    timeoutMs = 600_000,
    wallClockTimeoutMs = Math.max(timeoutMs * 2, 900_000),
    cliFlags = [],
    allowedTools,
    logDir,
  } = opts;

  const start = Date.now();

  // Set up log file for this feedback session
  const logPath = createLogFile(cwd, sessionId, logDir);
  appendLog(logPath, "INFO", `Starting sendFeedback session=${sessionId}\n`);
  appendLog(
    logPath,
    "INFO",
    `Timeout=${timeoutMs}ms (activity-based idle timeout); wallClockTimeout=${wallClockTimeoutMs}ms\n`,
  );

  const args = [
    "--dangerously-skip-permissions",
    "--resume",
    sessionId,
    // Prompt is piped via stdin to avoid CLI arg length limits
    "-p",
    // NEVER pass --allowedTools flag to avoid MCP connection delays
    // ...(allowedTools?.length
    //   ? ["--allowedTools", allowedTools.join(",")]
    //   : []),
    ...cliFlags,
  ];

  const spawnEnvFb = { ...process.env };
  delete spawnEnvFb["NODE_OPTIONS"];
  delete spawnEnvFb["NODE_PATH"];
  delete spawnEnvFb["TS_NODE_PROJECT"];
  delete spawnEnvFb["TS_NODE_FILES"];

  // CRITICAL: Disable Claude CLI background task mode
  spawnEnvFb["CLAUDE_CODE_DISABLE_BACKGROUND_TASKS"] = "1";

  const raw = await new Promise<string>((resolve, reject) => {
    const proc = spawn("claude", args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: spawnEnvFb,
    });

    // Pipe the prompt via stdin to avoid ENAMETOOLONG on large prompts
    proc.stdin!.write(prompt);
    proc.stdin!.end();

    let stdoutRaw = "";
    let stderr = "";
    let settled = false;

    // Activity-based idle timeout (same as executeViaCli)
    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          appendLog(
            logPath,
            "TIMEOUT",
            `sendFeedback idle-timed out after ${timeoutMs}ms of inactivity\n`,
          );
          proc.kill();
          reject(
            new Error(
              `sendFeedback timed out after ${timeoutMs}ms of inactivity`,
            ),
          );
        }
      }, timeoutMs);
    };
    resetIdleTimer();

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      appendLog(logPath, "STDOUT", text);
      resetIdleTimer();
      stdoutRaw += text;
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      appendLog(logPath, "STDERR", text);
      resetIdleTimer();
      stderr += text;
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(idleTimer);
      if (settled) return;
      settled = true;

      if (code === null) {
        // Process was killed/terminated abnormally
        const msg =
          stderr.trim() || "claude process was terminated unexpectedly";
        appendLog(logPath, "EXIT", `code=null error=${msg}\n`);
        reject(new Error(msg));
      } else if (code !== 0) {
        const msg = stderr.trim() || `claude exited with exit code ${code}`;
        appendLog(logPath, "EXIT", `code=${code} error=${msg}\n`);
        reject(new Error(msg));
      } else {
        appendLog(logPath, "EXIT", `code=0 (success)\n`);
        resolve(stdoutRaw);
      }
    });
  });

  const durationMs = Date.now() - start;

  return { data: raw, raw, durationMs, sessionId, logPath };
}
