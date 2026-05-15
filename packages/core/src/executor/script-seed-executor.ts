/**
 * Script Seed Executor
 *
 * Wraps external Seed scripts (nodejs/shell) into a SeedFn.
 *
 * For nodejs scripts:
 *   1. First tries to dynamically import the module and call its `run(ctx)` export.
 *      This allows scripts to use `ctx.spawn()` directly (in-process mode).
 *   2. Falls back to child-process execution expecting JSON stdout if no `run` export.
 *
 * For shell scripts:
 *   Executes as a child process expecting JSON stdout.
 *
 * For AI-driven Seed:
 *   1. AI generates a seed.js from the prompt + task context
 *   2. Generated script is validated (syntax, ESM)
 *   3. Executed through the nodejs in-process path
 *   4. Saved as seed.generated.js for debugging
 */

import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import type { SeedFn, SeedContext, SeedContinuationResult } from "../config/task-definition.ts";
import type { TaskMdSeed, TaskMdShape } from "../config/task-md-definition.ts";
import { executeSpawnCliCommand, parseSpawnCliLine } from "../seed/cli-spawn.ts";

/* ------------------------------------------------------------------ */
/*  createScriptSeedFn                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create a SeedFn wrapper for an external Seed script.
 *
 * @param seedConfig - Seed configuration from TASK.md frontmatter
 * @param taskDir - Absolute path to the task directory (for resolving relative paths)
 */
export function createScriptSeedFn(
  seedConfig: TaskMdSeed,
  taskDir: string,
): SeedFn {
  return async (ctx: SeedContext): Promise<SeedContinuationResult | boolean | void> => {
    if (!seedConfig.path) {
      throw new Error("seedData.path is required for nodejs/shell Seed scripts");
    }

    // Resolve seedData.path — search order:
    // 1. Task directory (co-located seed scripts, e.g. tasks/foo/seeds/x.js)
    // 2. Playbook directory (playbook-level seeds, e.g. playbooks/X/seeds/x.js)
    // 3. Project root (shared scripts reachable from journal-tree children)
    const fromTaskDir = resolve(taskDir, seedConfig.path);
    const fromPlaybookDir = resolve(taskDir, "..", "..", "seeds", seedConfig.path);
    const fromProjectDir = resolve(ctx.projectDir, seedConfig.path);
    let scriptPath: string;
    if (existsSync(fromTaskDir)) {
      scriptPath = fromTaskDir;
    } else if (existsSync(fromPlaybookDir)) {
      scriptPath = fromPlaybookDir;
    } else if (
      ctx.projectDir &&
      fromProjectDir !== fromTaskDir &&
      existsSync(fromProjectDir)
    ) {
      scriptPath = fromProjectDir;
    } else {
      throw new Error(
        `Seed script not found: ${seedConfig.path}\n` +
          `Tried (task dir):     ${fromTaskDir}\n` +
          `Tried (playbook dir): ${fromPlaybookDir}\n` +
          `Tried (project dir):  ${fromProjectDir}\n` +
          `Task directory:     ${taskDir}\n` +
          `Project directory:  ${ctx.projectDir}`,
      );
    }

    ctx.log.info(`Executing Seed script: ${seedConfig.path} (${seedConfig.type})`);

    // For nodejs scripts, try in-process import first
    if (seedConfig.type === "nodejs") {
      const imported = await tryImportAndRun(scriptPath, ctx);
      if (imported !== null) return imported;
      // Fall through to child-process mode if no `run` export found
    }

    // Child-process mode: run script and parse JSON stdout
    await runAsChildProcess(seedConfig, scriptPath, ctx);
  };
}

/* ------------------------------------------------------------------ */
/*  In-process import (nodejs only)                                    */
/* ------------------------------------------------------------------ */

/**
 * Try to dynamically import the script and call its `run(ctx)` export.
 * Returns null if no `run` export found (caller should fall back to child-process).
 * Returns the seed function's boolean return value otherwise.
 */
