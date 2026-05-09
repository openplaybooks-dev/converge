/**
 * Seed Executor
 *
 * Executes a seed() function, providing SeedContext with ctx.spawn().
 *
 * Spawn behavior:
 *   - Children are spawned FLAT at the execution tasks root level
 *   - Each child gets its own tasks/{id}/ directory with full execution support
 *     (checkpoints, attempts, logs — same as a statically-defined task)
 *   - Deep seeding: a seeded task that itself spawns children also places
 *     them flat, supporting arbitrary nesting depth without filesystem nesting
 *
 * Children are NOT executed here — the DAG runner picks them up after the
 * seed task completes.
 */

import { basename, dirname, join, relative } from "node:path";
import { ArtifactStore } from "../artifacts/index.ts";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { glob } from "glob";
import { z } from "zod";
import { agentfn } from "@converge/agentfn";
import { READONLY_TOOLS } from "../ai/context.ts";
import type {
  SeedFn,
  SeedContext,
  SeedSpawnTarget,
  SeedSpawnOptions,
  TaskDefinition,
  Check,
  AskResult,
  RawMarkdown,
  TemplateRef,
} from "../config/task-definition.ts";
import { TaskDefinitionBuilder } from "../config/task-definition.ts";
import type { TaskMdShape } from "../config/task-md-definition.ts";
import { parseTaskMdString } from "../config/task-md-definition.ts";
import type { JournalContext } from "../navigator/repair/types.ts";
import { logTaskEvent } from "../journal/writer.ts";

import type { Gap } from "../task/gap/types.ts";

/* ------------------------------------------------------------------ */
/*  Transient-error detection                                          */
/* ------------------------------------------------------------------ */

/**
 * Recognize errors that came from a downstream service (rate limit, quota,
 * outage, network blip) rather than from a bug in the Seed script itself.
 * AI repair cannot fix these — rewriting the script wouldn't help, and the
 * call costs API tokens for no benefit.
 *
 * Patterns matched against `error.name`, `error.message`, and any nested
 * stdout/stderr captured by the script-Seed executor.
 */
const TRANSIENT_REMOTE_PATTERNS: RegExp[] = [
  // HTTP rate-limit / overload / unavailable
  /\b429\b/,
  /\b50[234]\b/,
  /\bRESOURCE_EXHAUSTED\b/i,
  /\bquota\b/i,
  /\brate[ -]?limit/i,
  /\boverloaded\b/i,
  /\bservice unavailable\b/i,
  // Network / DNS
  /\bECONNRESET\b/,
  /\bECONNREFUSED\b/,
  /\bETIMEDOUT\b/,
  /\bENOTFOUND\b/,
  /\bsocket hang up\b/i,
  // Common remote-credit failures
  /\bcredits?\s+(?:are\s+)?depleted\b/i,
  /\bbilling\b.*\b(?:exhausted|expired)\b/i,
];

