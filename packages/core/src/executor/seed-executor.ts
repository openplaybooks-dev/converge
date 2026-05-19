/**
 * Seed Executor
 *
 * Executes a seed function, providing SeedContext with ctx.spawn().
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
import { existsSync, readdirSync, statSync } from "node:fs";
import { glob } from "glob";
import { buildAiAsk, runAiJson, type SeedAiAskContext } from "./seed-ai-ask.ts";
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
import {
  parseTaskMdString,
  serializeTaskMd,
} from "../config/task-md-definition.ts";
import { assertSafeId } from "../task/goal/safe-id.ts";
import type { JournalContext } from "../navigator/repair/types.ts";
import { logTaskEvent } from "../journal/writer.ts";

import type { Gap } from "../task/gap/types.ts";
import type { PlaybookGoal } from "../task/playbook/types.ts";
import {
  evaluateAndPersist,
  loadAllGoals,
  loadGoalState,
  spawnGoal,
  updateGoal,
  goalStatePath,
  type GoalState,
  type GoalSpawnInput,
} from "../task/goal/evaluate-goals.ts";
import {
  appendGoalStatus,
  appendGoalUpsert,
  appendTaskStatus,
  appendTaskUpsert,
  ensureRuntimeLedger,
  readRuntimeLedgerState,
  selectNextBuildableGoal,
  type GoalRuntimeStatus,
  type RuntimeGoal,
  type RuntimeLedgerState,
  type TaskRuntimeStatus,
} from "../task/goal/runtime-ledger.ts";

/* ------------------------------------------------------------------ */
/*  Transient-error detection                                          */
/* ------------------------------------------------------------------ */

import { classifyError } from "../orchestrator/error-class.ts";

/**
 * Recognize errors that came from a downstream service (rate limit, quota,
 * outage, network blip) rather than from a bug in the Seed script itself.
 * AI repair cannot fix these — rewriting the script wouldn't help, and the
 * call costs API tokens for no benefit.
 *
 * Delegates to the canonical classifier in `orchestrator/error-class.ts`
 * (RFC 0003) so the transient-pattern list lives in one place.
 */
