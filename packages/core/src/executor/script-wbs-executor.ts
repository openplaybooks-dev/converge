/**
 * Script WBS Executor
 *
 * Wraps external WBS scripts (nodejs/shell) into a WbsFn.
 *
 * For nodejs scripts:
 *   1. First tries to dynamically import the module and call its `run(ctx)` export.
 *      This allows scripts to use `ctx.spawn()` directly (in-process mode).
 *   2. Falls back to child-process execution expecting JSON stdout if no `run` export.
 *
 * For shell scripts:
 *   Executes as a child process expecting JSON stdout.
 *
 * For AI-driven WBS:
 *   1. AI generates a wbs.js from the prompt + task context
 *   2. Generated script is validated (syntax, ESM)
 *   3. Executed through the nodejs in-process path
 *   4. Saved as wbs.generated.js for debugging
 */

import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import type { WbsFn, WbsContext } from '../config/task-definition.ts';
import type { TaskMdWbs, TaskMdShape } from '../config/task-md-definition.ts';

/* ------------------------------------------------------------------ */
/*  createScriptWbsFn                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create a WbsFn wrapper for an external WBS script.
 *
 * @param wbsConfig - WBS configuration from TASK.md frontmatter
 * @param taskDir - Absolute path to the task directory (for resolving relative paths)
 */
export function createScriptWbsFn(wbsConfig: TaskMdWbs, taskDir: string): WbsFn {
  return async (ctx: WbsContext): Promise<void> => {
    if (!wbsConfig.path) {
      throw new Error('wbs.path is required for nodejs/shell WBS scripts');
    }
    const scriptPath = resolve(taskDir, wbsConfig.path);

    if (!existsSync(scriptPath)) {
      throw new Error(
        `WBS script not found: ${wbsConfig.path}\n` +
        `Resolved to: ${scriptPath}\n` +
        `Task directory: ${taskDir}`
      );
    }

    ctx.log.info(`Executing WBS script: ${wbsConfig.path} (${wbsConfig.type})`);

    // For nodejs scripts, try in-process import first
    if (wbsConfig.type === 'nodejs') {
      const imported = await tryImportAndRun(scriptPath, ctx);
      if (imported) return;
      // Fall through to child-process mode if no `run` export found
    }

    // Child-process mode: run script and parse JSON stdout
    await runAsChildProcess(wbsConfig, scriptPath, ctx);
  };
}

/* ------------------------------------------------------------------ */
/*  In-process import (nodejs only)                                    */
/* ------------------------------------------------------------------ */

/**
 * Try to dynamically import the script and call its `run(ctx)` export.
 * Returns true if the script had a `run` export and was executed.
 */
