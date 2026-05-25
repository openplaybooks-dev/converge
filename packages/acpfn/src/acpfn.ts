import { randomUUID } from "node:crypto";
import {
  writeFileSync,
  unlinkSync,
  mkdirSync,
  appendFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { sdkAvailable, getQuery, getCliJsPath } from "./sdk-conditional.js";
import type { SdkMessage, SdkQuery, SdkOptions } from "./sdk-conditional.js";
import type {
  AcpFnOptions,
  AcpFnResult,
  AcpFn,
  PromptInput,
} from "./types.js";
import { GlobalQueue, getDefaultQueue } from "./queue.js";
import type { GlobalQueueOptions } from "./queue.js";
import { extractJson, resolvePrompt } from "./utils.js";

/** CLI path resolved at module load, if SDK is present */
const _sdkCliJsPath = getCliJsPath();

// ─── Log File Helpers ──────────────────────────────────────────

/** Resolve (and create) the log directory, return the log file path */
function createLogFile(
  cwd: string | undefined,
  sessionId: string,
  logDir?: string,
): string {
  if (!logDir) {
    throw new Error(
      "logDir is required - acpfn no longer uses a default log directory",
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
function resolveQueue(option: AcpFnOptions["queue"]): GlobalQueue | null {
  if (!option) return null;
  if (option === true) return getDefaultQueue();
  if (option instanceof GlobalQueue) return option;
  return getDefaultQueue(option as GlobalQueueOptions);
}

// ─── Message Processing ────────────────────────────────────────

/** Extract text content from SDK messages */
function extractTextFromMessage(message: SdkMessage): string {
  if (message.type === "result") {
    if (message.subtype === "success") {
      return message.result || "";
    }
    return "";
  }
  if (message.type === "assistant") {
    const assistantMsg = message;
    const content = assistantMsg.message?.content;
    if (Array.isArray(content)) {
      return content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n");
    }
    return typeof content === "string" ? content : "";
  }
  return "";
}

/** Check if message is a successful result */
function isResultSuccess(message: SdkMessage): boolean {
  return message.type === "result" && message.subtype === "success";
}

/** Process SDK messages and extract streaming content */
function processMessage(
  message: SdkMessage,
  logPath: string,
  onStream?: (chunk: string) => void,
  counters?: {
    toolUseCount: number;
    thinkingBlockCount: number;
    textBlockCount: number;
  },
): string {
  const text = extractTextFromMessage(message);

  // Log the raw message
  appendLog(logPath, "SDK_MESSAGE", JSON.stringify(message) + "\n");

  // Handle different message types
  if (message.type === "assistant") {
    const msg = message;
    const content = msg.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text" && block.text) {
          appendLog(logPath, "TEXT_BLOCK", block.text + "\n");
          onStream?.(block.text);
          if (counters) counters.textBlockCount++;

          appendIndexLog(logPath, {
            ts: new Date().toISOString(),
            type: "output",
            event: "text",
            data: {
              text: block.text.slice(0, 200),
              size: block.text.length,
            },
          });
        } else if (block.type === "thinking" && block.thinking) {
          appendLog(logPath, "THINKING", block.thinking + "\n");
          onStream?.(`\n[thinking] ${block.thinking}\n`);
          if (counters) counters.thinkingBlockCount++;

          appendIndexLog(logPath, {
            ts: new Date().toISOString(),
            type: "thinking",
            event: "reasoning",
            data: {
              text: block.thinking.slice(0, 200),
              size: block.thinking.length,
            },
          });
        } else if (block.type === "tool_use") {
          const input = (block.input ?? {}) as Record<string, any>;
          const inputStr = JSON.stringify(input, null, 2);
          appendLog(
            logPath,
            "TOOL_USE",
            `Tool: ${block.name}\nInput: ${inputStr}\n`,
          );
          const inputPreview = inputStr.slice(0, 120);
          onStream?.(`\n[tool:${block.name}] ${inputPreview}\n`);
          if (counters) counters.toolUseCount++;

          const inputSummary: any = {};

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
            const cmd = String(input.command);
            inputSummary.cmd = cmd.length > 60 ? cmd.slice(0, 60) + "..." : cmd;
          } else if (block.name === "Grep") {
            inputSummary.pattern = input.pattern;
            inputSummary.path = input.path;
          } else if (block.name === "Glob") {
            inputSummary.pattern = input.pattern;
          } else {
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
  } else if (isResultSuccess(message)) {
    appendLog(logPath, "FINAL_RESULT", message.result || "" + "\n");
  }

  return text;
}

// ─── Main acpfn Function ─────────────────────────────────────

/**
 * Create a callable function backed by the Claude Agent SDK.
 *
 * Uses `@anthropic-ai/claude-agent-sdk` to run Claude with built-in tools.
 *
 * @example
 * ```typescript
 * const fn = acpfn({ prompt: "Translate {{input}} to French" });
 * const { data } = await fn("hello");
 * ```
 */
export function acpfn<T = string>(options?: AcpFnOptions<T>): AcpFn<T> {
  const opts = options ?? ({} as AcpFnOptions<T>);

  const {
    prompt: promptTemplate,
    schema,
    hooks,
    timeoutMs = 600_000,
    maxRetries = 0,
    cwd,
    queue: queueOption,
    allowedTools,
    mode = "call",
    systemPrompt,
    systemPromptFile,
    signal,
    logDir,
    onQueryInitialized,
    sdkOptions = {},
    model,
    maxTurns,
    mcpServers,
    debug = false,
    apiKey,
    baseUrl,
  } = opts;

  const queue = resolveQueue(queueOption);

  return async (input?: string): Promise<AcpFnResult<T>> => {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const run = () =>
          executeViaSdk(
            promptTemplate,
            input,
            schema,
            hooks,
            timeoutMs,
            cwd,
            allowedTools,
            mode,
            systemPrompt,
            signal,
            systemPromptFile,
            logDir,
            onQueryInitialized,
            sdkOptions,
            model,
            maxTurns,
            mcpServers,
            debug,
            apiKey,
            baseUrl,
          );
        return queue ? await queue.wrap(run) : await run();
      } catch (err: unknown) {
        lastError = err as Error;

        // If aborted externally, don't retry at all
        if (signal?.aborted) break;

        // Normal retry budget
        if (attempt <= maxRetries) continue;

        break;
      }
    }

    throw lastError!;
  };
}

// ─── SDK Execution ──────────────────────────────────────────

async function executeViaSdk<T>(
  promptTemplate: PromptInput | undefined,
  input: string | undefined,
  schema: AcpFnOptions<T>["schema"],
  hooks: AcpFnOptions<T>["hooks"],
  timeoutMs: number,
  cwd: string | undefined,
  allowedTools: string[] | undefined,
  mode: AcpFnOptions<T>["mode"] = "call",
  systemPrompt?: string,
  signal?: AbortSignal,
  systemPromptFile?: string,
  logDir?: string,
  onQueryInitialized?: (query: SdkQuery, logPath: string) => void,
  sdkOptions: Partial<SdkOptions> = {},
  model?: string,
  maxTurns?: number,
  mcpServers?: SdkOptions["mcpServers"],
  debug = false,
  apiKey?: string,
  baseUrl?: string,
): Promise<AcpFnResult<T>> {
  let prompt: string;
  if (promptTemplate) {
    prompt = resolvePrompt(promptTemplate, input);
  } else if (input != null) {
    prompt = input;
  } else {
    throw new Error(
      'acpfn requires either a "prompt" option or an input argument',
    );
  }

  // If schema is provided, append JSON output instructions to the prompt
  if (schema) {
    let schemaStructure = "";
    try {
      const schemaShape = (schema as any)._def?.shape?.();
      if (schemaShape) {
        const fields = Object.keys(schemaShape);
        schemaStructure = JSON.stringify(
          Object.fromEntries(
            fields.map((key) => {
              const field = schemaShape[key];
              const typeName = field._def?.typeName;
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
  const sessionId = randomUUID();

  // Handle system prompt file
  let resolvedSystemPrompt = systemPrompt;

  if (systemPromptFile) {
    try {
      resolvedSystemPrompt = readFileSync(systemPromptFile, "utf-8");
    } catch (err) {
      throw new Error(`Failed to read system prompt file: ${err}`);
    }
  }

  // Set up log file for this execution
  if (!logDir) {
    throw new Error("logDir is required");
  }
  const logPath = createLogFile(cwd, sessionId, logDir);
  const startTime = Date.now();

  appendLog(logPath, "INFO", `Starting acpfn session=${sessionId}\n`);
  appendLog(logPath, "INFO", `Timeout=${timeoutMs}ms\n`);
  appendLog(
    logPath,
    "PROMPT",
    `${prompt.slice(0, 500)}${prompt.length > 500 ? "...[truncated]" : ""}\n`,
  );

  appendIndexLog(logPath, {
    ts: new Date().toISOString(),
    type: "session",
    event: "started",
    data: { session_id: sessionId, timeout_ms: timeoutMs },
  });

  // Build SDK options
  const abortController = new AbortController();
  if (signal) {
    signal.addEventListener("abort", () => abortController.abort(), {
      once: true,
    });
  }

  // Handle system prompt options
  let finalSystemPrompt: SdkOptions["systemPrompt"] = undefined;
  if (resolvedSystemPrompt) {
    finalSystemPrompt = resolvedSystemPrompt;
  }

  // Build env configuration for custom API key and base URL
  const envConfig: Record<string, string> = {};
  if (apiKey) {
    envConfig.ANTHROPIC_API_KEY = apiKey;
  }
  if (baseUrl) {
    envConfig.ANTHROPIC_BASE_URL = baseUrl;
  }

  const options: SdkOptions = {
    cwd: cwd ?? process.cwd(),
    abortController,
    allowedTools: allowedTools ?? [],
    allowDangerouslySkipPermissions: true,
    debug,
    maxTurns,
    model,
    mcpServers,
    persistSession: true,
    sessionId,
    systemPrompt: finalSystemPrompt,
    env: Object.keys(envConfig).length > 0 ? envConfig : undefined,
    // Force the SDK to use the cli.js we resolved up-front, bypassing its
    // own platform-specific auto-discovery that breaks under some bundle
    // and symlink layouts.
    ...(_sdkCliJsPath ? { pathToClaudeCodeExecutable: _sdkCliJsPath } : {}),
    ...sdkOptions,
  };

  // Execute the query - SDK query takes an object with prompt and options
  const sdkQuery = getQuery()({ prompt, options });

  // Index: Query initialized
  appendIndexLog(logPath, {
    ts: new Date().toISOString(),
    type: "sdk",
    event: "query_initialized",
    data: { session_id: sessionId },
  });

  // Call onQueryInitialized hook if provided
  if (onQueryInitialized) {
    onQueryInitialized(sdkQuery, logPath);
  }

  const counters = {
    toolUseCount: 0,
    thinkingBlockCount: 0,
    textBlockCount: 0,
  };
  let finalResult = "";
  let settled = false;

  // Set up timeout
  const timeoutTimer = setTimeout(() => {
    if (!settled) {
      settled = true;
      const timeoutMsg = `acpfn timed out after ${timeoutMs}ms`;
      appendLog(logPath, "TIMEOUT", timeoutMsg + "\n");
      appendIndexLog(logPath, {
        ts: new Date().toISOString(),
        type: "error",
        event: "timeout",
        duration_ms: Date.now() - startTime,
        data: { message: timeoutMsg, timeout_ms: timeoutMs },
      });
      abortController.abort();
    }
  }, timeoutMs);

  try {
    for await (const message of sdkQuery) {
      if (settled) break;

      processMessage(message, logPath, hooks?.onStream, counters);

      if (isResultSuccess(message)) {
        finalResult = message.result || "";
        settled = true;
        break;
      }
    }
  } catch (err: any) {
    if (signal?.aborted) {
      throw new Error("acpfn aborted via signal");
    }
    if (abortController.signal.aborted) {
      throw new Error(`acpfn timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutTimer);

    // Close the query to clean up resources
    try {
      sdkQuery.close();
    } catch {
      // Ignore cleanup errors
    }
  }

  const durationMs = Date.now() - start;

  // Index: Session completed
  appendIndexLog(logPath, {
    ts: new Date().toISOString(),
    type: "session",
    event: "completed",
    duration_ms: durationMs,
    data: {
      tool_calls: counters.toolUseCount,
      thinking_blocks: counters.thinkingBlockCount,
      text_blocks: counters.textBlockCount,
    },
  });

  appendLog(logPath, "EXIT", `success (duration=${durationMs}ms)\n`);

  // after hook
  if (hooks?.after) {
    await hooks.after({ result: finalResult, durationMs });
  }

  // Schema parsing
  let data: T;
  if (schema) {
    data = await parseWithRepair<T>(
      finalResult,
      schema,
      sessionId,
      cwd,
      timeoutMs,
      logDir,
      sdkOptions,
    );
  } else {
    data = finalResult as unknown as T;
  }

  return { data, raw: finalResult, durationMs, sessionId, logPath };
}

// ─── Schema Parse with AI Self-Repair ────────────────────────

/**
 * Parse AI output into a typed schema, using sendFeedback to self-repair
 * if the initial JSON is malformed.
 */
async function parseWithRepair<T>(
  raw: string,
  schema: AcpFnOptions<T>["schema"],
  sessionId: string,
  cwd: string | undefined,
  timeoutMs: number,
  logDir?: string,
  sdkOptions: Partial<SdkOptions> = {},
): Promise<T> {
  const jsonStr = extractJson(raw);
  try {
    const parsed = JSON.parse(jsonStr);
    return schema!.parse(parsed);
  } catch (firstError: any) {
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
        timeoutMs: Math.min(timeoutMs, 60_000),
        logDir,
        sdkOptions,
      });

      const repairedJson = extractJson(repairResult.raw);
      const parsed = JSON.parse(repairedJson);
      const data = schema!.parse(parsed);
      console.warn(`   ✅ JSON repaired via AI feedback`);
      return data;
    } catch (repairError: any) {
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
  /** Allowed tools for the follow-up */
  allowedTools?: string[];
  /** Log directory for this feedback session */
  logDir?: string;
  /** Additional SDK options */
  sdkOptions?: Partial<SdkOptions>;
  /** Custom API key for authentication */
  apiKey?: string;
  /** Custom base URL for the API endpoint */
  baseUrl?: string;
}

/**
 * Send a follow-up message to an existing Claude session.
 *
 * Uses the SDK to resume and continue the conversation.
 */
export async function sendFeedback(
  opts: SendFeedbackOptions,
): Promise<AcpFnResult<string>> {
  const {
    sessionId,
    prompt,
    cwd,
    timeoutMs = 600_000,
    allowedTools,
    logDir,
    sdkOptions = {},
    apiKey,
    baseUrl,
  } = opts;

  const start = Date.now();

  if (!logDir) {
    throw new Error("logDir is required");
  }
  const logPath = createLogFile(cwd, sessionId, logDir);
  appendLog(logPath, "INFO", `Starting sendFeedback session=${sessionId}\n`);
  appendLog(logPath, "INFO", `Timeout=${timeoutMs}ms\n`);

  const abortController = new AbortController();

  // Build env configuration for custom API key and base URL
  const envConfig: Record<string, string> = {};
  if (apiKey) {
    envConfig.ANTHROPIC_API_KEY = apiKey;
  }
  if (baseUrl) {
    envConfig.ANTHROPIC_BASE_URL = baseUrl;
  }

  const options: SdkOptions = {
    cwd: cwd ?? process.cwd(),
    abortController,
    allowedTools: allowedTools ?? [],
    allowDangerouslySkipPermissions: true,
    resume: sessionId,
    persistSession: true,
    sessionId,
    env: Object.keys(envConfig).length > 0 ? envConfig : undefined,
    ...sdkOptions,
  };

  const sdkQuery = getQuery()({ prompt, options });

  let finalResult = "";
  let settled = false;

  const timeoutTimer = setTimeout(() => {
    if (!settled) {
      settled = true;
      appendLog(
        logPath,
        "TIMEOUT",
        `sendFeedback timed out after ${timeoutMs}ms\n`,
      );
      abortController.abort();
    }
  }, timeoutMs);

  try {
    for await (const message of sdkQuery) {
      if (settled) break;

      if (isResultSuccess(message)) {
        finalResult = message.result || "";
        settled = true;
        break;
      }
    }
  } finally {
    clearTimeout(timeoutTimer);
    try {
      sdkQuery.close();
    } catch {
      // Ignore cleanup errors
    }
  }

  const durationMs = Date.now() - start;
  appendLog(logPath, "EXIT", `success (duration=${durationMs}ms)\n`);

  return {
    data: finalResult,
    raw: finalResult,
    durationMs,
    sessionId,
    logPath,
  };
}