async function tryImportAndRun(
  scriptPath: string,
  ctx: SeedContext,
): Promise<SeedContinuationResult | boolean | null> {
  try {
    const fileUrl = pathToFileURL(scriptPath);
    // Cache-bust so re-runs pick up changes
    fileUrl.searchParams.set("t", String(Date.now()));
    const mod = await import(fileUrl.href);

    const runFn = mod.run ?? mod.default;
    if (typeof runFn !== "function") {
      return null; // No run export — fall back to child-process
    }

    const result = await runFn(ctx);
    if (result && typeof result === "object" && result.type === "seed-continuation") {
      return result;
    }
    if (typeof result === "boolean") return result;
    return ctx.loop.requested === "continue"
      ? ctx.loop.continue()
      : ctx.loop.requested === "stop"
        ? ctx.loop.stop()
        : false;
  } catch (err: any) {
    // If the import itself failed (syntax error, missing dep), propagate
    // so the Seed executor's error handling can deal with it.
    throw new Error(`Seed script import failed: ${scriptPath}\n${err.message}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Child-process execution (shell or nodejs fallback)                 */
/* ------------------------------------------------------------------ */

async function runAsChildProcess(
  seedConfig: TaskMdSeed,
  scriptPath: string,
  ctx: SeedContext,
): Promise<void> {
  // Build environment variables
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CONVERGE_PROJECT_DIR: ctx.projectDir,
    CONVERGE_CONTEXT_JSON: JSON.stringify({
      projectDir: ctx.projectDir,
      vars: ctx.vars,
    }),
  };

  for (const [key, value] of Object.entries(ctx.vars)) {
    if (value !== undefined && value !== null) {
      env[`CONVERGE_VAR_${key.toUpperCase()}`] = String(value);
    }
  }

  if (seedConfig.env) {
    Object.assign(env, seedConfig.env);
  }

  let command: string;
  let args: string[];

  if (seedConfig.type === "nodejs") {
    command = process.execPath;
    args = [scriptPath, ...(seedConfig.args ?? [])];
  } else if (seedConfig.type === "python") {
    command = process.env.PYTHON ?? "python3";
    args = [scriptPath, ...(seedConfig.args ?? [])];
  } else {
    command = scriptPath;
    args = seedConfig.args ?? [];
  }

  let stdout: string;
  try {
    stdout = execFileSync(command, args, {
      cwd: ctx.projectDir,
      env,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });
  } catch (err: any) {
    const stderr = err.stderr ? String(err.stderr) : "";
    throw new Error(
      `Seed script failed: ${seedConfig.path}\n` +
        `Exit code: ${err.status ?? "unknown"}\n` +
        `Stderr: ${stderr}\n` +
        `Stdout: ${err.stdout ? String(err.stdout) : "(empty)"}`,
    );
  }

  // Strip log lines and extract JSON
  const lines = stdout.split("\n");
  const logLines = lines.filter((l) => l.startsWith("[Seed]"));
  const jsonLines = lines.filter((l) => !l.startsWith("[Seed]"));

  for (const line of logLines) {
    ctx.log.info(line);
  }

  const jsonOutput = jsonLines.join("\n").trim();
  if (!jsonOutput) {
    ctx.log.warn("Seed script produced no JSON output — no tasks to spawn");
    return;
  }

  let tasks: TaskMdShape[];
  try {
    const parsed = JSON.parse(jsonOutput);
    tasks = Array.isArray(parsed) ? parsed : [parsed];
  } catch (err: any) {
    throw new Error(
      `Seed script output is not valid JSON: ${seedConfig.path}\n` +
        `Parse error: ${err.message}\n` +
        `Output (first 500 chars): ${jsonOutput.slice(0, 500)}`,
    );
  }

  ctx.log.info(`Seed script produced ${tasks.length} task(s)`);

  for (const task of tasks) {
    if (!task.id) {
      ctx.log.warn("Skipping task with no id in Seed script output");
      continue;
    }
    await ctx.spawn(task);
  }
}

/* ------------------------------------------------------------------ */
/*  AI-driven Seed                                                      */
/* ------------------------------------------------------------------ */

const Seed_API_REFERENCE = `## ctx API (available in your generated seed.js)

| Property | Description |
|----------|-------------|
| ctx.projectDir | Absolute project root path |
| ctx.vars | Variables from parent task |
| ctx.spawn(shape) | Write a child TASK.md to disk |
| ctx.ai.ask(question) | AI analysis — returns boolean or .asJson(schema) |
| ctx.log.info/warn/error(msg) | Logging |

## Spawn Shape (object passed to ctx.spawn())

Required: id (unique string, three-digit prefix + kebab-case)
Optional: title, body, dependencies, inputs, outputs, checks, skills, vars, tags

## Rules
- Use ESM: import { readFileSync } from 'fs'; (NOT require)
- Export: export async function run(ctx) { ... }
- Every spawn must have at least one check: { id, cmd, description }
- Set outputs to specific file paths, not globs
- Throw clear errors if input data is missing`;

/**
 * Create a SeedFn that drives AI to generate a seed.js script, then executes it.
 *
 * Flow:
 *   1. Build generation prompt from seedData.prompt + task context + API reference
 *   2. AI generates seed.js source code
 *   3. Validate: syntax check, ESM check, has run() export
 *   4. Write to disk as seed.generated.js (for debugging)
 *   5. Execute via the in-process nodejs path
 */
export function createAiSeedFn(seedConfig: TaskMdSeed, taskDir: string): SeedFn {
  return async (ctx: SeedContext): Promise<void> => {
    const maxAttempts = seedConfig.maxAttempts ?? 3;
    const prompt = seedConfig.prompt ?? "";

    ctx.log.info(
      `AI-driven Seed — generating script from prompt (max ${maxAttempts} attempts)`,
    );

    const generationPrompt = buildGenerationPrompt(prompt, ctx);

    let generatedSource: string | null = null;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      ctx.log.info(`Generation attempt ${attempt}/${maxAttempts}`);

      try {
        const { agentfn } = await import("@converge/agentfn");
        const { READONLY_TOOLS } = await import("../ai/context.ts");
        const { z } = await import("zod");

        const GeneratedSeed = z.object({
          source: z
            .string()
            .describe(
              "Complete seed.js source code (ESM, exports async run(ctx))",
            ),
          reasoning: z
            .string()
            .describe("Brief explanation of what the script does"),
        });

        const logDir = join(taskDir, "logs");
        await mkdir(logDir, { recursive: true });

        const executor = agentfn<{ source: string; reasoning: string }>({
          prompt:
            attempt === 1
              ? generationPrompt
              : `${generationPrompt}\n\nPREVIOUS ATTEMPT FAILED:\n${lastError}\n\nFix the issue and generate a corrected script.`,
          schema: GeneratedSeed,
          allowedTools: [...READONLY_TOOLS, "Bash"],
          timeoutMs: 120_000,
          cwd: ctx.projectDir,
          logDir,
        });

        const result = await executor();
        generatedSource = result.data.source;
        ctx.log.info(`AI reasoning: ${result.data.reasoning}`);

        // Validate the generated source
        const validationError = validateGeneratedSource(generatedSource);
        if (validationError) {
          lastError = validationError;
          ctx.log.warn(`Validation failed: ${validationError}`);
          generatedSource = null;
          continue;
        }

        break; // Success
      } catch (err: any) {
        lastError = err.message;
        ctx.log.warn(`Generation attempt ${attempt} failed: ${err.message}`);
        generatedSource = null;
      }
    }

    if (!generatedSource) {
      throw new Error(
        `AI Seed generation failed after ${maxAttempts} attempts.\n` +
          `Last error: ${lastError}\n` +
          `Prompt: ${prompt.slice(0, 200)}...`,
      );
    }

    // Write generated script to disk for debugging
    const generatedPath = join(taskDir, "seed.generated.js");
    await writeFile(generatedPath, generatedSource, "utf-8");
    ctx.log.info(`Generated script saved to: seed.generated.js`);

    // Execute the generated script via in-process import
    const imported = await tryImportAndRun(generatedPath, ctx);
    if (!imported) {
      throw new Error(
        "AI-generated seed.js has no `run` export. " +
          "The script must export an async function named `run`.",
      );
    }
  };
}

/**
 * Create a SeedFn that asks AI to emit explicit `converge spawn ...` commands.
 * The emitted commands are validated and executed in-process (no shell eval).
 */
export function createAiCliSeedFn(prompt: string, taskDir: string): SeedFn {
  return async (ctx: SeedContext): Promise<void> => {
    const { agentfn } = await import("@converge/agentfn");
    const { READONLY_TOOLS } = await import("../ai/context.ts");
    const { z } = await import("zod");

    const CmdSchema = z.object({
      commands: z.union([z.array(z.string()), z.string()]),
      done: z.boolean().optional(),
      reasoning: z.string().optional(),
    });

    const seedPrompt = [
      "Generate only explicit CLI spawn commands for Converge.",
      "Use one command per line in the `commands` array.",
      "",
      "Allowed commands:",
      "1) converge spawn task --id <id> [--title <title>] [--depends-on <id>] [--input <path>] [--output <path>] [--tag <tag>] [--var k=v] [--body <text>]",
      "2) converge spawn template --path <template-path> [--id <id>] [--var k=v]",
      "",
      "Rules:",
      "- IDs must be deterministic and stable for same input.",
      "- Do not output shell wrappers; output only converge spawn commands.",
      "- Emit at least one command when work is needed.",
      "",
      "TASK INSTRUCTION:",
      prompt,
    ].join("\n");

    const playbook = process.env.CONVERGE_PLAYBOOK || "default";
    const taskId = String(
      (ctx.vars as Record<string, unknown>).taskId || "unknown-seed-task",
    );
    const journalTaskDir = join(
      ctx.projectDir,
      ".converge",
      "journal",
      playbook,
      "tasks",
      taskId,
    );
    const logDir = join(journalTaskDir, "logs");
    await mkdir(logDir, { recursive: true });

    const executor = agentfn<{
      commands: string[];
      done?: boolean;
      reasoning?: string;
    }>({
      prompt: seedPrompt,
      schema: CmdSchema,
      allowedTools: [...READONLY_TOOLS, "Bash"],
      timeoutMs: 120_000,
      cwd: ctx.projectDir,
      logDir,
    });

    const result = await executor();
    const rawCommands = result.data.commands;
    const commands = Array.isArray(rawCommands)
      ? rawCommands
      : rawCommands
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

    const traceDir = journalTaskDir;
    await mkdir(traceDir, { recursive: true });

    const rawPath = join(traceDir, "seed.commands.raw.md");
    const parsedPath = join(traceDir, "seed.commands.validated.json");
    const executedPath = join(traceDir, "seed.commands.executed.jsonl");

    await writeFile(rawPath, commands.join("\n") + "\n", "utf-8");

    const parsed = commands.map((line) => ({
      line,
      parsed: parseSpawnCliLine(line),
    }));
    await writeFile(parsedPath, JSON.stringify(parsed, null, 2), "utf-8");

    const executedLines: string[] = [];
    for (const item of parsed) {
      await executeSpawnCliCommand(item.parsed, ctx);
      executedLines.push(JSON.stringify({ command: item.line, status: "ok" }));
    }
    await writeFile(executedPath, executedLines.join("\n") + "\n", "utf-8");

    if (parsed.length === 0 && result.data.done !== true) {
      throw new Error("CLI seed emitted zero spawn commands without done=true");
    }
  };
}

/**
 * Build the full prompt for AI Seed generation.
 */
function buildGenerationPrompt(userPrompt: string, ctx: SeedContext): string {
  const varsStr =
    Object.keys(ctx.vars).length > 0
      ? `TASK VARIABLES: ${JSON.stringify(ctx.vars, null, 2)}`
      : "TASK VARIABLES: (none)";

  return `You are generating a Seed (Work Breakdown Structure) script for the converge task system.

PROJECT DIRECTORY: ${ctx.projectDir}
${varsStr}

USER PROMPT:
${userPrompt}

Generate a complete seed.js file as a JSON object with "source" and "reasoning" fields.

The "source" field must contain valid JavaScript (ESM) that:
1. Exports \`async function run(ctx)\`
2. Calls \`ctx.spawn()\` for each child task to create
3. Each spawn has: id (three-digit prefix + kebab-case), title, outputs, checks, body
4. Uses ESM imports (import { readFileSync } from 'fs') — NOT require()
5. Can use \`ctx.ai.ask(question)\` for AI-driven analysis during execution
6. Can use \`ctx.ai.ask(question).asJson(schema)\` for structured AI responses

${Seed_API_REFERENCE}

IMPORTANT:
- The source code must be self-contained and immediately executable
- Use ctx.projectDir to build absolute file paths for reading
- If reading JSON files, use readFileSync with join(ctx.projectDir, relativePath)
- Handle the case where input files don't exist (throw clear error)
- Zero spawns is an error — always spawn at least one task`;
}

/**
 * Validate generated Seed source code before execution.
 * Returns error message if invalid, null if valid.
 */
function validateGeneratedSource(source: string): string | null {
  // Check for CommonJS patterns
  if (/\brequire\s*\(/.test(source) && !/\/\/.*require/.test(source)) {
    return "Generated script uses require() — must use ESM imports";
  }
  if (/\bmodule\.exports\b/.test(source)) {
    return "Generated script uses module.exports — must use export";
  }

  // Check for run export
  if (
    !/export\s+(async\s+)?function\s+run\b/.test(source) &&
    !/export\s+default\s+(async\s+)?function/.test(source)
  ) {
    return "Generated script missing `export async function run(ctx)` or `export default async function`";
  }

  // Check for dangerous operations
  if (/process\.exit\s*\(/.test(source)) {
    return "Generated script calls process.exit() — not allowed in Seed scripts";
  }

  // Basic syntax check via Function constructor (doesn't execute, just parses)
  try {
    // We can't truly syntax-check ESM without importing, but we can catch
    // obvious issues by checking for balanced braces
    let depth = 0;
    for (const char of source) {
      if (char === "{") depth++;
      if (char === "}") depth--;
      if (depth < 0) return "Unbalanced braces in generated script";
    }
    if (depth !== 0) return "Unbalanced braces in generated script";
  } catch (err: any) {
    return `Syntax validation failed: ${err.message}`;
  }

  return null;
}
