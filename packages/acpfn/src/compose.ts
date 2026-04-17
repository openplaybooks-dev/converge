import { query, type Options, type SDKResultSuccess, type SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
  ComposeOptions,
  AcpFn,
  AcpFnResult,
  PromptInput,
} from "./types.js";
import { GlobalQueue, getDefaultQueue } from "./queue.js";
import type { GlobalQueueOptions } from "./queue.js";
import { resolvePrompt, extractJson } from "./utils.js";
import { randomUUID } from "node:crypto";
import { mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";

/** Resolve the queue option to a GlobalQueue instance or null */
function resolveQueue(
  option: ComposeOptions["queue"],
): GlobalQueue | null {
  if (!option) return null;
  if (option === true) return getDefaultQueue();
  if (option instanceof GlobalQueue) return option;
  return getDefaultQueue(option as GlobalQueueOptions);
}

// ─── Shared Utilities ────────────────────────────────────────

/** Extract a JS/TS code block from Claude's response */
export function extractCode(text: string): string | null {
  const re = /```(?:js|javascript|typescript|ts)?\s*\n([\s\S]*?)```/;
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

/** Parse `<tool_call>` blocks from Claude's response */
export function parseToolCalls(
  text: string,
): Array<{ name: string; input: string }> {
  const calls: Array<{ name: string; input: string }> = [];
  const re = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (typeof parsed.name === "string") {
        calls.push({
          name: parsed.name,
          input: String(parsed.input ?? ""),
        });
      }
    } catch {
      // skip malformed tool calls
    }
  }
  return calls;
}

/** Strip `<tool_call>` blocks from text */
function stripToolCalls(text: string): string {
  return text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
}

/** Build tool description preamble for tool_call mode */
export function buildToolPreamble(
  tools: Record<string, { description: string }>,
): string {
  const entries = Object.entries(tools);
  if (entries.length === 0) return "";

  const lines = entries.map(
    ([name, { description }]) => `- ${name}: ${description}`,
  );

  return [
    "You have access to these tools:",
    "",
    ...lines,
    "",
    "To call a tool, use this exact format in your response:",
    "",
    "<tool_call>",
    '{"name": "tool_name", "input": "string input for the tool"}',
    "</tool_call>",
    "",
    "You may make multiple tool calls in one response. When you have enough information, respond with your final answer (no <tool_call> blocks).",
  ].join("\n");
}

/** Build the code-mode preamble that tells Claude to write executable JS */
export function buildCodePreamble(
  tools: Record<string, { description: string }>,
): string {
  const entries = Object.entries(tools);
  if (entries.length === 0) {
    return [
      "Write a Node.js async function body that accomplishes the user's request.",
      'Use `return` to produce your final result. Wrap your code in a ```js code fence.',
    ].join("\n");
  }

  const toolDescs = entries.map(
    ([name, { description }]) =>
      `- ${name}(input?: string): Promise<{ data, raw, durationMs }> — ${description}`,
  );

  return [
    "You have access to these async functions:",
    "",
    ...toolDescs,
    "",
    "Write a Node.js async function body that accomplishes the user's request.",
    "The above functions are available directly by name. Each takes an optional",
    "string argument and returns `{ data, raw, durationMs }`.",
    "Use `return` to produce your final result.",
    "Wrap your code in a ```js code fence.",
  ].join("\n");
}

// ─── Log Helpers ─────────────────────────────────────────────

function createLogFile(cwd: string | undefined, sessionId: string, logDir?: string): string {
  if (!logDir) {
    throw new Error("logDir is required");
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
    // Best-effort logging
  }
}

// ─── SDK Query Helper ───────────────────────────────────────

/** Check if message is a successful result */
function isResultSuccess(message: any): message is SDKResultSuccess {
  return message.type === "result" && message.subtype === "success";
}

/** Execute a code string with tools injected as named async functions. */
export async function executeCode(
  code: string,
  tools: Record<string, AcpFn<any>>,
): Promise<unknown> {
  const toolNames = Object.keys(tools);
  const toolFns = Object.values(tools);

  const AsyncFunction = Object.getPrototypeOf(
    async function () {},
  ).constructor as new (...args: string[]) => (
    ...args: unknown[]
  ) => Promise<unknown>;

  const fn = new AsyncFunction(...toolNames, code);
  return fn(...toolFns);
}

