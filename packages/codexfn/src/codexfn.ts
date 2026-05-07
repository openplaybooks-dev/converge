import { spawn } from "node:child_process";
import type {
  CodexFnOptions,
  CodexFnResult,
  CodexFn,
  PromptInput,
} from "./types.js";
import { GlobalQueue, getDefaultQueue } from "./queue.js";
import type { GlobalQueueOptions } from "./queue.js";
import { extractJson, resolvePrompt } from "./utils.js";

function resolveQueue(option: CodexFnOptions["queue"]): GlobalQueue | null {
  if (!option) return null;
  if (option === true) return getDefaultQueue();
  if (option instanceof GlobalQueue) return option;
  return getDefaultQueue(option as GlobalQueueOptions);
}

export function codexfn<T = string>(options?: CodexFnOptions<T>): CodexFn<T> {
  const opts = options ?? ({} as CodexFnOptions<T>);

  const {
    prompt: promptTemplate,
    schema,
    hooks,
    timeoutMs = 120_000,
    cliFlags = [],
    maxRetries = 0,
    cwd,
    queue: queueOption,
    model,
    sandbox = "danger-full-access",
    skipGitRepoCheck = true,
    ephemeral = true,
    env: customEnv,
  } = opts;

  const queue = resolveQueue(queueOption);

  return async (input?: string): Promise<CodexFnResult<T>> => {
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
            model,
            sandbox,
            skipGitRepoCheck,
            ephemeral,
            customEnv,
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

export async function executeViaCli<T>(
  promptTemplate: PromptInput | undefined,
  input: string | undefined,
  schema: CodexFnOptions<T>["schema"],
  hooks: CodexFnOptions<T>["hooks"],
  timeoutMs: number,
  cliFlags: string[],
  cwd: string | undefined,
  model?: string,
  sandbox: string = "danger-full-access",
  skipGitRepoCheck: boolean = true,
  ephemeral: boolean = true,
  customEnv?: Record<string, string>,
): Promise<CodexFnResult<T>> {
  let prompt: string;
  if (promptTemplate) {
    prompt = resolvePrompt(promptTemplate, input);
  } else if (input != null) {
    prompt = input;
  } else {
    throw new Error(
      'codexfn requires either a "prompt" option or an input argument',
    );
  }

  // Append JSON output instructions when schema is provided
  if (schema) {
    prompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown, no explanation. The JSON must match the expected schema exactly.`;
  }

  if (hooks?.before) {
    const modified = await hooks.before({ prompt });
    if (typeof modified === "string") {
      prompt = modified;
    }
  }

  const start = Date.now();

  // Build codex CLI args: codex exec [flags] "PROMPT"
  const args: string[] = ["exec"];

  args.push("--sandbox", sandbox);
  if (skipGitRepoCheck) args.push("--skip-git-repo-check");
  if (ephemeral) args.push("--ephemeral");
  if (model) args.push("--model", model);

  // Extra CLI flags
  args.push(...cliFlags);

  // Prompt is positional (last arg)
  args.push(prompt);

  const raw = await new Promise<string>((resolve, reject) => {
    const spawnEnv = { ...process.env };
    // Strip Node.js-specific env vars
    delete spawnEnv["NODE_OPTIONS"];
    delete spawnEnv["NODE_PATH"];
    delete spawnEnv["TS_NODE_PROJECT"];
    delete spawnEnv["TS_NODE_FILES"];

    if (customEnv) {
      for (const [key, value] of Object.entries(customEnv)) {
        spawnEnv[key] = value;
      }
    }

    const proc = spawn("codex", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: spawnEnv,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill();
        reject(new Error(`codexfn timed out after ${timeoutMs}ms`));
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
        const msg = stderr.trim() || `codex exited with exit code ${code}`;
        reject(new Error(msg));
      } else {
        resolve(stdout);
      }
    });
  });

  const durationMs = Date.now() - start;

  if (hooks?.after) {
    await hooks.after({ result: raw, durationMs });
  }

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