function isTransientRemoteError(error: Error): boolean {
  const haystack = `${error.name}\n${error.message}\n${error.stack ?? ""}`;
  return TRANSIENT_REMOTE_PATTERNS.some((rx) => rx.test(haystack));
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

/* ------------------------------------------------------------------ */
/*  Result                                                            */
/* ------------------------------------------------------------------ */

export interface SpawnedTaskInfo {
  id: string;
  writeToPath: string;
  title?: string;
  depends_on?: string[];
  tags?: string[];
  inputs?: string[];
  outputs?: string[];
  checks?: Array<{ id: string; description?: string; cmd?: string; type?: string }>;
  skill?: string | string[];
  vars?: Record<string, unknown>;
}

export interface SeedExecutorResult {
  spawnCount: number;
  durationMs: number;
  error?: string;
  /** When true, the seed function wants another iteration (incremental seeding). */
  keepLooping?: boolean;
  /** Spawned children info — used by caller to update DAG/runstate directly. */
  spawnedTasks?: SpawnedTaskInfo[];
}

/* ------------------------------------------------------------------ */
/*  SeedExecutor                                                        */
/* ------------------------------------------------------------------ */

export class SeedExecutor {
  constructor(
    private projectDir: string,
    private journalCtx: JournalContext,
    /** Absolute path to the parent task's .ts file (used to derive tasks/ dir) */
    private taskFilePath: string,
    private taskMeta: {
      id: string;
      title?: string;
      vars?: Record<string, unknown>;
    },
  ) {}

  /**
   * Validate that declared inputs exist before Seed execution.
   * Returns list of missing input patterns.
   */
  async validateInputs(inputs: string[] | undefined): Promise<string[]> {
    if (!inputs || inputs.length === 0) {
      return [];
    }

    const missingInputs: string[] = [];

    for (const inputPattern of inputs) {
      const files = await glob(inputPattern, {
        cwd: this.projectDir,
        absolute: false,
      });
      if (files.length === 0) {
        missingInputs.push(inputPattern);
      }
    }

    return missingInputs;
  }

  /**
   * Run the seed function once.
   * Each ctx.spawn() call writes the child task file to disk.
   * The engine picks it up on the next scan iteration.
   *
   * Infrastructure-first approach:
   * 1. Create journal directories BEFORE execution
   * 2. Initialize FactsLogger BEFORE execution
   * 3. Log errors as facts if Seed crashes
   * 4. Write error logs even on immediate failure
   *
   * @param seedFn - The Seed function to execute
   * @param attemptNumber - Current attempt number (default: 1)
   */
  async run(
    seedFn: SeedFn,
    attemptNumber: number = 1,
  ): Promise<SeedExecutorResult> {
    const start = Date.now();
    const seededAt = new Date().toISOString();

    // ========================================================================
    // STEP 1: CREATE INFRASTRUCTURE FIRST (before any execution)
    // ========================================================================
    // Spawned children always go to the journal, never to the playbook source.
    const taskDir = join(this.projectDir, ".converge", "journal", this.journalCtx.epicId, "tasks", this.journalCtx.taskId);
    await mkdir(join(taskDir, "logs"), { recursive: true });

    // ========================================================================
    // STEP 2: INITIALIZE FACTS LOGGER (before execution)
    // ========================================================================
    const { FactsLogger } = await import("../task/facts/api.ts");
    const factsLogger = new FactsLogger(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
      attemptNumber,
    );

    // ========================================================================
    // STEP 3: BUILD Seed CONTEXT
    // ========================================================================
    const spawnedTasks: Array<{ id: string; writeToPath: string }> = [];

    // Staged spawns — written to disk only after seed() returns successfully.
    // If seed() throws part-way through, no children are committed and the
    // system is left in the same state as before the Seed attempt.
    const stagedSpawns: Array<{
      shape: any;
      writeToPath: string;
      target: SeedSpawnTarget;
      opts?: SeedSpawnOptions;
      label?: string;
    }> = [];

    // Directory of the parent task — emitted into the seed-input.json snapshot
    // for debug visibility. taskFilePath may be a directory (unit.path) or a
    // file (TASK.md); when it's a file, use its parent dir.
    const parentTaskDir =
      this.taskFilePath.endsWith(".ts") || this.taskFilePath.endsWith(".md")
        ? dirname(this.taskFilePath)
        : this.taskFilePath;

    // Spawn directory in the journal execution directory.
    // Children are written here so each execution is self-contained.
    const spawnedDir = join(taskDir, "spawned");

    const ctx: SeedContext = {
      projectDir: this.projectDir,
      vars: this.taskMeta.vars ?? {},
      log: {
        info: (msg) => console.log(`[seed:${this.taskMeta.id}] ${msg}`),
        warn: (msg) => console.warn(`[seed:${this.taskMeta.id}] WARN: ${msg}`),
        error: (msg) =>
          console.error(`[seed:${this.taskMeta.id}] ERROR: ${msg}`),
      },
      get spawnedTasks() {
        return spawnedTasks as ReadonlyArray<{
          id: string;
          writeToPath: string;
        }>;
      },
      spawnDir: spawnedDir,
      ai: {
        ask: (question: string): AskResult => this.buildAiAsk(question),
        askJson: <T>(
          question: string,
          schema: import("zod").ZodType<T>,
        ): Promise<T> => this.runAiJson(question, schema),
      },
      plan: {
        getPlanPath: (relativePath: string): string => {
          return this.resolvePlanPath(relativePath);
        },
      },
      artifact: new ArtifactStore(this.projectDir),
      spawn: async (target: SeedSpawnTarget, opts?: SeedSpawnOptions) => {
        const shape = await resolveSeedTarget(target, opts, ctx);
        const writeToPath = relative(this.projectDir,
          join(spawnedDir, shape.id, "TASK.md")
        ).replace(/\\/g, "/");

        // STAGE the spawn instead of writing immediately. The actual write
        // happens in a single batch after the seed() function returns
        // successfully (see STEP 4.6 below). If the function throws part-way,
        // no children are committed — eliminating the partial-spawn state
        // that previously left the system with N children and 49−N missing.
        spawnedTasks.push({ id: shape.id, writeToPath });
        stagedSpawns.push({ shape, writeToPath, target, opts, label: opts?.label });

        await logTaskEvent(
          this.projectDir,
          this.journalCtx.epicId,
          this.journalCtx.taskId,
          "Seed_SEED",
          `staged spawn: ${opts?.label ?? shape.id}`,
          { taskId: shape.id, writeToPath },
        );

        // (Template-sibling copy + final disk write happen in the commit
        // pass after seed() returns successfully — see commitStagedSpawns
        // below.)
        console.log(
          `[seed:${this.taskMeta.id}] Staged spawn: ${shape.id} → ${writeToPath}`,
        );
      },
    };

    // ========================================================================
    // STEP 3.5: WRITE DEBUG INPUT SNAPSHOT (what the Seed script sees in ctx)
    // ========================================================================
    const inputSnapshot = {
      attemptNumber,
      startedAt: seededAt,
      projectDir: this.projectDir,
      playbookName: process.env.CONVERGE_PLAYBOOK || "default",
      parentTaskDir: relative(this.projectDir, parentTaskDir),
      journalCtx: this.journalCtx,
      taskMeta: {
        id: this.taskMeta.id,
        title: this.taskMeta.title,
      },
      vars: this.taskMeta.vars ?? {},
      ctxMethods: ["log", "ai.ask", "plan.getPlanPath", "artifact", "spawn"],
    };
    await writeFile(
      join(taskDir, "seed-input.json"),
      JSON.stringify(inputSnapshot, null, 2),
      "utf-8",
    );

    const writeOutput = async (body: Record<string, unknown>) => {
      try {
        await writeFile(
          join(taskDir, "seed-output.json"),
          JSON.stringify(
            {
              attemptNumber,
              startedAt: seededAt,
              completedAt: new Date().toISOString(),
              spawnedTasks,
              ...body,
            },
            null,
            2,
          ),
          "utf-8",
        );
      } catch {
        // Debug artifact — never let a write failure mask the real result.
      }
    };

    // ========================================================================
    // COMMIT STAGED SPAWNS — runs only if seed() returned without throwing.
    // ========================================================================
    // Each staged spawn becomes a real on-disk task here, in the same order
    // they were staged. If any single commit fails, we still try the others
    // (best-effort) but report the partial state to the caller via the
    // returned error metadata.
    const commitStagedSpawns = async (): Promise<{
      committed: number;
      failed: Array<{ id: string; error: string }>;
    }> => {
      const failed: Array<{ id: string; error: string }> = [];
      let committed = 0;

      for (const stage of stagedSpawns) {
        const { shape, writeToPath, target } = stage;
        try {
          await writeTaskMdToFile(this.projectDir, shape, writeToPath);

          // Sibling-file copy from template source → rendered task dir.
          if (
            typeof target === "object" &&
            target !== null &&
            (target as any)._type === "template-ref"
          ) {
            const ref = target as TemplateRef;

            // Drop a .spawn-source sidecar next to TASK.md so future
            // resumes can detect when the source template was edited
            // after spawn time and re-materialize this journal copy.
            try {
              const { writeFile: wf } = await import("node:fs/promises");
              const { dirname: dn, join: jn } = await import("node:path");
              const sidecarDir = dn(join(this.projectDir, writeToPath));
              const sidecarPath = jn(sidecarDir, ".spawn-source");
              await wf(sidecarPath, ref.path, "utf-8");
            } catch {
              /* sidecar is best-effort */
            }
            const {
              resolve: resolvePath,
              dirname: dirnamePath,
              basename: basenamePath,
            } = await import("node:path");
            const { readdir, copyFile, cp, readFile: readFileAsync } =
              await import("node:fs/promises");
            const templateAbsPath = resolvePath(this.projectDir, ref.path);
            const templateDir = dirnamePath(templateAbsPath);
            const templateFileName = basenamePath(templateAbsPath);
            const destDir = dirnamePath(join(this.projectDir, writeToPath));

            const templateTaskMdPath = join(templateDir, "TASK.md");
            let hasSeed = false;
            try {
              const templateContent = await readFileAsync(
                templateTaskMdPath,
                "utf-8",
              );
              if (templateContent.includes("seed:") || templateContent.includes("seeds:")) hasSeed = true;
            } catch {
              /* template TASK.md may not exist */
            }

            const skipEntries = new Set(["TASK.md", templateFileName, "tasks"]);
            if (!hasSeed) {
              skipEntries.add("seed.js");
              skipEntries.add("seed");
            }

            // Skip sibling DIRECTORIES whose root contains its own TASK.md /
            // SKILL.md / task.ts — those are child task definitions, not
            // supporting materials. Copying them recursively here causes the
            // scanner to discover them as static children and race with the
            // ctx.spawn-based instantiation. Materials (data files, prompts,
            // images, json configs) are still copied as before.
            const { existsSync: existsSyncFn } = await import("node:fs");
            const isTaskDir = (dirAbs: string): boolean =>
              existsSyncFn(join(dirAbs, "TASK.md")) ||
              existsSyncFn(join(dirAbs, "SKILL.md")) ||
              existsSyncFn(join(dirAbs, "task.ts"));

            try {
              const entries = await readdir(templateDir, {
                withFileTypes: true,
              });
              for (const entry of entries) {
                if (skipEntries.has(entry.name)) continue;
                const src = join(templateDir, entry.name);
                const dst = join(destDir, entry.name);
                if (entry.isFile()) {
                  await copyFile(src, dst);
                } else if (entry.isDirectory()) {
                  if (isTaskDir(src)) {
                    // Skip — task templates live here only so the parent's
                    // seed/index.js can ctx.spawn them. Letting them leak
                    // into the journal would cause the scanner to schedule
                    // them as siblings of the Seed-spawned instances.
                    continue;
                  }
                  await cp(src, dst, { recursive: true });
                }
              }
            } catch {
              /* template dir may have no siblings */
            }
          }

          committed++;
          console.log(
            `[seed:${this.taskMeta.id}] Committed: ${shape.id} → ${writeToPath}`,
          );
        } catch (err: any) {
          failed.push({ id: shape.id, error: err?.message ?? String(err) });
          console.error(
            `[seed:${this.taskMeta.id}] ❌ Commit failed for ${shape.id}: ${err?.message}`,
          );
        }
      }

      return { committed, failed };
    };

    // ========================================================================
    // STEP 4: RUN Seed WITH COMPREHENSIVE ERROR HANDLING AND VALIDATION
    // ========================================================================
    try {
      const seedResult = await seedFn(ctx);
      // Check both the return value and the ctx._keepLooping property.
      // The ctx property is more robust across bundler-duplicated code paths.
      const keepLooping = seedResult === true || (ctx as any)._keepLooping === true;

      // STEP 4.5: COMMIT — atomic boundary. Until now, no children exist on
      // disk. Either we get them all (success path) or none (seed() threw).
      const commitResult = await commitStagedSpawns();
      if (commitResult.failed.length > 0) {
        console.warn(
          `[seed:${this.taskMeta.id}] ⚠️  ${commitResult.failed.length}/${stagedSpawns.length} spawn commits failed — partial state on disk.`,
        );
      }

      // Trim spawnedTasks to only the ones that actually committed.
      // (spawnedTasks was populated optimistically during staging.)
      if (commitResult.failed.length > 0) {
        const failedIds = new Set(commitResult.failed.map((f) => f.id));
        for (let i = spawnedTasks.length - 1; i >= 0; i--) {
          if (failedIds.has(spawnedTasks[i].id)) spawnedTasks.splice(i, 1);
        }
      }

      // STEP 4.6: VALIDATE GENERATED FILES FOR COMMON ISSUES
      // Check any .ts files generated by this Seed for ESM/CommonJS issues
      await this.validateGeneratedFiles();
      const durationMs = Date.now() - start;
      console.log(
        `[seed] Seeded ${spawnedTasks.length} task(s) in ${durationMs}ms`,
      );

      // Guard: if seed returned true but spawned 0 tasks, stop to prevent
      // an infinite loop (nothing to do but the seed wants to keep going).
      let effectiveKeepLooping = keepLooping;
      if (keepLooping && spawnedTasks.length === 0) {
        console.warn(
          `[seed:${this.taskMeta.id}] ⚠️  Seed returned true (keepLooping) but spawned 0 tasks — stopping to prevent infinite loop`,
        );
        effectiveKeepLooping = false;
      }

      // If the Seed ran without error but seeded 0 tasks, treat as a script error.
      // The script likely has a logic bug (e.g., empty input data, wrong field names).
      // Exception: when the seed function previously spawned children (there are
      // already spawned tasks on disk), and this iteration returns false with 0
      // new spawns, it's an intentional stop — not a bug.
      // If the Seed ran without error but seeded 0 tasks, treat as a script error.
      // The script likely has a logic bug (e.g., empty input data, wrong field names).
      // Exception: when the seed function explicitly returned `false` (not just
      // `undefined`/`void`), zero spawns is an intentional stop — not a bug.
      // This handles the final iteration of incremental seeding loops.
      const explicitStop = seedResult === false;
      if (spawnedTasks.length === 0 && !keepLooping && !explicitStop) {
        console.warn(
          `[seed:${this.taskMeta.id}] ⚠️  Seed completed but spawned 0 tasks — triggering repair`,
        );
        const zeroSpawnError = new Error(
          `Seed script completed successfully but spawned 0 tasks. ` +
            `This usually means the script's input data is empty or the script has a logic error ` +
            `(e.g., iterating over wrong field, filter excluding all entries).`,
        );
        zeroSpawnError.name = "SeedZeroSpawnError";
        await writeOutput({
          status: "zero-spawn",
          spawnCount: 0,
          durationMs,
          error: { name: zeroSpawnError.name, message: zeroSpawnError.message },
        });
        const shouldRetry = await this.triggerSelfHealing(
          zeroSpawnError,
          attemptNumber,
          factsLogger,
        );
        if (shouldRetry && attemptNumber < 3) {
          return await this.run(seedFn, attemptNumber + 1);
        }
        return { spawnCount: 0, durationMs, error: zeroSpawnError.message };
      }

      // Write seed.json to the parent task's journal directory.
      if (taskDir) {
        const seedJson = {
          seeded: true,
          seededAt,
          spawnCount: spawnedTasks.length,
          keepLooping: effectiveKeepLooping,
          subtasks: spawnedTasks.map((t) => ({
            id: t.id,
            writeToPath: t.writeToPath,
          })),
        };
        await writeFile(
          join(taskDir, "seed.json"),
          JSON.stringify(seedJson, null, 2),
          "utf-8",
        );
      }

      await writeOutput({
        status: "success",
        spawnCount: spawnedTasks.length,
        durationMs,
      });
      // Build spawned task info for direct runstate update (no filesystem walk)
      const spawnedTaskInfos: SpawnedTaskInfo[] = stagedSpawns.map((s) => ({
        id: s.shape.id ?? '',
        writeToPath: s.writeToPath,
        title: s.shape.title,
        depends_on: s.shape.depends_on,
        tags: s.shape.tags,
        inputs: s.shape.inputs,
        outputs: s.shape.outputs,
        checks: s.shape.checks?.map((c: any) => ({
          id: c.id ?? '',
          description: c.description,
          cmd: c.cmd,
          type: c.type,
        })),
        skill: (s.shape as any).skills || (s.shape as any).skill,
        vars: s.shape.vars as Record<string, unknown> | undefined,
      }));

      return { spawnCount: spawnedTasks.length, durationMs, keepLooping: effectiveKeepLooping, spawnedTasks: spawnedTaskInfos };
    } catch (error: any) {
      const durationMs = Date.now() - start;

      console.error(
        `[seed:${this.taskMeta.id}] ❌ Seed execution failed: ${error.message}`,
      );

      await writeOutput({
        status: "error",
        spawnCount: spawnedTasks.length,
        durationMs,
        error: {
          name: error.name,
          message: error.message,
          stack: typeof error.stack === "string"
            ? error.stack.split("\n").slice(0, 20).join("\n")
            : undefined,
        },
      });

      // ======================================================================
      // STEP 5: LOG ERROR AS FACT (infrastructure exists now)
      // ======================================================================
      await factsLogger.logFact({
        id: "error:seed-execution",
        type: "error",
        cmd: "seed-execution",
        ok: false,
        output: error.stack || error.message,
        exitCode: 1,
        collectedAt: new Date().toISOString(),
        errorType: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      });

      // ======================================================================
      // STEP 6: WRITE ERROR LOG FILE
      // ======================================================================
      const errorLogPath = join(taskDir, "logs", "error.log");
      const errorLogContent = [
        `[${new Date().toISOString()}] Seed Execution Failed`,
        ``,
        `Task: ${this.taskMeta.id}`,
        `Attempt: ${attemptNumber}`,
        `Duration: ${durationMs}ms`,
        ``,
        `Error: ${error.name}: ${error.message}`,
        ``,
        `Stack Trace:`,
        error.stack || "(no stack trace available)",
        ``,
      ].join("\n");

      await writeFile(errorLogPath, errorLogContent, "utf-8");

      // ======================================================================
      // STEP 7: LOG EVENT TO JOURNAL
      // ======================================================================
      await logTaskEvent(
        this.projectDir,
        this.journalCtx.epicId,
        this.journalCtx.taskId,
        "CLAUDEFN_FAILED",
        `seed failed: ${error.message}`,
        {
          error: error.message,
          stack: error.stack,
          errorType: error.name,
          attemptNumber,
          durationMs,
        },
      );

      // ======================================================================
      // STEP 8: TRIGGER SELF-HEALING (if strategies available)
      // ======================================================================
      const shouldRetry = await this.triggerSelfHealing(
        error,
        attemptNumber,
        factsLogger,
      );

      if (shouldRetry) {
        console.log(
          `[seed:${this.taskMeta.id}] 🔄 Self-healing succeeded - retrying Seed execution...`,
        );

        // Retry Seed execution (increment attempt number)
        const retryAttemptNumber = attemptNumber + 1;
        if (retryAttemptNumber <= 3) {
          // Max 3 attempts
          console.log(
            `[seed:${this.taskMeta.id}] ↻ Attempt #${retryAttemptNumber}`,
          );
          return await this.run(seedFn, retryAttemptNumber);
        } else {
          console.log(
            `[seed:${this.taskMeta.id}] ❌ Max retry attempts (3) exceeded`,
          );
          return {
            spawnCount: 0,
            durationMs,
            error: `Max retry attempts exceeded after auto-fix`,
          };
        }
      }

      return { spawnCount: 0, durationMs, error: error.message };
    }
  }

  /* ---------------------------------------------------------------- */
  /*  ctx.ai.ask() — read-only AI for Seed analysis                   */
  /* ---------------------------------------------------------------- */

  private buildAiAsk(question: string): AskResult {
    const projectDir = this.projectDir;
    const taskId = this.taskMeta.id;
    const logDir = this.getAiLogDir();

    const basePrompt = `You are analyzing a project to help break down work into subtasks.

PROJECT DIRECTORY: ${projectDir}
TASK: ${this.taskMeta.title ?? taskId}

QUESTION: ${question}

Use the available tools (Read, Glob) to inspect the project files and answer the question.`;

    const AskSchema = z.object({
      answer: z.boolean(),
      reasoning: z.string(),
    });

    // Lazy: only execute the boolean path when .then() is called
    let booleanPromise: Promise<boolean> | null = null;
    const getBooleanPromise = (): Promise<boolean> => {
      if (!booleanPromise) {
        booleanPromise = (async (): Promise<boolean> => {
          const executor = agentfn<{ answer: boolean; reasoning: string }>({
            prompt:
              basePrompt +
              `\n\nReturn a JSON object:\n- answer: true if the condition is fully met, false otherwise\n- reasoning: brief explanation (1-2 sentences)`,
            schema: AskSchema,
            allowedTools: [...READONLY_TOOLS],
            timeoutMs: 60_000,
            cwd: projectDir,
            logDir,
          });

          try {
            const result = await executor();
            return result.data.answer;
          } catch {
            return false;
          }
        })();
      }
      return booleanPromise;
    };

    return {
      then: <TResult1 = boolean, TResult2 = never>(
        onfulfilled?:
          | ((value: boolean) => TResult1 | PromiseLike<TResult1>)
          | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
      ) => getBooleanPromise().then(onfulfilled, onrejected),

      asJson: <T>(schema: import("zod").ZodType<T>): Promise<T> =>
        this.runAiJson(question, schema),
    };
  }

  /* ---------------------------------------------------------------- */
  /*  ctx.ai.askJson() — direct schema-validated AI call             */
  /*  (also the implementation backing AskResult.asJson)              */
  /* ---------------------------------------------------------------- */

  private runAiJson<T>(
    question: string,
    schema: import("zod").ZodType<T>,
  ): Promise<T> {
    const projectDir = this.projectDir;
    const taskId = this.taskMeta.id;
    const logDir = this.getAiLogDir();

    const prompt = `You are analyzing a project to help break down work into subtasks.

PROJECT DIRECTORY: ${projectDir}
TASK: ${this.taskMeta.title ?? taskId}

QUESTION: ${question}

Use the available tools (Read, Glob) to inspect the project files and answer the question.

Return a JSON object matching the requested schema.`;

    const executor = agentfn<T>({
      prompt,
      schema,
      allowedTools: [...READONLY_TOOLS],
      timeoutMs: 120_000,
      cwd: projectDir,
      logDir,
    });

    return executor().then((r) => r.data);
  }

  private getAiLogDir(): string {
    return this.taskFilePath
      ? join(this.taskFilePath.endsWith("/TASK.md") ? dirname(this.taskFilePath) : this.taskFilePath, "logs")
      : join(this.projectDir, ".converge", "journal", this.journalCtx.epicId, "tasks", this.journalCtx.taskId, "logs");
  }

  /**
   * Trigger self-healing strategies based on error type.
   *
   * Strategies:
   * 1. Invalid skill reference → Create gap for Seed code fix
   * 2. Missing file → Create gap for dependency resolution
   * 3. Code error → Request AI code review
   * 4. Unknown error → Log for manual inspection
   *
   * @returns true if gap was resolved and retry is recommended, false otherwise
   */
  private async triggerSelfHealing(
    error: Error,
    attemptNumber: number,
    factsLogger: any,
  ): Promise<boolean> {
    console.log(`[seed:${this.taskMeta.id}] 🔧 Triggering self-healing...`);

    // Strategy 1: Invalid skill reference (NEW - CRITICAL)
    if (
      error.name === "InvalidSkillReferenceError" ||
      error.message.includes("Invalid skill reference")
    ) {
      console.log(
        `   → Strategy: Invalid skill reference - Seed code needs fixing`,
      );

      await factsLogger.logFact({
        id: "self-healing:invalid-skill",
        type: "self-healing",
        cmd: "validate-skills",
        ok: false,
        output: `Detected invalid skill reference`,
        exitCode: 1,
        collectedAt: new Date().toISOString(),
        strategy: "invalid-skill-reference",
        errorMessage: error.message,
      });

      // Create gap and trigger resolution
      const gap: Gap = {
        id: `seed-invalid-skill:${this.taskMeta.id}:${Date.now()}`,
        type: "semantic",
        level: "task",
        scope: this.taskMeta.id,
        description: `Seed generated invalid skill reference: ${error.message}`,
        detected: new Date().toISOString(),
        resolved: false,
        checks: ["seed-skill-validation"],
        metadata: {
          gapKind: "seed-invalid-skill",
          errorType: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          source: "seed-executor",
          taskFilePath: this.taskFilePath,
          attemptNumber,
        },
        severity: "critical",
        suggestedFix:
          "Remove the skill field from the Seed-generated task definition or create the missing skill",
      };

      const shouldRetry = await this.triggerGapResolution(gap, factsLogger);
      return shouldRetry;
    }

    // Strategy 2: Missing file detection
    if (
      error.message.includes("ENOENT") ||
      error.message.includes("no such file")
    ) {
      const missingFile = this.extractFilePathFromError(error);

      // Classify: a Seed script fully controls which files it opens, so an
      // ENOENT during Seed execution is usually a bug in the script itself
      // (unsubstituted template, wrong path, typo). Obvious script-bug
      // signals: path contains a template placeholder like {{var}} or
      // $VAR-style markers. Fall back to "missing input dependency" only when
      // the path looks like a real concrete file that an upstream task should
      // have produced.
      const looksLikeScriptBug =
        /\{\{.*?\}\}/.test(missingFile) ||
        /\$\{[A-Z_][A-Z0-9_]*\}/.test(missingFile) ||
        /<[a-zA-Z_][a-zA-Z0-9_]*>/.test(missingFile);

      // Prefer the concrete script path when the runtime reported one — the
      // error message format is "Seed script import failed: <path>\n<cause>".
      // Fall back to the task file path so the strategy can still probe for
      // seed.js / seedData.ts in the task directory.
      const scriptPathFromError = this.extractWbsScriptPathFromError(error);
      const scriptPath = scriptPathFromError ?? this.taskFilePath;

      await factsLogger.logFact({
        id: "self-healing:missing-file",
        type: "self-healing",
        cmd: `test -f ${missingFile}`,
        ok: false,
        output: `Detected missing file: ${missingFile} (script-bug=${looksLikeScriptBug})`,
        exitCode: 1,
        collectedAt: new Date().toISOString(),
        strategy: looksLikeScriptBug
          ? "seed-script-repair"
          : "missing-dependency",
        missingFile,
        errorMessage: error.message,
      });

      // Always try seed-script-repair first — the script has full control over
      // which files it opens, so if it picks a bad path, the script is the
      // root cause. This prevents the "missing input" strategy from looping
      // on a phantom dependency and covers the common placeholder case.
      console.log(
        looksLikeScriptBug
          ? `   → Strategy: Seed script bug detected (unresolved placeholder in ${missingFile})`
          : `   → Strategy: Missing file ${missingFile} — trying Seed script repair first, then dependency resolution`,
      );

      const scriptGap: Gap = {
        id: `seed-script-error:${this.taskMeta.id}:${Date.now()}`,
        type: "semantic",
        level: "task",
        scope: this.taskMeta.id,
        description: `Seed script failed to resolve file ${missingFile}`,
        detected: new Date().toISOString(),
        resolved: false,
        checks: ["seed-execution"],
        metadata: {
          gapKind: "seed-script-error",
          scriptPath,
          missingFile,
          errorType: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          source: "seed-executor",
          taskFilePath: this.taskFilePath,
          attemptNumber,
        },
        severity: "critical",
      };

      const scriptRepaired = await this.triggerGapResolution(
        scriptGap,
        factsLogger,
      );
      if (scriptRepaired) return true;

      // Script-repair didn't help. Fall back to dependency resolution for the
      // case where the missing file really is an upstream task's output.
      if (looksLikeScriptBug) {
        // A placeholder path can't be a dependency — bail out.
        console.log(
          `[seed:${this.taskMeta.id}] ❌ Seed script repair failed and path contains an unresolved placeholder; no dependency fallback possible.`,
        );
        return false;
      }

      console.log(
        `[seed:${this.taskMeta.id}] ↳ Seed script repair did not resolve the gap — retrying as missing-input`,
      );
      const inputGap: Gap = {
        id: `seed-missing-file:${this.taskMeta.id}:${Date.now()}`,
        type: "structural",
        level: "task",
        scope: this.taskMeta.id,
        description: `Seed execution failed: missing required file ${missingFile}`,
        detected: new Date().toISOString(),
        resolved: false,
        checks: ["seed-execution"],
        metadata: {
          gapKind: "input",
          missingFile,
          errorMessage: error.message,
          errorStack: error.stack,
          source: "seed-executor",
          taskFilePath: this.taskFilePath,
          attemptNumber,
        },
        severity: "critical",
      };

      return await this.triggerGapResolution(inputGap, factsLogger);
    }

    // Strategy 2.5: ESM/CommonJS module system errors
    if (
      error.name === "ReferenceError" &&
      (error.message.includes("require is not defined") ||
        error.message.includes("exports is not defined") ||
        error.message.includes("module is not defined"))
    ) {
      console.log(
        `   → Strategy: ESM/CommonJS mismatch - module system fix needed`,
      );

      await factsLogger.logFact({
        id: "self-healing:module-system-error",
        type: "self-healing",
        cmd: "module-system-check",
        ok: false,
        output: `Detected module system error: ${error.message}`,
        exitCode: 1,
        collectedAt: new Date().toISOString(),
        strategy: "esm-commonjs-repair",
        errorType: error.name,
        errorMessage: error.message,
      });

      // Determine Seed generator path (parent task that spawned this task)
      // For task like .../task/002-001-page-home-lesson-tree/task.ts
      // Parent generator is .../task.ts (go up 2 levels from /task/...)
      let seedGeneratorPath: string | undefined;

      if (this.taskFilePath.includes("/task/")) {
        // Remove the /task/002-001-.../task.ts part to get parent path
        const parentPath = this.taskFilePath.split("/task/")[0] + "/task.ts";
        seedGeneratorPath = relative(this.projectDir, parentPath);
      }

      // Create gap and trigger resolution
      const gap: Gap = {
        id: `seed-module-system:${this.taskMeta.id}:${Date.now()}`,
        type: "semantic",
        level: "task",
        scope: this.taskMeta.id,
        description: `Module system error in Seed-generated code: ${error.message}`,
        detected: new Date().toISOString(),
        resolved: false,
        checks: ["seed-execution"],
        metadata: {
          gapKind: "module-system-error",
          errorType: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          source: "seed-executor",
          taskFilePath: this.taskFilePath,
          attemptNumber,
          isSystemicIssue: true, // This is a Seed generator bug
          seedGeneratorPath, // Path to parent Seed that generated this task
        },
        severity: "critical",
        suggestedFix:
          "Convert CommonJS require() to ESM import statements in Seed-generated task code",
      };

      const shouldRetry = await this.triggerGapResolution(gap, factsLogger);
      return shouldRetry;
    }

    // Strategy 3: Syntax/Type errors
    if (error.name === "SyntaxError" || error.name === "TypeError") {
      console.log(`   → Strategy: Code error - AI review needed`);

      await factsLogger.logFact({
        id: "self-healing:code-error",
        type: "self-healing",
        cmd: "code-review",
        ok: false,
        output: `Code error detected: ${error.name}`,
        exitCode: 1,
        collectedAt: new Date().toISOString(),
        strategy: "code-review",
        errorType: error.name,
        errorMessage: error.message,
      });

      // Create gap and trigger resolution
      const gap: Gap = {
        id: `seed-definition-error:${this.taskMeta.id}:${Date.now()}`,
        type: "semantic",
        level: "task",
        scope: this.taskMeta.id,
        description: `Seed definition error: ${error.message}`,
        detected: new Date().toISOString(),
        resolved: false,
        checks: ["seed-execution"],
        metadata: {
          gapKind: "seed-definition-error",
          errorType: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          source: "seed-executor",
          taskFilePath: this.taskFilePath,
          attemptNumber,
        },
        severity: "critical",
      };

      const shouldRetry = await this.triggerGapResolution(gap, factsLogger);
      return shouldRetry;
    }

    // Strategy 4 (precondition): Skip AI repair on transient/remote errors.
    // A 429, 5xx, network reset, or "overloaded" from a downstream service
    // means the script itself is fine — rewriting it does nothing useful and
    // wastes API budget. Surface the failure so the normal retry loop or the
    // user can react (refill quota, wait out rate limit, fix network).
    if (isTransientRemoteError(error)) {
      console.log(
        `   → Skipping AI repair: transient/remote error (${error.name}: ${truncate(error.message, 200)})`,
      );
      await factsLogger.logFact({
        id: "self-healing:seed-script-error-transient",
        type: "self-healing",
        cmd: "seed-script-repair",
        ok: false,
        output: `Seed script hit transient/remote error: ${error.name}: ${error.message}`,
        exitCode: 1,
        collectedAt: new Date().toISOString(),
        strategy: "skip-transient",
        errorType: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      return false; // do not retry within self-heal; let attempt loop or user act
    }

    // Strategy 4: General Seed script error — AI auto-fix
    console.log(`   → Strategy: Seed script error - triggering AI repair`);

    await factsLogger.logFact({
      id: "self-healing:seed-script-error",
      type: "self-healing",
      cmd: "seed-script-repair",
      ok: false,
      output: `Seed script error: ${error.name}: ${error.message}`,
      exitCode: 1,
      collectedAt: new Date().toISOString(),
      strategy: "seed-script-repair",
      errorType: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    // Try to extract the actual script path from the error so repair
    // strategies can find the file. Fall back to the task directory.
    const scriptPathFromError = this.extractWbsScriptPathFromError(error);

    const gap: Gap = {
      id: `seed-script-error:${this.taskMeta.id}:${Date.now()}`,
      type: "semantic",
      level: "task",
      scope: this.taskMeta.id,
      description: `Seed script failed: ${error.message}`,
      detected: new Date().toISOString(),
      resolved: false,
      checks: ["seed-execution"],
      metadata: {
        gapKind: "seed-script-error",
        scriptPath: scriptPathFromError ?? this.taskFilePath,
        errorType: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        source: "seed-executor",
        attemptNumber,
      },
    };

    return await this.triggerGapResolution(gap, factsLogger);
  }

  /**
   * Trigger gap resolution pipeline for Seed failures.
   * This bridges the self-healing detection to the repair infrastructure.
   *
   * @returns true if gap was resolved and retry is recommended, false otherwise
   */
  private async triggerGapResolution(
    gap: Gap,
    factsLogger: any,
  ): Promise<boolean> {
    try {
      console.log(
        `[seed:${this.taskMeta.id}] 🔧 Creating gap and triggering repair pipeline...`,
      );

      console.log(
        `[seed:${this.taskMeta.id}] 🔧 Attempting to fix gap: ${gap.id}`,
      );

      // Use strategies directly (same as what GapFixer.fixGap did internally)
      const result = await this.runStrategiesForGap(gap);

      if (result.success) {
        console.log(
          `[seed:${this.taskMeta.id}] ✅ Gap resolved by strategy: ${result.strategyName}`,
        );

        // Log success fact
        await factsLogger.logFact({
          id: `gap-resolved:${gap.id}`,
          type: "gap-resolution",
          ok: true,
          output: `Gap resolved successfully`,
          strategyName: result.strategyName,
          retryMode: result.retryMode,
          collectedAt: new Date().toISOString(),
        });

        // Handle retry mode
        if (result.retryMode === "full") {
          console.log(
            `[seed:${this.taskMeta.id}] 🔄 Retry mode: full - Seed will be re-executed`,
          );
          return true; // Signal retry
        } else if (result.retryMode === "validate") {
          console.log(
            `[seed:${this.taskMeta.id}] ✓ Retry mode: validate - running checks only`,
          );
          return true; // Signal retry
        } else if (result.retryMode === "none") {
          console.log(
            `[seed:${this.taskMeta.id}] ✓ Retry mode: none - gap fixed, no retry needed`,
          );
          return false; // No retry needed
        }

        return true; // Default to retry if retryMode is set
      } else {
        console.log(
          `[seed:${this.taskMeta.id}] ❌ Gap resolution failed - all strategies exhausted`,
        );

        // Log failure fact
        await factsLogger.logFact({
          id: `gap-failed:${gap.id}`,
          type: "gap-resolution",
          ok: false,
          output: `Gap resolution failed after ${result.attempts?.length || 0} attempts`,
          attempts: result.attempts?.length || 0,
          collectedAt: new Date().toISOString(),
        });

        return false; // No retry - gap could not be fixed
      }
    } catch (err: any) {
      console.error(
        `[seed:${this.taskMeta.id}] ❌ Error during gap resolution:`,
        err.message,
      );
      return false; // Error during gap resolution - no retry
    }
  }

  /**
   * Run repair strategies directly against a gap (replaces GapFixer.fixGapWithResolution).
   */
  private async runStrategiesForGap(
    gap: Gap,
  ): Promise<import("../navigator/repair/types.ts").Resolution> {
    const start = Date.now();
    const { TaskRunStrategy } =
      await import("../navigator/repair/strategies/task-run.ts");
    const { UserQuestionResumeStrategy } =
      await import("../navigator/repair/strategies/user-question-resume.ts");
    const { SeedGeneratorRepairStrategy } =
      await import("../navigator/repair/strategies/seed-generator-repair.ts");
    const { SeedScriptRepairStrategy } =
      await import("../navigator/repair/strategies/seed-script-repair.ts");
    const { DependencyBackoffStrategy } =
      await import("../navigator/repair/strategies/dependency-backoff.ts");
    const { MissingInputPatternRepairStrategy } =
      await import("../navigator/repair/strategies/missing-input-pattern.ts");
    const { ToolEnvironmentRepairStrategy } =
      await import("../navigator/repair/strategies/tool-environment-repair.ts");

    const strategies = [
      new UserQuestionResumeStrategy(),
      new SeedGeneratorRepairStrategy(),
      new SeedScriptRepairStrategy(),
      new DependencyBackoffStrategy(),
      new MissingInputPatternRepairStrategy(),
      new ToolEnvironmentRepairStrategy(),
      new TaskRunStrategy(),
    ];

    const sCtx = {
      projectDir: this.projectDir,
      journalCtx: this.journalCtx,
      timeline: null as any,
      attempt: 1,
    };

    for (const strategy of strategies) {
      const canHandle = strategy.canHandle(gap);
      if (!canHandle) continue;
      try {
        const outcome = await strategy.tryFix(gap, sCtx);
        if (outcome.success) {
          return {
            success: true,
            attempts: [],
            durationMs: Date.now() - start,
            strategyName: strategy.name,
          };
        }
        // shouldRetry: false means a non-recoverable error — stop trying
        if (outcome.shouldRetry === false) {
          console.log(
            `   ↩  ${strategy.name}: ${outcome.reason} (non-retryable)`,
          );
          return {
            success: false,
            attempts: [],
            durationMs: Date.now() - start,
            strategyName: strategy.name,
          };
        }
      } catch (err: any) {
        console.error(`   [seed-executor] Strategy ${strategy.name} threw: ${err.message}`);
      }
    }

    return { success: false, attempts: [], durationMs: Date.now() - start };
  }

  /**
   * Validate generated TypeScript files for common issues.
   * Called after Seed execution to check any .ts files that were generated.
   */
  private async validateGeneratedFiles(): Promise<void> {
    // Find all .ts files in the task subdirectory
    const parentBaseName = basename(this.taskFilePath, ".ts");
    const taskDir = join(dirname(this.taskFilePath), parentBaseName);

    if (!existsSync(taskDir)) {
      return; // No task directory generated
    }

    // Recursively find all .ts files
    const { readFile } = await import("node:fs/promises");
    const findTsFiles = (dir: string): string[] => {
      const results: string[] = [];
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...findTsFiles(fullPath));
        } else if (entry.name.endsWith(".ts")) {
          results.push(fullPath);
        }
      }

      return results;
    };

    const tsFiles = findTsFiles(taskDir);

    // Check each TypeScript file for CommonJS patterns
    for (const filePath of tsFiles) {
      const content = await readFile(filePath, "utf-8");

      // Detect CommonJS require() in ESM context
      const requireMatch = content.match(
        /(?:const|let|var)\s+(?:\{[^}]+\}|\w+)\s*=\s*require\s*\(/,
      );

      if (requireMatch) {
        // Found CommonJS in generated file - throw error to trigger self-healing
        const error = new Error(
          `Generated TypeScript file contains CommonJS require() statement.\n\n` +
            `File: ${relative(this.projectDir, filePath)}\n` +
            `Pattern: ${requireMatch[0]}\n\n` +
            `This Seed generator is producing code with CommonJS syntax in an ESM context.\n` +
            `The generator template needs to be fixed to use ES6 import statements instead.`,
        );
        error.name = "ReferenceError"; // Use ReferenceError to match runtime error
        throw error;
      }
    }
  }

  /**
   * Extract file path from error message.
   *
   * Examples:
   * - "ENOENT: no such file or directory, open '/path/to/file.md'"
   * - "Cannot find module '/path/to/file.ts'"
   */
  private extractFilePathFromError(error: Error): string {
    // Try to extract path from common error message patterns
    const patterns = [
      /['"]([^'"]+\.(?:md|ts|js|json|txt))['"]/, // Quoted file paths
      /open ['"]([^'"]+)['"]/, // "open '/path/to/file'"
      /find module ['"]([^'"]+)['"]/, // "find module '/path/to/file'"
      /ENOENT.*['"]([^'"]+)['"]/, // ENOENT errors
    ];

    for (const pattern of patterns) {
      const match = error.message.match(pattern);
      if (match) return match[1];
    }

    return "unknown";
  }

  /**
   * Extract the Seed script's own path from the runtime error thrown by
   * script-seed-executor. It formats errors as:
   *   "Seed script import failed: <absolute path to script>\n<cause>"
   * Returns the script path or null if the pattern does not match.
   */
  private extractWbsScriptPathFromError(error: Error): string | null {
    const match = error.message.match(
      /Seed script import failed:\s*([^\n]+)/,
    );
    if (!match) return null;
    const candidate = match[1].trim();
    return candidate.length > 0 ? candidate : null;
  }

  /**
   * Resolve relative plan path to absolute journal path.
   * Used by ctx.plan.getPlanPath() in Seed context.
   *
   * @param relativePath - Relative path like '../001-analyze-data-models/plan.md'
   * @returns Absolute path to the plan file in the journal
   */
  private resolvePlanPath(relativePath: string): string {
    // Parse the relative path to extract target task ID and filename
    // Input: '../001-analyze-data-models/plan.md'
    // → targetTaskId: '001-analyze-data-models'
    // → filename: 'plan.md'

    const parts = relativePath.split("/");
    const filename = parts.pop()!; // 'plan.md'
    const relativeTaskPath = parts.join("/"); // '../001-analyze-data-models'

    // Resolve relative task ID against current task ID
    // Current: this.journalCtx.taskId (e.g., '004-implement-stores' or '002-pages/002-001-home')
    // Relative: '../001-analyze-data-models'
    // → '001-analyze-data-models'

    const currentSegments = this.journalCtx.taskId.split("/");
    let targetTaskId: string;

    if (relativeTaskPath.startsWith("../")) {
      // Go up one level, then append the target
      const upLevels = (relativeTaskPath.match(/\.\.\//g) || []).length;
      const remaining = relativeTaskPath.replace(/\.\.\//g, "");
      const baseSegments = currentSegments.slice(
        0,
        currentSegments.length - upLevels,
      );
      targetTaskId = remaining
        ? [...baseSegments, remaining].join("/")
        : baseSegments.join("/");
    } else if (relativeTaskPath.startsWith("./")) {
      // Same directory - join with current task's parent
      const targetName = relativeTaskPath.replace("./", "");
      const parentSegments = currentSegments.slice(0, -1);
      targetTaskId = [...parentSegments, targetName].join("/");
    } else if (relativeTaskPath) {
      // Direct path - use as is
      targetTaskId = relativeTaskPath;
    } else {
      // Empty path - current task
      targetTaskId = this.journalCtx.taskId;
    }

    // Resolve target task journal directory.
    const targetDir = join(this.projectDir, ".converge", "journal", this.journalCtx.epicId, "tasks", targetTaskId);

    // Return absolute path to the plan file
    return join(targetDir, filename);
  }
}

/* ------------------------------------------------------------------ */
/*  writeTaskMdToFile — write a TASK.md with YAML frontmatter         */
/* ------------------------------------------------------------------ */

/**
 * Convert a TaskDefinition to a TaskMdShape for uniform serialization.
 */
export function taskDefToMdShape(def: TaskDefinition): TaskMdShape {
  const skills = def.skill
    ? Array.isArray(def.skill)
      ? def.skill
      : [def.skill]
    : undefined;

  // Map planConfig → plan (TaskMdPlan)
  let plan: TaskMdShape["plan"] | undefined;
  if (def.planConfig) {
    plan = {};
    if (def.planConfig.prompt) {
      plan.prompt =
        typeof def.planConfig.prompt === "string"
          ? def.planConfig.prompt
          : "[dynamic-function]";
    }
    if (def.planConfig.output) plan.output = def.planConfig.output;
    if (def.planConfig.outputPrompt) {
      plan.outputPrompt =
        typeof def.planConfig.outputPrompt === "string"
          ? def.planConfig.outputPrompt
          : "[dynamic-function]";
    }
  }

  // Map checks — only static Check[] can be serialized
  const checks = Array.isArray(def.checks)
    ? (def.checks as Check[]).map((c) => ({
        id: c.id,
        cmd: c.cmd,
        description: c.description,
      }))
    : undefined;

  return {
    id: def.id,
    title: def.title,
    description: def.description,
    agent: def.agent,
    skills,
    inputs: def.inputs,
    outputs: def.outputs,
    checks,
    depends_on: def.depends_on,
    blocking: def.blocking,
    tags: def.tags,
    vars: def.vars,
    plan,
    body: typeof def.prompt === "string" ? def.prompt : undefined,
  };
}

/**
 * Writes a TaskMdShape or TaskDefinition as a TASK.md file:
 *   - YAML frontmatter block (ALL fields)
 *   - Markdown body (the prompt/body string)
 *
 * The scanner discovers these files at {parent_basename}/{id}/TASK.md as executable tasks.
 */
async function writeTaskMdToFile(
  projectDir: string,
  def: TaskMdShape | TaskDefinition,
  relPath: string,
): Promise<void> {
  // Normalize to TaskMdShape
  const shape: TaskMdShape = isTaskMdShape(def)
    ? def
    : taskDefToMdShape(def as TaskDefinition);

  const absPath = join(projectDir, relPath);
  await mkdir(dirname(absPath), { recursive: true });

  const fm: string[] = ["---"];
  if (shape.id) fm.push(`id: ${yamlStr(shape.id)}`);
  fm.push(`title: ${yamlStr(shape.title ?? shape.id)}`);
  if (shape.description) fm.push(`description: ${yamlStr(shape.description)}`);
  if (shape.agent) fm.push(`agent: ${yamlStr(shape.agent)}`);
  if (shape.skills?.length) {
    fm.push("skills:");
    shape.skills.forEach((s) => fm.push(`  - ${yamlStr(s)}`));
  }
  if (shape.depends_on?.length) {
    fm.push("depends_on:");
    shape.depends_on.forEach((d) => fm.push(`  - ${yamlStr(d)}`));
  }
  if (shape.blocking !== undefined) {
    fm.push(`blocking: ${shape.blocking}`);
  }
  if (shape.tags?.length) {
    fm.push("tags:");
    shape.tags.forEach((t) => fm.push(`  - ${yamlStr(t)}`));
  }
  if (shape.inputs?.length) {
    fm.push("inputs:");
    shape.inputs.forEach((i) => fm.push(`  - ${yamlStr(i)}`));
  }
  if (shape.outputs?.length) {
    fm.push("outputs:");
    shape.outputs.forEach((o) => fm.push(`  - ${yamlStr(o)}`));
  }
  if (shape.checks?.length) {
    fm.push("checks:");
    shape.checks.forEach((c) => {
      fm.push(`  - id: ${yamlStr(c.id)}`);
      if (c.description) fm.push(`    description: ${yamlStr(c.description)}`);
      if (c.cmd) fm.push(`    cmd: ${yamlStr(c.cmd)}`);
    });
  }
  if (shape.needs?.length) {
    fm.push("needs:");
    shape.needs.forEach((n) => {
      fm.push(`  - id: ${yamlStr(n.id)}`);
      if (n.description) fm.push(`    description: ${yamlStr(n.description)}`);
      if (n.cmd) fm.push(`    cmd: ${yamlStr(n.cmd)}`);
    });
  }
  if (shape.executor) {
    fm.push("executor:");
    fm.push(`  type: ${shape.executor.type}`);
    if (shape.executor.path) fm.push(`  path: ${yamlStr(shape.executor.path)}`);
    if (shape.executor.args?.length) {
      fm.push("  args:");
      shape.executor.args.forEach((a) => fm.push(`    - ${yamlStr(a)}`));
    }
    if (shape.executor.env && Object.keys(shape.executor.env).length > 0) {
      fm.push("  env:");
      for (const [k, v] of Object.entries(shape.executor.env)) {
        fm.push(`    ${k}: ${yamlStr(v)}`);
      }
    }
  }
  if (shape.seeds?.length) {
    fm.push("seeds:");
    for (const seed of shape.seeds) {
      if (seed.type === "seed") {
        fm.push(`  - type: seed`);
        fm.push(`    name: ${seed.name}`);
      } else {
        fm.push(`  - type: ${seed.type}`);
        if (seed.path) fm.push(`    path: ${yamlStr(seed.path)}`);
        if (seed.prompt)
          fm.push(`    prompt: ${yamlStr(seed.prompt)}`);
        if (seed.after) fm.push(`    after: true`);
        if (seed.args?.length) {
          fm.push("    args:");
          seed.args.forEach((a) => fm.push(`      - ${yamlStr(a)}`));
        }
        if (seed.env && Object.keys(seed.env).length > 0) {
          fm.push("    env:");
          for (const [k, v] of Object.entries(seed.env)) {
            fm.push(`      ${k}: ${yamlStr(v)}`);
          }
        }
      }
    }
  }
  if (shape.plan) {
    fm.push("plan:");
    if (shape.plan.prompt) fm.push(`  prompt: ${yamlStr(shape.plan.prompt)}`);
    if (shape.plan.output) fm.push(`  output: ${yamlStr(shape.plan.output)}`);
    if (shape.plan.outputPrompt)
      fm.push(`  outputPrompt: ${yamlStr(shape.plan.outputPrompt)}`);
  }
  if (shape.materialization) {
    fm.push(`materialization: ${yamlStr(shape.materialization)}`);
  }
  if (shape.materials?.length) {
    fm.push("materials:");
    shape.materials.forEach((m) => fm.push(`  - ${yamlStr(m)}`));
  }
  if (shape.vars && Object.keys(shape.vars).length > 0) {
    fm.push("vars:");
    for (const [k, v] of Object.entries(shape.vars)) {
      fm.push(`  ${k}: ${yamlScalar(v)}`);
    }
  }

  fm.push("---");

  const body = shape.body ?? shape.prompt ?? "";
  const bodyStr = body ? `\n${body}\n` : "";
  await writeFile(absPath, fm.join("\n") + "\n" + bodyStr, "utf-8");
}

/** Minimal YAML scalar quoting — double-quotes strings that need it. */
function yamlStr(value: string): string {
  // Quote if contains special YAML chars or starts with special chars
  if (
    /[:#\[\]{}&*!|>'"%@`,]/.test(value) ||
    /^\s/.test(value) ||
    value.includes("\n")
  ) {
    return JSON.stringify(value); // JSON double-quote is valid YAML double-quote
  }
  return value;
}

/** Serialize an arbitrary value as a YAML scalar (inline). */
function yamlScalar(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean" || typeof value === "number")
    return String(value);
  if (typeof value === "string") return yamlStr(value);
  // For objects/arrays, use JSON inline (valid YAML)
  return JSON.stringify(value);
}

/** Type guard: is this a TaskMdShape (has `id` as string, no builder/function traits)? */
function isTaskMdShape(t: unknown): t is TaskMdShape {
  return (
    typeof t === "object" &&
    t !== null &&
    typeof (t as any).id === "string" &&
    typeof (t as any).build !== "function" &&
    (t as any)._type === undefined
  );
}

/* ------------------------------------------------------------------ */
/*  resolveSeedTarget — normalize spawn target to TaskMdShape           */
/* ------------------------------------------------------------------ */

/**
 * Resolve a SeedSpawnTarget to a TaskMdShape for writing.
 *
 * Detection order:
 * 1. RawMarkdown (tagged _type: 'raw-markdown')
 * 2. TemplateRef (tagged _type: 'template-ref')
 * 3. string → skill name (existing logic)
 * 4. function → call; if returns string treat as markdown, else TaskDefinition
 * 5. TaskDefinitionBuilder → .build() → taskDefToMdShape()
 * 6. Plain object with `id` string → TaskMdShape (covers TaskMdShape and TaskDefinition)
 */
export async function resolveSeedTarget(
  target: SeedSpawnTarget,
  opts: SeedSpawnOptions | undefined,
  ctx: SeedContext,
): Promise<TaskMdShape> {
  // 1. RawMarkdown
  if (
    typeof target === "object" &&
    target !== null &&
    (target as any)._type === "raw-markdown"
  ) {
    const raw = target as RawMarkdown;
    const shape = parseTaskMdString(raw.content);
    if (opts?.id) shape.id = opts.id;
    if (!shape.id)
      throw new Error(
        "rawMd() spawn requires an id (set in frontmatter or via opts.id)",
      );
    return shape;
  }

  // 2. TemplateRef
  if (
    typeof target === "object" &&
    target !== null &&
    (target as any)._type === "template-ref"
  ) {
    const ref = target as TemplateRef;
    const { readFile: readFileAsync } = await import("node:fs/promises");
    const { resolve: resolvePath } = await import("node:path");
    const templatePath = resolvePath(ctx.projectDir, ref.path);
    let raw = await readFileAsync(templatePath, "utf-8");

    // Substitute {{var}} placeholders before parsing
    if (ref.vars && Object.keys(ref.vars).length > 0) {
      raw = raw.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (!(key in ref.vars!)) {
          throw new Error(
            `Template '${ref.path}' references undefined variable '{{${key}}}'. ` +
              `Available vars: ${Object.keys(ref.vars!).join(", ")}`,
          );
        }
        const value = ref.vars![key];
        return value == null ? "" : String(value);
      });
    }

    const shape = parseTaskMdString(raw);
    if (opts?.id) shape.id = opts.id;
    if (ref.vars) shape.vars = { ...shape.vars, ...ref.vars };
    if (!shape.id)
      throw new Error(
        `template('${ref.path}') spawn requires an id (set in frontmatter or via opts.id)`,
      );
    return shape;
  }

  // 3. String → skill name
  if (typeof target === "string") {
    let extractedId: string | undefined;

    if (target.includes("/task/") || target.includes("/epics/")) {
      const match = target.match(
        /[\\/]([^\\/]+)[\\/](?:task\.ts|TASK\.md|SKILL\.md)$/,
      );
      if (match) extractedId = match[1];
    }

    const id = opts?.id ?? extractedId;
    if (!id) {
      throw new Error(
        `ctx.spawn('${target}', opts) requires opts.id when the target is a skill name or ID cannot be auto-extracted from path.`,
      );
    }

    const skillName = target.includes("/skills/")
      ? target.replace(/^.*[\\/]([^\\/]+)([\\/](?:TASK|SKILL)\.md)?$/, "$1")
      : undefined;

    return {
      id,
      title: opts?.label ?? id,
      skills: skillName ? [skillName] : undefined,
      agent: opts?.agent,
      body: opts?.prompt,
      inputs: opts?.inputs,
      outputs: opts?.outputs,
      vars: opts?.vars,
      checks: opts?.checks,
    };
  }

  // 4. Function → call it; if returns string treat as markdown, else TaskDefinition
  if (typeof target === "function") {
    const result = (target as Function)(ctx);
    const resolved = result instanceof Promise ? await result : result;
    if (typeof resolved === "string") {
      const shape = parseTaskMdString(resolved);
      if (opts?.id) shape.id = opts.id;
      if (!shape.id)
        throw new Error(
          "(ctx) => string spawn requires an id (set in frontmatter or via opts.id)",
        );
      return shape;
    }
    // Factory returning TaskDefinition
    return taskDefToMdShape(resolved as TaskDefinition);
  }

  // 5. TaskDefinitionBuilder
  if (target instanceof TaskDefinitionBuilder || isBuilder(target)) {
    return taskDefToMdShape((target as TaskDefinitionBuilder).build());
  }

  // 6. Plain object with `id` — either TaskMdShape or TaskDefinition
  if (
    typeof target === "object" &&
    target !== null &&
    typeof (target as any).id === "string"
  ) {
    // If it has TaskDefinition-specific fields (skill, prompt as fn, etc.), convert
    const obj = target as any;
    if (
      obj.skill !== undefined ||
      obj.seedFn !== undefined ||
      obj.planConfig !== undefined
    ) {
      return taskDefToMdShape(obj as TaskDefinition);
    }
    // Treat as TaskMdShape directly
    return obj as TaskMdShape;
  }

  throw new Error("ctx.spawn() received an unrecognized target type");
}

function isBuilder(t: unknown): t is TaskDefinitionBuilder {
  return (
    typeof t === "object" &&
    t !== null &&
    "def" in t &&
    typeof (t as any).build === "function"
  );
}