/** Spawn the SDK query and collect output */
async function spawnSdkQuery(
  prompt: string,
  timeoutMs: number,
  cwd: string | undefined,
  onStream?: (chunk: string) => void,
  allowedTools?: string[],
  sdkOptions: Partial<Options> = {},
  model?: string,
  maxTurns?: number,
): Promise<string> {
  const abortController = new AbortController();
  const sessionId = randomUUID();

  const options: Options = {
    cwd: cwd ?? process.cwd(),
    abortController,
    allowedTools: allowedTools ?? [],
    allowDangerouslySkipPermissions: true,
    maxTurns,
    model,
    persistSession: false,
    sessionId,
    ...sdkOptions,
  };

  const sdkQuery = query({ prompt, options });
  
  let result = "";
  let settled = false;

  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      abortController.abort();
    }
  }, timeoutMs);

  try {
    for await (const message of sdkQuery) {
      if (settled) break;

      if (message.type === "assistant") {
        const assistantMsg = message as SDKAssistantMessage;
        const content = assistantMsg.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text" && block.text) {
              onStream?.(block.text);
            }
          }
        }
      }

      if (isResultSuccess(message)) {
        result = message.result || "";
        settled = true;
        break;
      }
    }
  } finally {
    clearTimeout(timer);
    try {
      sdkQuery.close();
    } catch {
      // Ignore cleanup errors
    }
  }

  return result;
}

// ─── compose() — main entry point ───────────────────────────

/**
 * Create a composed function that can use other acpfn functions as tools.
 *
 * Two compose modes:
 * - `"code"` (default): Claude writes a JS function body; the system executes
 *   it with tools injected as named async functions.
 * - `"tool_call"`: Claude uses `<tool_call>` XML blocks; the system parses
 *   them, executes tools, and feeds results back in a loop.
 */
export function compose<T = string>(
  options: ComposeOptions<T>,
): (input?: string) => Promise<AcpFnResult<T>> {
  const {
    prompt: promptTemplate,
    tools,
    composeMode = "code",
    schema,
    hooks,
    timeoutMs = 600_000,
    maxRetries = 0,
    maxIterations = 10,
    cwd,
    queue: queueOption,
    allowedTools,
    sdkOptions = {},
    model,
    maxTurns,
  } = options;

  const queue = resolveQueue(queueOption);

  return async (input?: string): Promise<AcpFnResult<T>> => {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const executor =
          composeMode === "code"
            ? executeComposeCode
            : executeComposeToolCall;
        return await executor(
          promptTemplate,
          input,
          tools,
          schema,
          hooks,
          timeoutMs,
          maxIterations,
          cwd,
          queue,
          allowedTools,
          sdkOptions,
          model,
          maxTurns,
        );
      } catch (err) {
        lastError = err as Error;
        if (attempt > maxRetries) break;
      }
    }

    throw lastError!;
  };
}

// ─── Code Execution Mode ─────────────────────────────────────

async function executeComposeCode<T>(
  promptTemplate: PromptInput,
  input: string | undefined,
  tools: ComposeOptions<T>["tools"],
  schema: ComposeOptions<T>["schema"],
  hooks: ComposeOptions<T>["hooks"],
  timeoutMs: number,
  maxIterations: number,
  cwd: string | undefined,
  queue: GlobalQueue | null,
  allowedTools: string[] | undefined,
  sdkOptions: Partial<Options> = {},
  model?: string,
  maxTurns?: number,
): Promise<AcpFnResult<T>> {
  let userPrompt = resolvePrompt(promptTemplate, input);

  if (hooks?.before) {
    const modified = await hooks.before({ prompt: userPrompt });
    if (typeof modified === "string") {
      userPrompt = modified;
    }
  }

  const start = Date.now();
  const preamble = buildCodePreamble(tools);

  // Wrap each tool fn so we can fire onToolCall hooks
  const wrappedTools: Record<string, AcpFn<any>> = {};
  for (const [name, def] of Object.entries(tools)) {
    wrappedTools[name] = async (toolInput?: string) => {
      const result = await def.fn(toolInput);
      if (hooks?.onToolCall) {
        await hooks.onToolCall({
          name,
          input: toolInput ?? "",
          result,
        });
      }
      return result;
    };
  }

  let lastError: string | undefined;
  let lastResponse = "";

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let fullPrompt: string;
    if (iteration === 0) {
      fullPrompt = `${preamble}\n\n${userPrompt}`;
    } else {
      fullPrompt = [
        preamble,
        "",
        `User request: ${userPrompt}`,
        "",
        `Your previous code produced an error:`,
        lastError,
        "",
        "Fix the code and try again. Wrap your corrected code in a ```js code fence.",
      ].join("\n");
    }

    const callFn = () =>
      spawnSdkQuery(fullPrompt, timeoutMs, cwd, hooks?.onStream, allowedTools, sdkOptions, model, maxTurns);
    const response = queue ? await queue.wrap(callFn) : await callFn();
    lastResponse = response;

    const code = extractCode(response);
    if (!code) {
      break;
    }

    try {
      const result = await executeCode(code, wrappedTools);

      const durationMs = Date.now() - start;
      const raw = response;
      let data: T;

      if (schema) {
        const toValidate =
          typeof result === "string" ? JSON.parse(result) : result;
        data = schema.parse(toValidate);
      } else {
        data = (
          typeof result === "string" ? result : JSON.stringify(result)
        ) as unknown as T;
      }

      if (hooks?.after) {
        await hooks.after({ result: raw, durationMs });
      }

      return { data, raw, durationMs };
    } catch (err) {
      lastError = (err as Error).message;
      if (iteration === maxIterations - 1) {
        throw new Error(
          `compose: code execution failed after ${maxIterations} attempts: ${lastError}`,
        );
      }
    }
  }

  // Fallback: no code block found, return prose response
  const durationMs = Date.now() - start;

  if (hooks?.after) {
    await hooks.after({ result: lastResponse, durationMs });
  }

  let data: T;
  if (schema) {
    const jsonStr = extractJson(lastResponse);
    const parsed = JSON.parse(jsonStr);
    data = schema.parse(parsed);
  } else {
    data = lastResponse as unknown as T;
  }

  return { data, raw: lastResponse, durationMs };
}

