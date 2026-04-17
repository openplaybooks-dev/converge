import { createOpencodeClient } from "@opencode-ai/sdk";
import { randomUUID } from "node:crypto";
import { mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import type {
  OpenFnOptions,
  OpenFnResult,
  OpenFn,
  PromptInput,
} from "./types.js";
import { GlobalQueue, getDefaultQueue } from "./queue.js";
import type { GlobalQueueOptions } from "./queue.js";
import { resolvePrompt } from "./utils.js";

// ─── Log File Helpers ───────────────────────────────────────

function createLogFile(sessionId: string, logDir?: string): string {
  if (!logDir) {
    return "";
  }
  mkdirSync(logDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return join(logDir, `${ts}_${sessionId.slice(0, 8)}.log`);
}

function appendLog(logPath: string, prefix: string, data: string): void {
  if (!logPath) return;
  try {
    const timestamp = new Date().toISOString();
    appendFileSync(logPath, `[${timestamp}] [${prefix}] ${data}\n`);
  } catch {
    // Best-effort logging — never crash the main flow
  }
}

function appendIndexLog(logPath: string, entry: {
  ts: string;
  type: string;
  event: string;
  data?: unknown;
  duration_ms?: number;
}): void {
  if (!logPath) return;
  try {
    const indexPath = logPath.replace('.log', '.index.jsonl');
    appendFileSync(indexPath, JSON.stringify(entry) + '\n');
  } catch {
    // Best-effort logging
  }
}

// ─── Queue Resolution ──────────────────────────────────────

function resolveQueue(
  option: OpenFnOptions["queue"],
): GlobalQueue | null {
  if (!option) return null;
  if (option === true) return getDefaultQueue();
  if (option instanceof GlobalQueue) return option;
  return getDefaultQueue(option as GlobalQueueOptions);
}

// ─── openfn() Factory ─────────────────────────────────────

/**
 * Create a callable function backed by the Opencode AI client.
 *
 * Uses the `@opencode-ai/sdk` TypeScript SDK to communicate with
 * a local Opencode server.
 *
 * @example
 * ```typescript
 * const fn = openfn({ prompt: "Translate {{input}} to French" });
 * const { data } = await fn("hello");
 * ```
 */
export function openfn<T = string>(
  options?: OpenFnOptions<T>,
): OpenFn<T> {
  const opts = options ?? ({} as OpenFnOptions<T>);

  const {
    prompt: promptTemplate,
    schema,
    hooks,
    timeoutMs = 600_000,
    maxRetries = 0,
    cwd,
    queue: queueOption,
    baseUrl = "http://localhost:4096",
    model = "minimax/m2.5",
    apiKey,
    providers,
    signal,
    logDir,
    onProcessSpawned,
  } = opts;

  const queue = resolveQueue(queueOption);

  return async (input?: string): Promise<OpenFnResult<T>> => {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const run = () =>
          executeViaSDK(
            promptTemplate,
            input,
            schema,
            hooks,
            timeoutMs,
            cwd,
            baseUrl,
            model,
            apiKey,
            providers,
            signal,
            logDir,
            onProcessSpawned,
          );
        return queue ? await queue.wrap(run) : await run();
      } catch (err: unknown) {
        lastError = err as Error;

        if (signal?.aborted) break;

        if (attempt <= maxRetries) continue;
        break;
      }
    }

    throw lastError!;
  };
}

// ─── SDK Execution ─────────────────────────────────────────

