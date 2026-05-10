import { spawn } from "node:child_process";
import type {
  DeepCodeCommand,
  DeepCodeFnOptions,
  DeepCodeFnResult,
  DeepCodeFn,
  PromptInput,
} from "./types.js";
import { GlobalQueue, getDefaultQueue } from "./queue.js";
import type { GlobalQueueOptions } from "./queue.js";
import { extractJson, resolvePrompt } from "./utils.js";

function resolveQueue(option: DeepCodeFnOptions["queue"]): GlobalQueue | null {
  if (!option) return null;
  if (option === true) return getDefaultQueue();
  if (option instanceof GlobalQueue) return option;
  return getDefaultQueue(option as GlobalQueueOptions);
}

export function resolveDeepCodeCommand(
  command: DeepCodeFnOptions["command"],
): DeepCodeCommand {
  if (typeof command === "string") {
    const [cmd, ...args] = command.split(/\s+/).filter(Boolean);
    return { command: cmd, args };
  }

  if (command) {
    return { command: command.command, args: command.args ?? [] };
  }

  if (process.env.DEEPCODE_COMMAND) {
    return resolveDeepCodeCommand(process.env.DEEPCODE_COMMAND);
  }

  return { command: "deepcode", args: ["--cli"] };
}

export function deepcodefn<T = string>(
  options?: DeepCodeFnOptions<T>,
): DeepCodeFn<T> {
  const opts = options ?? ({} as DeepCodeFnOptions<T>);

  const {
    prompt: promptTemplate,
    schema,
    hooks,
    timeoutMs = 600_000,
    cliFlags = [],
    maxRetries = 0,
    cwd,
    queue: queueOption,
    model,
    env: customEnv,
    command,
    promptMode = "chat",
    noPlanReview = true,
  } = opts;

  const queue = resolveQueue(queueOption);

  return async (input?: string): Promise<DeepCodeFnResult<T>> => {
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
            customEnv,
            command,
            promptMode,
            noPlanReview,
            model,
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
  schema: DeepCodeFnOptions<T>["schema"],
  hooks: DeepCodeFnOptions<T>["hooks"],
  timeoutMs: number,
  cliFlags: string[],
  cwd: string | undefined,
  customEnv?: Record<string, string>,
  command?: DeepCodeFnOptions<T>["command"],
  promptMode: "chat" | "requirement" = "chat",
  noPlanReview: boolean = true,
  model?: string,
): Promise<DeepCodeFnResult<T>> {
  let prompt: string;
  if (promptTemplate) {
    prompt = resolvePrompt(promptTemplate, input);
  } else if (input != null) {
    prompt = input;
  } else {
    throw new Error(
      'deepcodefn requires either a "prompt" option or an input argument',
    );
  }

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
  const commandOverride = command ?? customEnv?.DEEPCODE_COMMAND;
  const resolvedCommand = resolveDeepCodeCommand(commandOverride);
  const promptFlag = promptMode === "requirement" ? "--requirement" : "--chat";
  const args: string[] = [...(resolvedCommand.args ?? [])];

  if (model) args.push("--model", model);
  if (noPlanReview) args.push("--no-plan-review");
  args.push(...cliFlags);
  args.push(promptFlag, prompt);

  const raw = await new Promise<string>((resolve, reject) => {
    const spawnEnv = { ...process.env };
    delete spawnEnv["NODE_OPTIONS"];
    delete spawnEnv["NODE_PATH"];
    delete spawnEnv["TS_NODE_PROJECT"];
    delete spawnEnv["TS_NODE_FILES"];

    if (customEnv) {
      for (const [key, value] of Object.entries(customEnv)) {
        spawnEnv[key] = value;
      }
    }

    const proc = spawn(resolvedCommand.command, args, {
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
        reject(new Error(`deepcodefn timed out after ${timeoutMs}ms`));
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

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      reject(err);
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;

      if (code !== 0) {
        const msg = stderr.trim() || `deepcode exited with exit code ${code}`;
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