async function tryImportAndRun(scriptPath: string, ctx: WbsContext): Promise<boolean> {
  try {
    const fileUrl = pathToFileURL(scriptPath);
    // Cache-bust so re-runs pick up changes
    fileUrl.searchParams.set('t', String(Date.now()));
    const mod = await import(fileUrl.href);

    const runFn = mod.run ?? mod.default;
    if (typeof runFn !== 'function') {
      return false; // No run export — fall back to child-process
    }

    await runFn(ctx);
    return true;
  } catch (err: any) {
    // If the import itself failed (syntax error, missing dep), propagate
    // so the WBS executor's error handling can deal with it.
    throw new Error(
      `WBS script import failed: ${scriptPath}\n${err.message}`
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Child-process execution (shell or nodejs fallback)                 */
/* ------------------------------------------------------------------ */

async function runAsChildProcess(
  wbsConfig: TaskMdWbs,
  scriptPath: string,
  ctx: WbsContext,
): Promise<void> {
  // Build environment variables
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
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

  if (wbsConfig.env) {
    Object.assign(env, wbsConfig.env);
  }

  let command: string;
  let args: string[];

  if (wbsConfig.type === 'nodejs') {
    command = process.execPath;
    args = [scriptPath, ...(wbsConfig.args ?? [])];
  } else {
    command = scriptPath;
    args = wbsConfig.args ?? [];
  }

  let stdout: string;
  try {
    stdout = execFileSync(command, args, {
      cwd: ctx.projectDir,
      env,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });
  } catch (err: any) {
    const stderr = err.stderr ? String(err.stderr) : '';
    throw new Error(
      `WBS script failed: ${wbsConfig.path}\n` +
      `Exit code: ${err.status ?? 'unknown'}\n` +
      `Stderr: ${stderr}\n` +
      `Stdout: ${err.stdout ? String(err.stdout) : '(empty)'}`
    );
  }

  // Strip log lines and extract JSON
  const lines = stdout.split('\n');
  const logLines = lines.filter(l => l.startsWith('[WBS]'));
  const jsonLines = lines.filter(l => !l.startsWith('[WBS]'));

  for (const line of logLines) {
    ctx.log.info(line);
  }

  const jsonOutput = jsonLines.join('\n').trim();
  if (!jsonOutput) {
    ctx.log.warn('WBS script produced no JSON output — no tasks to spawn');
    return;
  }

  let tasks: TaskMdShape[];
  try {
    const parsed = JSON.parse(jsonOutput);
    tasks = Array.isArray(parsed) ? parsed : [parsed];
  } catch (err: any) {
    throw new Error(
      `WBS script output is not valid JSON: ${wbsConfig.path}\n` +
      `Parse error: ${err.message}\n` +
      `Output (first 500 chars): ${jsonOutput.slice(0, 500)}`
    );
  }

  ctx.log.info(`WBS script produced ${tasks.length} task(s)`);

  for (const task of tasks) {
    if (!task.id) {
      ctx.log.warn('Skipping task with no id in WBS script output');
      continue;
    }
    await ctx.spawn(task);
  }
}

/* ------------------------------------------------------------------ */
/*  AI-driven WBS                                                      */
/* ------------------------------------------------------------------ */

const WBS_API_REFERENCE = `## ctx API (available in your generated wbs.js)

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
 * Create a WbsFn that drives AI to generate a wbs.js script, then executes it.
 *
 * Flow:
 *   1. Build generation prompt from wbs.prompt + task context + API reference
 *   2. AI generates wbs.js source code
 *   3. Validate: syntax check, ESM check, has run() export
 *   4. Write to disk as wbs.generated.js (for debugging)
 *   5. Execute via the in-process nodejs path
 */
export function createAiWbsFn(wbsConfig: TaskMdWbs, taskDir: string): WbsFn {
  return async (ctx: WbsContext): Promise<void> => {
    const maxAttempts = wbsConfig.maxAttempts ?? 3;
    const prompt = wbsConfig.prompt ?? '';

    ctx.log.info(`AI-driven WBS — generating script from prompt (max ${maxAttempts} attempts)`);

    const generationPrompt = buildGenerationPrompt(prompt, ctx);

    let generatedSource: string | null = null;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      ctx.log.info(`Generation attempt ${attempt}/${maxAttempts}`);

      try {
        const { agentfn } = await import('@converge/agentfn');
        const { READONLY_TOOLS } = await import('../ai/context.ts');
        const { z } = await import('zod');

        const GeneratedWbs = z.object({
          source: z.string().describe('Complete wbs.js source code (ESM, exports async run(ctx))'),
          reasoning: z.string().describe('Brief explanation of what the script does'),
        });

        const logDir = join(taskDir, 'logs');
        await mkdir(logDir, { recursive: true });

        const executor = agentfn<{ source: string; reasoning: string }>({
          prompt: attempt === 1
            ? generationPrompt
            : `${generationPrompt}\n\nPREVIOUS ATTEMPT FAILED:\n${lastError}\n\nFix the issue and generate a corrected script.`,
          schema: GeneratedWbs,
          allowedTools: [...READONLY_TOOLS, 'Bash'],
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
        `AI WBS generation failed after ${maxAttempts} attempts.\n` +
        `Last error: ${lastError}\n` +
        `Prompt: ${prompt.slice(0, 200)}...`
      );
    }

    // Write generated script to disk for debugging
    const generatedPath = join(taskDir, 'wbs.generated.js');
    await writeFile(generatedPath, generatedSource, 'utf-8');
    ctx.log.info(`Generated script saved to: wbs.generated.js`);

    // Execute the generated script via in-process import
    const imported = await tryImportAndRun(generatedPath, ctx);
    if (!imported) {
      throw new Error(
        'AI-generated wbs.js has no `run` export. ' +
        'The script must export an async function named `run`.'
      );
    }
  };
}

/**
 * Build the full prompt for AI WBS generation.
 */
function buildGenerationPrompt(userPrompt: string, ctx: WbsContext): string {
  const varsStr = Object.keys(ctx.vars).length > 0
    ? `TASK VARIABLES: ${JSON.stringify(ctx.vars, null, 2)}`
    : 'TASK VARIABLES: (none)';

  return `You are generating a WBS (Work Breakdown Structure) script for the converge task system.

PROJECT DIRECTORY: ${ctx.projectDir}
${varsStr}

USER PROMPT:
${userPrompt}

Generate a complete wbs.js file as a JSON object with "source" and "reasoning" fields.

The "source" field must contain valid JavaScript (ESM) that:
1. Exports \`async function run(ctx)\`
2. Calls \`ctx.spawn()\` for each child task to create
3. Each spawn has: id (three-digit prefix + kebab-case), title, outputs, checks, body
4. Uses ESM imports (import { readFileSync } from 'fs') — NOT require()
5. Can use \`ctx.ai.ask(question)\` for AI-driven analysis during execution
6. Can use \`ctx.ai.ask(question).asJson(schema)\` for structured AI responses

${WBS_API_REFERENCE}

IMPORTANT:
- The source code must be self-contained and immediately executable
- Use ctx.projectDir to build absolute file paths for reading
- If reading JSON files, use readFileSync with join(ctx.projectDir, relativePath)
- Handle the case where input files don't exist (throw clear error)
- Zero spawns is an error — always spawn at least one task`;
}

/**
 * Validate generated WBS source code before execution.
 * Returns error message if invalid, null if valid.
 */
function validateGeneratedSource(source: string): string | null {
  // Check for CommonJS patterns
  if (/\brequire\s*\(/.test(source) && !/\/\/.*require/.test(source)) {
    return 'Generated script uses require() — must use ESM imports';
  }
  if (/\bmodule\.exports\b/.test(source)) {
    return 'Generated script uses module.exports — must use export';
  }

  // Check for run export
  if (!/export\s+(async\s+)?function\s+run\b/.test(source) &&
      !/export\s+default\s+(async\s+)?function/.test(source)) {
    return 'Generated script missing `export async function run(ctx)` or `export default async function`';
  }

  // Check for dangerous operations
  if (/process\.exit\s*\(/.test(source)) {
    return 'Generated script calls process.exit() — not allowed in WBS scripts';
  }

  // Basic syntax check via Function constructor (doesn't execute, just parses)
  try {
    // We can't truly syntax-check ESM without importing, but we can catch
    // obvious issues by checking for balanced braces
    let depth = 0;
    for (const char of source) {
      if (char === '{') depth++;
      if (char === '}') depth--;
      if (depth < 0) return 'Unbalanced braces in generated script';
    }
    if (depth !== 0) return 'Unbalanced braces in generated script';
  } catch (err: any) {
    return `Syntax validation failed: ${err.message}`;
  }

  return null;
}