export async function executeViaSDK<T>(
  promptTemplate: PromptInput | undefined,
  input: string | undefined,
  schema: OpenFnOptions<T>["schema"],
  hooks: OpenFnOptions<T>["hooks"],
  timeoutMs: number,
  cwd: string | undefined,
  baseUrl: string,
  model: string,
  apiKey?: string,
  providers?: Record<string, { apiKey: string }>,
  signal?: AbortSignal,
  logDir?: string,
  onProcessSpawned?: (proc: unknown, logPath: string) => void,
): Promise<OpenFnResult<T>> {
  let prompt: string;
  if (promptTemplate) {
    prompt = resolvePrompt(promptTemplate, input);
  } else if (input != null) {
    prompt = input;
  } else {
    throw new Error(
      'openfn requires either a "prompt" option or an input argument',
    );
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

  // Set up log file for this execution
  const logPath = createLogFile(sessionId, logDir);
  appendLog(logPath, "INFO", `Starting openfn session=${sessionId}\n`);
  appendLog(logPath, "INFO", `Timeout=${timeoutMs}ms\n`);
  appendLog(logPath, "INFO", `BaseUrl=${baseUrl}\n`);
  appendLog(logPath, "INFO", `Model=${model}\n`);

  appendIndexLog(logPath, {
    ts: new Date().toISOString(),
    type: "session",
    event: "started",
    data: { session_id: sessionId, timeout_ms: timeoutMs, base_url: baseUrl, model }
  });

  // Create Opencode client
  const client = createOpencodeClient({ baseUrl });

  // Extract providerID from model string (e.g., "minimax" from "minimax/m2.5")
  const modelParts = model.split('/');
  const providerID = modelParts[0] || "minimax";

  // Look up API key for this provider
  let providerApiKey = apiKey;
  if (!providerApiKey && providers && providers[providerID]) {
    providerApiKey = providers[providerID].apiKey;
  }

  // Configure AI provider credentials if we have an API key
  if (providerApiKey) {
    try {
      await client.auth.set({
        path: { id: providerID },
        body: { type: "api", key: providerApiKey },
      });
      appendLog(logPath, "AUTH", `Configured credentials for provider: ${providerID}\n`);
    } catch (err) {
      const error = err as Error;
      appendLog(logPath, "WARN", `Failed to configure auth: ${error.message}\n`);
      // Continue anyway - auth might not be needed for all providers
    }
  }

  // Create a new session
  let createdSessionId: string;
  try {
    const sessionResult = await client.session.create({
      body: { title: "openfn session" },
    });

    if (!sessionResult.data?.id) {
      throw new Error("Session creation returned no ID");
    }
    createdSessionId = sessionResult.data.id;
    appendLog(logPath, "SESSION", `Created session: ${createdSessionId}\n`);
    appendIndexLog(logPath, {
      ts: new Date().toISOString(),
      type: "session",
      event: "session_created",
      data: { session_id: createdSessionId }
    });
  } catch (err) {
    const error = err as Error;
    appendLog(logPath, "ERROR", `Failed to create session: ${error.message}\n`);
    appendIndexLog(logPath, {
      ts: new Date().toISOString(),
      type: "error",
      event: "session_create_failed",
      data: { error: error.message }
    });
    throw err;
  }

  // Fire onProcessSpawned hook (for harness AgentManager integration)
  if (onProcessSpawned) {
    onProcessSpawned({ sessionId: createdSessionId }, logPath);
  }

  // Build the prompt body
  const modelID = modelParts[1] || model;

  const promptBody: {
    parts: Array<{ type: "text"; text: string }>;
    model: { providerID: string; modelID: string };
    format?: {
      type: "json_schema";
      schema: Record<string, unknown>;
      retryCount?: number;
    };
  } = {
    parts: [{ type: "text", text: prompt }],
    model: { providerID, modelID },
  };

  // Add structured output format if schema is provided
  if (schema) {
    const jsonSchema = zodToJsonSchema(schema);
    promptBody.format = {
      type: "json_schema",
      schema: jsonSchema,
      retryCount: 2,
    };
  }

  // Send prompt to the session with timeout
  let raw: string;
  let responseText: string;
  let structuredOutput: unknown = undefined;

  const promptStart = Date.now();

  try {
    const result = await withTimeout(
      client.session.prompt({
        path: { id: createdSessionId },
        body: promptBody,
      }),
      timeoutMs,
      "prompt"
    );

    // Extract response data from the result
    raw = JSON.stringify(result.data);

    // Check for structured output
    // The SDK returns structured output in result.data.info.structured_output
    const info = (result.data as any)?.info;
    if (info?.structured_output) {
      structuredOutput = info.structured_output;
      responseText = JSON.stringify(structuredOutput);
    } else if (info?.text) {
      responseText = info.text;
    } else {
      // Fallback: try to extract text from the raw response
      responseText = extractTextFromResponse(result.data);
    }

    appendLog(logPath, "RESULT", `Response: ${responseText}\n`);
  } catch (err) {
    const error = err as Error;
    appendLog(logPath, "ERROR", `Prompt failed: ${error.message}\n`);
    appendIndexLog(logPath, {
      ts: new Date().toISOString(),
      type: "error",
      event: "prompt_failed",
      duration_ms: Date.now() - promptStart,
      data: { error: error.message }
    });
    throw err;
  }

  const durationMs = Date.now() - start;

  // after hook
  if (hooks?.after) {
    await hooks.after({ result: raw, durationMs });
  }

  appendIndexLog(logPath, {
    ts: new Date().toISOString(),
    type: "session",
    event: "completed",
    duration_ms: durationMs,
    data: { session_id: createdSessionId }
  });

  // Use structured output if available, otherwise use text response
  let data: T;
  if (structuredOutput !== undefined) {
    data = structuredOutput as T;
  } else {
    data = responseText as unknown as T;
  }

  return { data, raw, durationMs, sessionId: createdSessionId, logPath };
}

// ─── Extract text from SDK response ─────────────────────────

function extractTextFromResponse(data: unknown): string {
  if (!data) return "";

  // Try to find text content in the response
  const str = JSON.stringify(data);

  // Look for text fields in the response
  const textMatch = str.match(/"text"\s*:\s*"([^"]*)"/);
  if (textMatch) return textMatch[1];

  // Fallback: return the raw string representation
  if (typeof data === "string") return data;

  return str;
}

