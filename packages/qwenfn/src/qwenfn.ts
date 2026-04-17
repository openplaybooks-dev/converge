import { spawn } from "node:child_process";
import type {
  QwenFnOptions,
  QwenFnResult,
  QwenFn,
  PromptInput,
} from "./types.js";
import { GlobalQueue, getDefaultQueue } from "./queue.js";
import type { GlobalQueueOptions } from "./queue.js";
import { extractJson, resolvePrompt } from "./utils.js";
import { enhancePrompt } from "./skills.js";

/** Resolve the queue option to a GlobalQueue instance or null */
function resolveQueue(
  option: QwenFnOptions["queue"],
): GlobalQueue | null {
  if (!option) return null;
  if (option === true) return getDefaultQueue();
  if (option instanceof GlobalQueue) return option;
  return getDefaultQueue(option as GlobalQueueOptions);
}

/**
 * Create a callable function backed by the Qwen CLI.
 *
 * Spawns `qwen -y --print -p "..."` as a subprocess.
 *
 * @example One-off call
 * ```typescript
 * const fn = qwenfn({ prompt: "Translate {{input}} to French" });
 * const { data } = await fn("hello");
 * ```
 *
 * @example With schema validation
 * ```typescript
 * const fn = qwenfn({
 *   prompt: "Give me a person as JSON",
 *   schema: z.object({ name: z.string(), age: z.number() }),
 * });
 * const { data } = await fn();
 * // data is typed as { name: string; age: number }
 * ```
 */
export function qwenfn<T = string>(
  options?: QwenFnOptions<T>,
): QwenFn<T> {
  const opts = options ?? ({} as QwenFnOptions<T>);

  const {
    prompt: promptTemplate,
    schema,
    hooks,
    timeoutMs = 120_000,
    cliFlags = [],
    maxRetries = 0,
    cwd,
    queue: queueOption,
  } = opts;

  const queue = resolveQueue(queueOption);

  return async (input?: string): Promise<QwenFnResult<T>> => {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const run = () =>
          executeViaCli(
            promptTemplate,
            input,
            schema,
            hooks,
            timeoutMs,
            cliFlags,
            cwd,
          );
        return queue ? await queue.wrap(run) : await run();
      } catch (err) {
        lastError = err as Error;
        if (attempt > maxRetries) break;
      }
    }

    throw lastError!;
  };
}

// ─── CLI Execution ──────────────────────────────────────────

export async function executeViaCli<T>(
  promptTemplate: PromptInput | undefined,
  input: string | undefined,
  schema: QwenFnOptions<T>["schema"],
  hooks: QwenFnOptions<T>["hooks"],
  timeoutMs: number,
  cliFlags: string[],
  cwd: string | undefined,
): Promise<QwenFnResult<T>> {
  let prompt: string;
  if (promptTemplate) {
    prompt = resolvePrompt(promptTemplate, input);
  } else if (input != null) {
    prompt = input;
  } else {
    throw new Error(
      'qwenfn requires either a "prompt" option or an input argument',
    );
  }

  // Auto-load skills and agents referenced in prompt (adaptive enhancement)
  prompt = enhancePrompt(prompt, cwd);

  // before hook
  if (hooks?.before) {
    const modified = await hooks.before({ prompt });
    if (typeof modified === "string") {
      prompt = modified;
    }
  }

  const start = Date.now();

  const args = [
    "-y",
    "-p",
    prompt,
    ...cliFlags,
  ];

  const raw = await new Promise<string>((resolve, reject) => {
    const proc = spawn("qwen", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill();
        reject(new Error(`qwenfn timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    proc.stdout.on("data", (chunk: Buffer) => {
      const str = chunk.toString();
      stdout += str;
      hooks?.onStream?.(str);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;

      if (code !== 0) {
        const msg = stderr.trim() || `qwen exited with exit code ${code}`;
        reject(new Error(msg));
      } else {
        resolve(stdout);
      }
    });
  });

  const durationMs = Date.now() - start;

  // after hook
  if (hooks?.after) {
    await hooks.after({ result: raw, durationMs });
  }

  // Schema parsing
  let data: T;
  if (schema) {
    const jsonStr = extractJson(raw);
    const parsed = JSON.parse(jsonStr);
    data = schema.parse(parsed);
  } else {
    data = raw as unknown as T;
  }

  return { data, raw, durationMs };
}
