import { spawn } from "node:child_process";
import type {
  ComposeOptions,
  GeminiFn,
  GeminiFnResult,
  PromptInput,
} from "./types.js";
import { GlobalQueue, getDefaultQueue } from "./queue.js";
import type { GlobalQueueOptions } from "./queue.js";
import { resolvePrompt, extractJson } from "./utils.js";

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

/** Extract a JS/TS code block from Gemini's response */
export function extractCode(text: string): string | null {
  const re = /```(?:js|javascript|typescript|ts)?\s*\n([\s\S]*?)```/;
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

/** Parse `<tool_call>` blocks from Gemini's response */
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

/** Build the code-mode preamble that tells Gemini to write executable JS */
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

// ─── CLI Call ────────────────────────────────────────────────

/** Spawn the Gemini CLI and collect output */
function spawnCli(
  prompt: string,
  cliFlags: string[],
  cwd: string | undefined,
  timeoutMs: number,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn(
      "gemini",
      [
        "-p",
        prompt,
        ...cliFlags,
      ],
      { cwd, stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill();
        reject(new Error(`compose timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    proc.stdout.on("data", (chunk: Buffer) => {
      const str = chunk.toString();
      stdout += str;
      onStream?.(str);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;

      if (code !== 0) {
        reject(
          new Error(stderr.trim() || `gemini exited with code ${code}`),
        );
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Execute a code string with tools injected as named async functions.
 * Returns whatever the code `return`s.
 */
export async function executeCode(
  code: string,
  tools: Record<string, GeminiFn<any>>,
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

// ─── compose() — main entry point ───────────────────────────

/**
 * Create a composed function that can use other geminifn functions as tools.
 *
 * Two compose modes:
 * - `"code"` (default): Gemini writes a JS function body; the system executes
 *   it with tools injected as named async functions.
 * - `"tool_call"`: Gemini uses `<tool_call>` XML blocks; the system parses
 *   them, executes tools, and feeds results back in a loop.
 */
export function compose<T = string>(
  options: ComposeOptions<T>,
): (input?: string) => Promise<GeminiFnResult<T>> {
  const {
    prompt: promptTemplate,
    tools,
    composeMode = "code",
    schema,
    hooks,
    timeoutMs = 120_000,
    cliFlags = [],
    maxRetries = 0,
    maxIterations = 10,
    cwd,
    queue: queueOption,
  } = options;

  const queue = resolveQueue(queueOption);

  return async (input?: string): Promise<GeminiFnResult<T>> => {
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
          cliFlags,
          maxIterations,
          cwd,
          queue,
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
  cliFlags: string[],
  maxIterations: number,
  cwd: string | undefined,
  queue: GlobalQueue | null,
): Promise<GeminiFnResult<T>> {
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
  const wrappedTools: Record<string, GeminiFn<any>> = {};
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
      spawnCli(fullPrompt, cliFlags, cwd, timeoutMs, hooks?.onStream);
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
  cliFlags: string[],
  maxIterations: number,
  cwd: string | undefined,
  queue: GlobalQueue | null,
): Promise<GeminiFnResult<T>> {
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
      spawnCli(fullPrompt, cliFlags, cwd, timeoutMs, hooks?.onStream);
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