function isTransientRemoteError(error: Error): boolean {
  return classifyError(error).class === "transient";
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
    private goals?: PlaybookGoal[],
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
    // Use the canonical journal-structure resolver so we honor the playbook
    // scope and dedup the epicId/taskId segment.
    const { getJournalStructure } = await import("../journal/structure.ts");
    const journalStruct = getJournalStructure(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
    );
    const taskDir = journalStruct.task ?? journalStruct.epic ?? join(
      this.projectDir,
      ".converge",
      "journal",
      this.journalCtx.epicId,
      "tasks",
      this.journalCtx.taskId,
    );
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

    // Goals are resolved lazily from the playbook definition. If the
    // playbook hasn't been loaded yet (no goals passed to constructor),
    // discover playbooks and find the one matching this epic.
    let resolvedGoals: PlaybookGoal[] | undefined = this.goals;
    let resolvedPlaybookName = this.journalCtx.epicId;
    if (!resolvedGoals) {
      try {
        const { discoverPlaybooks } = await import("../task/playbook/loader.ts");
        const all = await discoverPlaybooks(this.projectDir);
        // epicId is `playbookName` (unkeyed) or `playbookName-keyValue` (keyed).
        // Find the playbook whose name is a prefix of the epicId.
        const source = all.find((s) =>
          this.journalCtx.epicId === s.def.name ||
          this.journalCtx.epicId.startsWith(s.def.name + "-")
        );
        resolvedGoals = source?.def.goals;
        resolvedPlaybookName = source?.def.name ?? resolvedPlaybookName;
      } catch {
        resolvedGoals = undefined;
      }
    } else {
      resolvedPlaybookName = process.env.CONVERGE_PLAYBOOK ?? resolvedPlaybookName;
    }

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

    // Spawned children are executable task nodes, so materialize them in the
    // same flat tasks root used by the runstate and execution logs.
    const spawnedDir = join(
      this.projectDir,
      ".converge",
      "journal",
      this.journalCtx.epicId,
      "tasks",
    );

    const goalSourceTaskId = this.journalCtx.taskId;

    const ctx: SeedContext = {
      projectDir: this.projectDir,
      vars: {
        taskId: this.taskMeta.id,
        ...(this.taskMeta.vars ?? {}),
      },
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
      loop: (() => {
        let requested: "continue" | "stop" | undefined;
        const make = (action: "continue" | "stop") => {
          requested = action;
          return { type: "seed-continuation" as const, action };
        };
        return {
          continue: () => make("continue"),
          continueAfterChildren: () => make("continue"),
          stop: () => make("stop"),
          get requested() {
            return requested;
          },
        };
      })(),
      continueAfterChildren: () => ctx.loop.continueAfterChildren(),
      stop: (_reason?: string) => ctx.loop.stop(),
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
        // Validate before any path composition — an AI-supplied or
        // computed id with `..` or `/` segments could write outside
        // the inventory tree. assertSafeId throws on every documented
        // hazard pattern (see safe-id.ts).
        assertSafeId(shape.id, "seed-spawned task id");
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
        try {
          const goalId =
            (this.taskMeta.vars?.goalId as string | undefined) ??
            "inventory";
          appendTaskUpsert(
            this.projectDir,
            resolvedPlaybookName,
            {
              id: shape.id,
              taskPath: writeToPath, // inventory/spawned/<id>/TASK.md
              goalId,
              summary: shape.title ?? shape.id,
              status: "todo",
              source: "spawned",
              parent: this.taskMeta.id,
              playbook: resolvedPlaybookName,
              metadata: { spawnedBy: this.taskMeta.id },
            },
            goalSourceTaskId,
          );
        } catch {
          // Inventory write should not block spawning.
        }

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
      goals: (() => {
        const goals = resolvedGoals;
        const playbookName = resolvedPlaybookName;
        const cwd = this.projectDir;
        const journalDir = join(this.projectDir, ".converge", "journal");
        const epicId = this.journalCtx.epicId;
        const statePath = goalStatePath(journalDir, epicId);

        return {
          async evaluate(): Promise<GoalState> {
            return evaluateAndPersist(goals, cwd, journalDir, epicId);
          },
          async spawn(goal: GoalSpawnInput): Promise<PlaybookGoal> {
            return spawnGoal(
              journalDir,
              epicId,
              goal,
              goalSourceTaskId,
            );
          },
          async update(goal: GoalSpawnInput): Promise<PlaybookGoal> {
            return updateGoal(
              journalDir,
              epicId,
              goal,
              goalSourceTaskId,
            );
          },
          async spawnMany(goalInputs: GoalSpawnInput[]): Promise<PlaybookGoal[]> {
            const spawned: PlaybookGoal[] = [];
            for (const goalInput of goalInputs) {
              spawned.push(spawnGoal(
                journalDir,
                epicId,
                goalInput,
                goalSourceTaskId,
              ));
            }
            return spawned;
          },
          async list(): Promise<PlaybookGoal[]> {
            return loadAllGoals(goals, journalDir, epicId);
          },
          async getRemaining(): Promise<PlaybookGoal[]> {
            const state = loadGoalState(statePath) ??
              await evaluateAndPersist(goals, cwd, journalDir, epicId);
            return state.remaining;
          },
          async getBuildable(): Promise<PlaybookGoal[]> {
            const state = loadGoalState(statePath) ??
              await evaluateAndPersist(goals, cwd, journalDir, epicId);
            return state.buildable;
          },
          async nextBuildable(): Promise<PlaybookGoal | null> {
            const state = loadGoalState(statePath) ??
              await evaluateAndPersist(goals, cwd, journalDir, epicId);
            return state.buildable[0] ?? null;
          },
          async getBlocked(): Promise<Array<{ goal: PlaybookGoal; unmetDependencies: string[] }>> {
            const state = loadGoalState(statePath) ??
              await evaluateAndPersist(goals, cwd, journalDir, epicId);
            return state.blocked;
          },
          async getSatisfied(): Promise<PlaybookGoal[]> {
            const state = loadGoalState(statePath) ??
              await evaluateAndPersist(goals, cwd, journalDir, epicId);
            return state.satisfied;
          },
          async allSatisfied(): Promise<boolean> {
            const state = loadGoalState(statePath) ??
              await evaluateAndPersist(goals, cwd, journalDir, epicId);
            return state.allSatisfied;
          },
          getState(): GoalState | null {
            return loadGoalState(statePath);
          },
          ledger: {
            async ensure(): Promise<void> {
              ensureRuntimeLedger(cwd, playbookName, goals, goalSourceTaskId);
            },
            async state(): Promise<RuntimeLedgerState> {
              ensureRuntimeLedger(cwd, playbookName, goals, goalSourceTaskId);
              return readRuntimeLedgerState(cwd, playbookName);
            },
            async upsertGoal(goal: PlaybookGoal): Promise<void> {
              ensureRuntimeLedger(cwd, playbookName, goals, goalSourceTaskId);
              appendGoalUpsert(cwd, playbookName, goal, goalSourceTaskId);
            },
            async setGoalStatus(
              goalId: string,
              status: GoalRuntimeStatus,
              metadata?: Record<string, unknown>,
            ): Promise<void> {
              ensureRuntimeLedger(cwd, playbookName, goals, goalSourceTaskId);
              appendGoalStatus(
                cwd,
                playbookName,
                goalId,
                status,
                metadata,
                goalSourceTaskId,
              );
            },
            async upsertTask(task: {
              id: string;
              goalId: string;
              summary: string;
              status?: TaskRuntimeStatus;
              epoch?: string;
              metadata?: Record<string, unknown>;
            }): Promise<void> {
              ensureRuntimeLedger(cwd, playbookName, goals, goalSourceTaskId);
              appendTaskUpsert(cwd, playbookName, task, goalSourceTaskId);
            },
            async setTaskStatus(
              taskId: string,
              status: TaskRuntimeStatus,
              metadata?: Record<string, unknown>,
            ): Promise<void> {
              ensureRuntimeLedger(cwd, playbookName, goals, goalSourceTaskId);
              appendTaskStatus(
                cwd,
                playbookName,
                taskId,
                status,
                metadata,
                goalSourceTaskId,
              );
            },
            async nextBuildable(): Promise<RuntimeGoal | null> {
              ensureRuntimeLedger(cwd, playbookName, goals, goalSourceTaskId);
              const state = readRuntimeLedgerState(cwd, playbookName);
              return selectNextBuildableGoal(state);
            },
          },
        };
      })(),
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
      ctxMethods: [
        "log",
        "ai.ask",
        "plan.getPlanPath",
        "artifact",
        "spawn",
        "continueAfterChildren",
        "stop",
        "goals.spawn",
        "goals.update",
        "goals.nextBuildable",
      ],
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
            } catch (err) {
              // Sidecar is best-effort — missing it means resume can't
              // detect template edits, but doesn't break the spawn.
              if (process.env.CONVERGE_DEBUG) {
                console.warn(
                  `   Debug: .spawn-source write failed for ${writeToPath}: ${
                    (err as Error)?.message ?? err
                  }`,
                );
              }
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
            } catch (err) {
              // Template TASK.md absent or unreadable — we proceed
              // assuming no seed, but log under CONVERGE_DEBUG so the
              // operator can confirm if a template was expected.
              if (process.env.CONVERGE_DEBUG) {
                console.warn(
                  `   Debug: cannot read template TASK.md at ${templateTaskMdPath}: ${
                    (err as Error)?.message ?? err
                  }`,
                );
              }
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
                    // Skip — task templates live here only so the parent
                    // seed can ctx.spawn them. Letting them leak
                    // into the journal would cause the scanner to schedule
                    // them as siblings of the Seed-spawned instances.
                    continue;
                  }
                  await cp(src, dst, { recursive: true });
                }
              }
            } catch (err) {
              // Template dir doesn't exist or has no readable siblings.
              // Best-effort copy — log under CONVERGE_DEBUG.
              if (process.env.CONVERGE_DEBUG) {
                console.warn(
                  `   Debug: cannot copy template siblings from ${templateDir}: ${
                    (err as Error)?.message ?? err
                  }`,
                );
              }
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
      const continuation =
        seedResult && typeof seedResult === "object" && (seedResult as any).type === "seed-continuation"
          ? (seedResult as any).action
          : ctx.loop.requested;
      if (typeof seedResult === "boolean") {
        console.warn(
          `[seed:${this.taskMeta.id}] ⚠️  Returning boolean from Seed is deprecated; use ctx.loop.${seedResult ? "continue" : "stop"}() instead.`,
        );
      }
      if ((ctx as any)._keepLooping === true) {
        console.warn(
          `[seed:${this.taskMeta.id}] ⚠️  ctx._keepLooping is deprecated; use ctx.loop.continue() instead.`,
        );
      }
      const keepLooping =
        continuation === "continue" ||
        seedResult === true ||
        (ctx as any)._keepLooping === true;
      const explicitStop = continuation === "stop" || seedResult === false;

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
      const spawnedTaskInfos: SpawnedTaskInfo[] = stagedSpawns.map((s) => {
        const tests = s.shape.tests ?? s.shape.checks;
        return {
          id: s.shape.id ?? '',
          writeToPath: s.writeToPath,
          title: s.shape.title,
          depends_on: s.shape.depends_on,
          tags: s.shape.tags,
          inputs: s.shape.inputs,
          outputs: s.shape.outputs,
          checks: tests?.map((c: any) => ({
            id: c.id ?? (c.name ? `test:${c.name}` : ''),
            description: c.description,
            cmd: c.cmd,
            type: c.type ?? (c.name ? "test" : "cmd"),
          })),
          skill: (s.shape as any).skills || (s.shape as any).skill,
          vars: s.shape.vars as Record<string, unknown> | undefined,
        };
      });

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
    return buildAiAsk(this.aiCtx(), question);
  }

  private runAiJson<T>(
    question: string,
    schema: import("zod").ZodType<T>,
  ): Promise<T> {
    return runAiJson(this.aiCtx(), question, schema);
  }

  private aiCtx(): SeedAiAskContext {
    return {
      projectDir: this.projectDir,
      taskId: this.taskMeta.id,
      taskTitle: this.taskMeta.title,
      taskFilePath: this.taskFilePath,
      journalCtx: this.journalCtx,
    };
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

    // Strategy 2: Missing input/output detection
    if (
      error.message.includes("ENOENT") ||
      error.message.includes("no such file")
    ) {
      const missingFile = this.extractFilePathFromError(error);

      await factsLogger.logFact({
        id: "self-healing:missing-file",
        type: "self-healing",
        cmd: `test -f ${missingFile}`,
        ok: false,
        output: `Detected missing file: ${missingFile}`,
        exitCode: 1,
        collectedAt: new Date().toISOString(),
        strategy: "missing-dependency",
        missingFile,
        errorMessage: error.message,
      });

      console.log(
        `   → Strategy: Missing file ${missingFile} — triggering dependency/input resolution`,
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
        id: "self-healing:seed-error-transient",
        type: "self-healing",
        cmd: "seed-cli",
        ok: false,
        output: `Seed hit transient/remote error: ${error.name}: ${error.message}`,
        exitCode: 1,
        collectedAt: new Date().toISOString(),
        strategy: "skip-transient",
        errorType: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      return false; // do not retry within self-heal; let attempt loop or user act
    }

    // Strategy 4: General Seed error — fall back to generic gap resolution
    console.log(`   → Strategy: Seed error - triggering generic gap resolution`);

    await factsLogger.logFact({
      id: "self-healing:seed-error",
      type: "self-healing",
      cmd: "seed-cli",
      ok: false,
      output: `Seed error: ${error.name}: ${error.message}`,
      exitCode: 1,
      collectedAt: new Date().toISOString(),
      strategy: "seed-error",
      errorType: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    const gap: Gap = {
      id: `seed-error:${this.taskMeta.id}:${Date.now()}`,
      type: "semantic",
      level: "task",
      scope: this.taskMeta.id,
      description: `Seed failed: ${error.message}`,
      detected: new Date().toISOString(),
      resolved: false,
      checks: ["seed-execution"],
      metadata: {
        gapKind: "seed-error",
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
    const { DependencyBackoffStrategy } =
      await import("../navigator/repair/strategies/dependency-backoff.ts");
    const { MissingInputPatternRepairStrategy } =
      await import("../navigator/repair/strategies/missing-input-pattern.ts");
    const { ToolEnvironmentRepairStrategy } =
      await import("../navigator/repair/strategies/tool-environment-repair.ts");

    const strategies = [
      new UserQuestionResumeStrategy(),
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
    // Find all .ts files in the task subdirectory. For TASK.md seeds the
    // taskFilePath itself is a file, not a directory; validate the parent task
    // directory instead of constructing .../TASK.md.
    const taskDir = this.taskFilePath.endsWith(".md")
      ? dirname(this.taskFilePath)
      : join(dirname(this.taskFilePath), basename(this.taskFilePath, ".ts"));

    if (!existsSync(taskDir) || !statSync(taskDir).isDirectory()) {
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
 * `taskDefToMdShape`, `writeTaskMdToFile`, `isTaskMdShape`, and
 * `resolveSeedTarget` were extracted to ./seed-target.ts to keep this
 * file focused on the seed-execution lifecycle. Re-exported here for
 * back-compat with downstream importers.
 */
export {
  taskDefToMdShape,
  writeTaskMdToFile,
  isTaskMdShape,
} from "./seed-target.ts";
import {
  taskDefToMdShape,
  writeTaskMdToFile,
  isTaskMdShape,
} from "./seed-target.ts";

/* ------------------------------------------------------------------ */
/*  resolveSeedTarget — extracted to ./seed-target.ts                    */
/* ------------------------------------------------------------------ */

export { resolveSeedTarget } from "./seed-target.ts";
import { resolveSeedTarget } from "./seed-target.ts";