// ─── Timeout wrapper ────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

// ─── Convert Zod schema to JSON Schema ─────────────────────

function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  // Extract the JSON schema from a Zod schema
  // Zod schemas have an _def property that contains the schema definition
  const zodSchema = schema as { _def?: { shape?: () => Record<string, unknown>; typeName?: string; description?: string } };

  if (!zodSchema._def) {
    return { type: "object" };
  }

  // Get the shape (field definitions)
  const shape = zodSchema._def.shape?.();
  if (!shape) {
    return { type: "object" };
  }

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(shape)) {
    const zodField = field as { _def?: { typeName?: string; description?: string } };
    const typeName = zodField._def?.typeName;
    const description = zodField._def?.description;

    let jsonType: string;
    switch (typeName) {
      case "ZodString":
        jsonType = "string";
        break;
      case "ZodNumber":
        jsonType = "number";
        break;
      case "ZodBoolean":
        jsonType = "boolean";
        break;
      case "ZodArray":
        jsonType = "array";
        break;
      case "ZodObject":
        jsonType = "object";
        break;
      default:
        jsonType = "string";
    }

    properties[key] = {
      type: jsonType,
      ...(description ? { description } : {}),
    };
    required.push(key);
  }

  return {
    type: "object",
    properties,
    required,
  };
}

// ─── Feedback / Resume ─────────────────────────────────────

export interface SendFeedbackOptions {
  /** Session ID from the original call */
  sessionId: string;
  /** Follow-up prompt to send */
  prompt: string;
  /** Working directory */
  cwd?: string;
  /** Opencode AI base URL */
  baseUrl?: string;
  /** Model to use */
  model?: string;
  /** API key for the AI provider */
  apiKey?: string;
  /** Multiple AI providers */
  providers?: Record<string, { apiKey: string }>;
  /** Max idle time in ms (default: 600_000) */
  timeoutMs?: number;
  /** Log directory for this feedback session */
  logDir?: string;
}

/**
 * Send a follow-up message to an existing Opencode session.
 * Uses the existing session ID to continue the conversation.
 */
export async function sendFeedback(
  opts: SendFeedbackOptions,
): Promise<OpenFnResult<string>> {
  const {
    sessionId,
    prompt,
    baseUrl = "http://localhost:4096",
    model = "minimax/m2.5",
    apiKey,
    providers,
    timeoutMs = 600_000,
    logDir,
  } = opts;

  const start = Date.now();
  const logPath = createLogFile(sessionId, logDir);

  appendLog(logPath, "INFO", `Starting sendFeedback session=${sessionId}\n`);
  appendLog(logPath, "INFO", `Timeout=${timeoutMs}ms\n`);

  const client = createOpencodeClient({ baseUrl });

  // Extract providerID from model string
  const modelParts = model.split('/');
  const providerID = modelParts[0] || "minimax";
  const modelID = modelParts[1] || model;

  // Look up API key for this provider
  let providerApiKey = apiKey;
  if (!providerApiKey && providers && providers[providerID]) {
    providerApiKey = providers[providerID].apiKey;
  }

  // Configure AI provider credentials if we have an API key
  if (providerApiKey) {
    try {
      await client.auth.set({
        path: { id: providerID },
        body: { type: "api", key: providerApiKey },
      });
      appendLog(logPath, "AUTH", `Configured credentials for provider: ${providerID}\n`);
    } catch (err) {
      const error = err as Error;
      appendLog(logPath, "WARN", `Failed to configure auth: ${error.message}\n`);
    }
  }

  try {
    const result = await withTimeout(
      client.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text" as const, text: prompt }],
          model: { providerID, modelID },
        },
      }),
      timeoutMs,
      "feedback"
    );

    const raw = JSON.stringify(result.data);
    const responseText = extractTextFromResponse(result.data);
    const durationMs = Date.now() - start;

    appendLog(logPath, "RESULT", `Response: ${responseText}\n`);

    return { data: responseText, raw, durationMs, sessionId, logPath };
  } catch (err) {
    const error = err as Error;
    appendLog(logPath, "ERROR", `Feedback failed: ${error.message}\n`);
    throw err;
  }
}