// ─── Tool Call Mode ──────────────────────────────────────────

interface HistoryStep {
  response: string;
  toolResults: Array<{ name: string; result: string }>;
}

async function executeComposeToolCall<T>(
  promptTemplate: PromptInput,
  input: string | undefined,
  tools: ComposeOptions<T>["tools"],
  schema: ComposeOptions<T>["schema"],
  hooks: ComposeOptions<T>["hooks"],
  timeoutMs: number,
  maxIterations: number,
  cwd: string | undefined,
  queue: GlobalQueue | null,
  allowedTools: string[] | undefined,
  sdkOptions: Partial<Options> = {},
  model?: string,
  maxTurns?: number,
): Promise<AcpFnResult<T>> {
  let userPrompt = resolvePrompt(promptTemplate, input);

  if (hooks?.before) {
    const modified = await hooks.before({ prompt: userPrompt });
    if (typeof modified === "string") {
      userPrompt = modified;
    }
  }

  const start = Date.now();
  const preamble = buildToolPreamble(tools);
  const history: HistoryStep[] = [];
  let finalResponse = "";

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const fullPrompt = buildToolCallIterationPrompt(
      preamble,
      userPrompt,
      history,
    );

    const callFn = () =>
      spawnSdkQuery(fullPrompt, timeoutMs, cwd, hooks?.onStream, allowedTools, sdkOptions, model, maxTurns);
    const response = queue ? await queue.wrap(callFn) : await callFn();

    const toolCalls = parseToolCalls(response);

    if (toolCalls.length === 0) {
      finalResponse = response;
      break;
    }

    const toolResults: HistoryStep["toolResults"] = [];

    for (const call of toolCalls) {
      const toolDef = tools[call.name];

      if (!toolDef) {
        toolResults.push({
          name: call.name,
          result: `Error: Unknown tool "${call.name}". Available tools: ${Object.keys(tools).join(", ")}`,
        });
        continue;
      }

      try {
        const result = await toolDef.fn(call.input);

        if (hooks?.onToolCall) {
          await hooks.onToolCall({
            name: call.name,
            input: call.input,
            result,
          });
        }

        toolResults.push({
          name: call.name,
          result:
            typeof result.data === "string"
              ? result.data
              : JSON.stringify(result.data),
        });
      } catch (err) {
        toolResults.push({
          name: call.name,
          result: `Error: ${(err as Error).message}`,
        });
      }
    }

    history.push({ response, toolResults });

    if (iteration === maxIterations - 1) {
      finalResponse = stripToolCalls(response);
    }
  }

  const durationMs = Date.now() - start;

  if (hooks?.after) {
    await hooks.after({ result: finalResponse, durationMs });
  }

  let data: T;
  if (schema) {
    const jsonStr = extractJson(finalResponse);
    const parsed = JSON.parse(jsonStr);
    data = schema.parse(parsed);
  } else {
    data = finalResponse as unknown as T;
  }

  return { data, raw: finalResponse, durationMs };
}

function buildToolCallIterationPrompt(
  preamble: string,
  userPrompt: string,
  history: HistoryStep[],
): string {
  if (history.length === 0) {
    return `${preamble}\n\n${userPrompt}`;
  }

  const historyText = history
    .map((step, i) => {
      const results = step.toolResults
        .map(
          (tr) =>
            `<tool_result name="${tr.name}">\n${tr.result}\n</tool_result>`,
        )
        .join("\n\n");

      return `Step ${i + 1} — Your response:\n${step.response}\n\nTool results:\n${results}`;
    })
    .join("\n\n");

  return [
    preamble,
    "",
    `User request: ${userPrompt}`,
    "",
    "Previous steps:",
    historyText,
    "",
    "Continue processing. Use <tool_call> if you need more tools, or provide your final answer without any <tool_call> blocks.",
  ].join("\n");
}
