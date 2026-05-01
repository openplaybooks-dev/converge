/**
 * Task Runner — Abstraction for Unit Execution with Checkpoint Management
 *
 * Centralizes the common logic for running tasks with:
 * - Attempt tracking and archiving
 * - Checkpoint management (task-level and global)
 * - Ancestor status propagation
 * - Result snapshot writing
 * - LEARN.md generation
 *
 * Used by both commands-run.ts (step mode) and autonomous-run.ts (full auto mode).
 */

import { Unit } from "../unit/index.ts";
import { CheckpointManager } from "../../checkpoint/manager.ts";
import { TaskCheckpointManager } from "../../checkpoint/task-checkpoint.ts";
import { UnitCheckpointManager } from "../../checkpoint/unit-checkpoint.ts";
import {
  markAncestorsRunning,
  rollUpCompletion,
} from "./ancestor-propagation.ts";
import { generateLearnMd } from "./learn.ts";
import {
  detectAttemptLoop,
  augmentLearnMdWithLoopHint,
} from "./loop-detector.ts";
import { tryRelaxBuggyCheck } from "./buggy-check-relaxer.ts";
import { writeResultSnapshot } from "./result-snapshot.ts";
import { writeContextSnapshot } from "./context-snapshot.ts";
import type { ContextSnapshotParams } from "./context-snapshot.ts";
import { TaskEventWriter } from "../../journal/event-writer.ts";
import { ConsoleFormatter } from "../../journal/console-formatter.ts";
import { SessionEventBridge } from "../../journal/session-event-bridge.ts";
import { enhanceSessionLogsFromAttempt } from "../../journal/enhance-session-logs.ts";
import { copyTaskMaterials } from "../unit/factories.ts";
import { parseTaskMd } from "../../config/task-md-definition.ts";
import { FactsLogger } from "../facts/api.ts";
import type { FactsApiFn, FactsContext } from "../../config/task-definition.ts";
import type { TaskContext } from "../unit/task-context.ts";
import { UnblockStrategy } from "../../navigator/repair/strategies/unblock.ts";
import {
  findProducersForInputs,
  producerCheckpointStatusIsFailed,
} from "../../navigator/repair/strategies/dependency-backoff.ts";
import type { ProducerInfo } from "../../navigator/repair/strategies/dependency-backoff.ts";
import { ExecutionTimeline } from "../../navigator/repair/timeline.ts";
import type { Gap } from "../gap/types.ts";
import type { StrategyContext } from "../../navigator/repair/types.ts";
import { createAIContext } from "../../ai/context.ts";
import path from "node:path";
import { cp, rm, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { constructJournalPath } from "../unit/path-utils.ts";

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                   */
/* ------------------------------------------------------------------ */

/**
 * Load parent facts from parent task context.
 * Reads facts.jsonl from parent's wip attempt directory.
 *
 * @param ctx - Task context (with optional parent chain)
 * @returns Parent facts as key-value pairs
 */
async function loadParentFacts(
  ctx?: TaskContext,
): Promise<Record<string, any>> {
  if (!ctx?.parent) return {}; // No parent

  const parentCtx = ctx.parent;
  const factsFile = path.join(
    parentCtx.journalPath,
    "attempts/wip/logs/facts.jsonl",
  );

  if (!existsSync(factsFile)) return {};

  try {
    const content = await readFile(factsFile, "utf-8");
    const facts: Record<string, any> = {};
    for (const line of content.split("\n").filter(Boolean)) {
      const fact = JSON.parse(line);
      if (fact.id && fact.value !== undefined) {
        facts[fact.id] = fact.value;
      }
    }
    return facts;
  } catch (err: any) {
    console.warn(`   ⚠️  Failed to load parent facts: ${err.message}`);
    return {};
  }
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TaskExecutionContext {
  /** Project directory (absolute path) */
  projectDir: string;
  /** Epic ID */
  epicId: string;
  /** Journal task ID (may include hierarchy like "parent/child") */
  journalTaskId: string;
  /** Task file path (for loading the Unit) */
  filePath: string;
  /** Absolute journal directory for this task, derived from filePath. */
  journalPath?: string;
  /** Optional task definition data for context snapshot (populated from Unit after loading) */
  taskDef?: {
    description?: string;
    inputs?: string[];
    outputs?: string[];
    checks?: Array<{ id: string; description?: string; cmd?: string }>;
  };
  /** Optional TASK.md body content for context snapshot */
  body?: string;
  /** Optional session logger for session-level event recording */
  sessionLogger?: any; // Import type would be SessionLogger but avoiding circular deps
  /**
   * Preflight mode — run AI strategy selection for blocked tasks but stop before
   * executing any producers or the task itself. Prints the AI decision and exits.
   * Triggered by `--preflight` flag.
   */
  analyzeOnly?: boolean;
  /**
   * Step mode — execute a single task even if it's a container.
   * In step mode, we don't skip containers; we let them run and handle their own logic.
   * Triggered by `--step` flag.
   */
  stepMode?: boolean;
  /** Extra vars to merge into WBS context (e.g. epoch number from evolve runner) */
  extraVars?: Record<string, unknown>;
  /** Force non-incremental execution; rebuild from scratch */
  fullRefresh?: boolean;
}

export interface TaskExecutionResult {
  /** Whether the task succeeded */
  success: boolean;
  /** Attempt number that was executed */
  attemptNumber: number;
  /** Whether this was a WBS task (spawns subtasks) */
  isWbsTask: boolean;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether this task is a blocker (must complete successfully) */
  isBlocking: boolean;
  /** Sibling task IDs that were reset to pending by on-fail config */
  resetSiblings?: string[];
  /**
   * Classification of the failure cause.
   *
   * - "transient": API rate limit, network blip, missing env var that
   *   another attempt will likely re-discover (the agent loads .env and
   *   retries on its own). The autonomous runner does NOT count these
   *   against `maxStructuralAttempts` — they get a separate, generous
   *   `maxTransientRetries` budget.
   * - "structural": script bug, contract violation, an output the agent
   *   couldn't produce. Counts against `maxStructuralAttempts`.
   *
   * Populated only when `success === false`. Undefined for success or
   * when the runner couldn't classify.
   */
  errorKind?: "transient" | "structural";
  /** Free-form classifier reason for telemetry. */
  errorReason?: string;
  /**
   * True when the task could not be executed because its declared `inputs:`
   * gate was unsatisfied AND no repair strategy could unblock it. The
   * scheduler should DEFER this task (don't increment attempt counters,
   * don't mark failed) — the producer just hasn't run yet. The next
   * iteration will re-check; once the producer writes its outputs, the
   * gate clears and the task runs normally.
   */
  inputGateUnmet?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Task Runner                                                        */
/* ------------------------------------------------------------------ */

/**
 * Execute a single task with full checkpoint management and rollup.
 *
 * This handles:
 * 1. Attempt management (increment, archive previous)
 * 2. Ancestor status propagation (mark running)
 * 3. Unit execution (convergence loop inside Unit.run())
 * 4. Checkpoint updates (task-level and global)
 * 5. Result snapshots and LEARN.md generation
 * 6. Ancestor rollup (propagate completion/failure up the tree)
 *
 * Returns the execution result. Caller decides what to do based on success/failure.
 *
 * NEW: Accepts both Unit (preferred) and legacy TaskExecutionContext.
 * When Unit is provided, uses context-based operations (parent facts, ancestor propagation).
 */
export async function executeTask(
  unitOrCtx: Unit | TaskExecutionContext,
  checkpointMgrOrSessionLogger?: CheckpointManager | any,
  sessionLoggerOpt?: any,
): Promise<TaskExecutionResult> {
  // Normalize parameters based on signature
  let ctx: TaskExecutionContext;
  let preloadedUnit: Unit | undefined;
  let checkpointMgr: CheckpointManager;
  let sessionLogger: any | undefined;

  if ("path" in unitOrCtx && "parent" in unitOrCtx) {
    // New signature: executeTask(unit, checkpointMgr, sessionLogger?)
    const unit = unitOrCtx as Unit;
    preloadedUnit = unit;

    if (!unit.context) {
      throw new Error("Unit must have context to be executed via executeTask");
    }

    // Build TaskExecutionContext from Unit
    // Look for TASK.md in the unit directory, fall back to unit.path
    const taskMdPath = path.join(unit.path, "TASK.md");
    let filePath: string;
    filePath = existsSync(taskMdPath) ? taskMdPath : unit.path;

    ctx = {
      projectDir: unit.getProjectRoot(),
      epicId: unit.context.epicId,
      journalTaskId: unit.context.fullTaskId,
      filePath,
      fullRefresh: (unit as any).__fullRefresh || false,
      // These will be populated from unit later
    };

    checkpointMgr = checkpointMgrOrSessionLogger as CheckpointManager;
    sessionLogger = sessionLoggerOpt;
  } else {
    // Legacy signature: executeTask(ctx, checkpointMgr)
    ctx = unitOrCtx as TaskExecutionContext;
    checkpointMgr = checkpointMgrOrSessionLogger as CheckpointManager;
    sessionLogger = ctx.sessionLogger;
  }
  // ── 0. Container guard — skip attempts for container tasks ───────
  // Container tasks have child task directories. They come in two flavors:
  //   a) Pure container (no wbsFn) → skip entirely, children run independently
  //   b) WBS container (has wbsFn) → seed children if not already seeded, then skip
  // Neither needs attempt directories, context snapshots, or event logging.
  // Stateless: each step re-checks filesystem state, making it naturally resumable.
  //
  // EXCEPTION: In step mode, we don't skip containers early. We let them run
  // through the normal execution path so they can execute their own logic.
  {
    const guardUnit = preloadedUnit ?? (await Unit.fromPath(ctx.filePath));
    if (!preloadedUnit) preloadedUnit = guardUnit; // reuse below

    if (!guardUnit.executorFn && !guardUnit.loopFn) {
      const tasksSubDir = path.join(guardUnit.path, "tasks");
      const hasChildren =
        existsSync(tasksSubDir) &&
        (await (async () => {
          const { readdir } = await import("node:fs/promises");
          const entries = await readdir(tasksSubDir, { withFileTypes: true });
          return entries.some(
            (e) => e.isDirectory() && /^\d{2,3}-/.test(e.name),
          );
        })());

      if (hasChildren && !ctx.stepMode) {
        // (a) Pure container — children already exist, nothing to do
        // In step mode, we skip this early return and let the task run
        console.log(
          `   ⏩ Container task — skipping (children run independently)`,
        );
        return {
          success: true,
          attemptNumber: 0,
          isWbsTask: false,
          durationMs: 0,
          isBlocking: !!guardUnit.blocking,
        };
      }

      if (guardUnit.wbsFn) {
        // (b) WBS container — need to seed children
        // Check if already seeded (stateless resume: look for wbs.json with spawnCount > 0)
        const journalTaskDir =
          ctx.journalPath ??
          preloadedUnit?.context?.journalPath ??
          constructJournalPath(ctx.filePath);
        const wbsJsonPath = path.join(journalTaskDir, "wbs.json");

        if (existsSync(wbsJsonPath) && !ctx.stepMode && !ctx.fullRefresh) {
          // In step mode or full-refresh, we skip this check and let the task run through normal execution
          try {
            const raw = JSON.parse(await readFile(wbsJsonPath, "utf-8"));
            if (raw.spawnCount > 0) {
              // Verify at least one spawned child actually exists on disk.
              // wbs.json can be stale if children were deleted (e.g. git clean, --restart).
              const parentDir = path.dirname(ctx.filePath);
              const subtasks: Array<{ id: string }> = raw.subtasks ?? [];
              // WBS children may live under the playbook tree (legacy:
              // playbooks/{pb}/.../tasks/{id}) OR the journal tree (current:
              // journal/{pb}/[tasks/{seg}/]*tasks/{id}). The spawner writes to
              // the journal — compute the journal-side parent dir and also
              // check there.
              const playbookName = process.env.CONVERGE_PLAYBOOK || "default";
              const journalSegments = ctx.journalTaskId
                .split("/")
                .filter(Boolean)
                .filter((s) => s !== playbookName);
              const journalParentDir = path.join(
                ctx.projectDir,
                ".converge",
                "journal",
                playbookName,
                ...journalSegments.flatMap((s) => ["tasks", s]),
              );
              const anyChildExists =
                subtasks.length > 0 &&
                subtasks.some((t) =>
                  existsSync(path.join(parentDir, "tasks", t.id, "TASK.md")) ||
                  existsSync(path.join(journalParentDir, "tasks", t.id, "TASK.md")),
                );

              if (anyChildExists) {
                // For incremental tasks, check if the parent's own outputs
                // still exist. If they were deleted (e.g. test cleanup),
                // force a re-seed instead of skipping.
                if (guardUnit.materialization === "incremental") {
                  const outputs = guardUnit.outputs ?? [];
                  let allOutputsExist = outputs.length > 0;
                  for (const output of outputs) {
                    if (!existsSync(path.resolve(ctx.projectDir, output))) {
                      allOutputsExist = false;
                      break;
                    }
                  }
                  if (!allOutputsExist) {
                    console.log(
                      `   ⚡ Incremental outputs missing — re-seeding...`,
                    );
                    const { unlink } = await import("node:fs/promises");
                    await unlink(wbsJsonPath);
                    // Fall through to re-seed below
                  } else {
                    console.log(
                      `   ⏩ WBS container — already seeded (${raw.spawnCount} tasks)`,
                    );
                    return {
                      success: true,
                      attemptNumber: 0,
                      isWbsTask: true,
                      durationMs: 0,
                      isBlocking: !!guardUnit.blocking,
                    };
                  }
                } else {
                  console.log(
                    `   ⏩ WBS container — already seeded (${raw.spawnCount} tasks)`,
                  );
                  return {
                    success: true,
                    attemptNumber: 0,
                    isWbsTask: true,
                    durationMs: 0,
                    isBlocking: !!guardUnit.blocking,
                  };
                }
              }

              // Stale wbs.json — children don't exist on disk. Remove and re-seed.
              console.log(
                `   ⚠️  WBS container — stale seed (${raw.spawnCount} tasks claimed but none on disk). Re-seeding...`,
              );
              const { unlink } = await import("node:fs/promises");
              await unlink(wbsJsonPath);
            }
          } catch {
            /* corrupted — fall through to re-seed */
          }
        }

        // In step mode, we let WBS containers run through the normal execution path
        // instead of the special early return. This ensures they get a proper execution attempt.
        if (!ctx.stepMode) {
          // Not yet seeded — run wbsFn
          console.log(`   🌱 WBS container — seeding children...`);
          const { WbsExecutor } = await import("../../executor/wbs-executor.ts");
          const executor = new WbsExecutor(
            ctx.projectDir,
            { epicId: ctx.epicId, taskId: ctx.journalTaskId },
            guardUnit.path,
            { id: guardUnit.id, title: guardUnit.title, vars: { ...guardUnit.vars, ...ctx.extraVars } },
          );
          const result = await executor.run(guardUnit.wbsFn, 1);

          if (result.error || result.spawnCount === 0) {
            console.log(`   ❌ WBS seeding failed`);
            return {
              success: false,
              attemptNumber: 0,
              isWbsTask: true,
              durationMs: result.durationMs ?? 0,
              isBlocking: !!guardUnit.blocking,
            };
          }

          // Mark as seeded in checkpoint
          await checkpointMgr.markTaskSeeded(ctx.journalTaskId, ctx.epicId);
          console.log(
            `   ✅ WBS seeded ${result.spawnCount} children — next step will run them`,
          );
          return {
            success: true,
            attemptNumber: 0,
            isWbsTask: true,
            durationMs: result.durationMs ?? 0,
            isBlocking: !!guardUnit.blocking,
          };
        }
      }
    }
  }

  // ── 0.5. Incremental materialization — skip if already completed ──
  // Exception: --full-refresh forces re-execution regardless of prior completion
  {
    const guardUnit = preloadedUnit;
    if (guardUnit?.materialization === "incremental" && !ctx.fullRefresh) {
      const completed = await checkpointMgr.getCompletedTasks();
      if (completed.includes(ctx.journalTaskId)) {
        return {
          success: true,
          attemptNumber: 0,
          isWbsTask: false,
          durationMs: 0,
          isBlocking: !!guardUnit.blocking,
        };
      }
    }
  }

  // ── 1. Attempt Management ──────────────────────────────────────────
  // Journal path mirrors the task definition path exactly: insert 'journal/' before 'epics/'.
  // Use pre-computed journalPath if available, otherwise derive it from the task file path.
  const journalTaskDir =
    ctx.journalPath ??
    preloadedUnit?.context?.journalPath ??
    constructJournalPath(ctx.filePath);
  const wipDir = path.join(journalTaskDir, "attempts", "wip");

  // Detect interruption resume: INTERRUPTED.md in wip/ means continue in-place
  const interruptedMdPath = path.join(wipDir, "INTERRUPTED.md");
  const isResumingInterrupted = existsSync(interruptedMdPath);

  let attemptNumber: number;
  if (isResumingInterrupted) {
    // Resume: reuse current attempt number, keep wip/ intact
    const currentAttempts = await checkpointMgr.getTaskAttemptCount(
      ctx.journalTaskId,
      ctx.epicId,
    );
    attemptNumber = Math.max(currentAttempts, 1);
    console.log(
      `   ⚡ Resuming interrupted attempt #${attemptNumber} (wip/ preserved)`,
    );
  } else {
    attemptNumber = await checkpointMgr.incrementTaskAttempt(
      ctx.journalTaskId,
      ctx.epicId,
    );
  }
  const attemptPadded = String(attemptNumber).padStart(2, "0");

  // Strategy: numbered dirs (01/, 02/, …) are the real directories; wip is a
  // junction (Windows) or symlink (other) pointing to the current attempt's real dir.
  // This avoids renaming directories with open file handles (Windows EPERM on retry).
  // Skip setup when resuming an interrupted task — wip already points to correct dir.
  if (!isResumingInterrupted) {
    const {
      symlink: fsSymlink,
      rm: fsRm,
      mkdir: fsMkdir,
      copyFile,
      lstat,
    } = await import("node:fs/promises");
    const attemptsDir = path.dirname(wipDir);
    const realAttemptDir = path.join(attemptsDir, attemptPadded);

    // Create the real numbered directory for this attempt
    await fsMkdir(realAttemptDir, { recursive: true });

    // Remove existing wip — could be a junction (new-style) or real dir (old-style)
    if (existsSync(wipDir)) {
      let wipStat: import("node:fs").Stats | null = null;
      try {
        wipStat = await lstat(wipDir);
      } catch {
        /* ignore */
      }

      // On Windows, a directory junction sometimes reports isSymbolicLink()
      // true and sometimes isDirectory() true — the APIs disagree. Probe for
      // a junction/symlink first by reading the link target; if that succeeds
      // we treat it as a link regardless of stat flags.
      let isLink = !!wipStat?.isSymbolicLink();
      if (!isLink) {
        try {
          const { readlink: fsReadlink } = await import("node:fs/promises");
          await fsReadlink(wipDir);
          isLink = true;
        } catch {
          /* not a link */
        }
      }

      if (isLink) {
        // Junction/symlink from a previous run — unlink only (real numbered dir stays intact).
        // Use unlink explicitly since fsRm on a junction can traverse it on some Windows builds.
        const { unlink: fsUnlink } = await import("node:fs/promises");
        try {
          await fsUnlink(wipDir);
        } catch {
          // Fallback — rmSync with force to handle Windows junctions that unlink refuses
          const { rmSync } = await import("node:fs");
          rmSync(wipDir, { force: true, recursive: false });
        }
      } else if (wipStat?.isDirectory()) {
        // Old-style real directory — archive as previous attempt, then remove
        if (attemptNumber > 1) {
          const prevPadded = String(attemptNumber - 1).padStart(2, "0");
          const prevDir = path.join(attemptsDir, prevPadded);
          if (!existsSync(prevDir)) {
            // One-time migration: rename real wip → numbered dir.
            // Retry on EPERM (Windows tail -f may briefly hold file handles after kill).
            const { rename: fsRename } = await import("node:fs/promises");
            for (let i = 0; i < 5; i++) {
              try {
                await fsRename(wipDir, prevDir);
                break;
              } catch (err: any) {
                if (err.code === "EPERM" && i < 4)
                  await new Promise((r) => setTimeout(r, 300 * (i + 1)));
                else throw err;
              }
            }
            console.log(
              `   📦 Archived attempt #${attemptNumber - 1} → attempts/${prevPadded}/ (migrated)`,
            );
          } else {
            await fsRm(wipDir, { recursive: true, force: true });
          }
        } else {
          await fsRm(wipDir, { recursive: true, force: true });
        }
      }
    }

    // Create wip as a junction (Windows) or dir symlink (other) → real attempt dir
    const linkType = process.platform === "win32" ? "junction" : "dir";
    await fsSymlink(realAttemptDir, wipDir, linkType);

    // Propagate LEARN.md from previous attempt's real dir
    if (attemptNumber > 1) {
      const prevPadded = String(attemptNumber - 1).padStart(2, "0");
      const prevLearnMd = path.join(attemptsDir, prevPadded, "LEARN.md");
      if (existsSync(prevLearnMd)) {
        await copyFile(prevLearnMd, path.join(realAttemptDir, "LEARN.md"));
        console.log(`   📖 LEARN.md propagated → attempt #${attemptNumber}`);
      }
    }
  }

  const attemptDir = wipDir;
  const normalizedWipDir = wipDir.replace(/\\/g, "/");
  const displayPath =
    normalizedWipDir.split(".converge/journal/")[1] ?? normalizedWipDir;
  console.log(`   Attempt #${attemptNumber} → journal/${displayPath}`);

  // Set environment variables for journal routing
  process.env.CONVERGE_TASK_ATTEMPT = attemptPadded;
  process.env.CONVERGE_TASK_ATTEMPT_DIR = attemptDir;

  // ── 1.4. Collect Facts (BEFORE context snapshot) ──────────────────
  // Collect task-specific facts before creating context files
  let factsApiFn: FactsApiFn | undefined;
  let parsedDef:
    | {
        description?: string;
        inputs?: string[];
        outputs?: string[];
        checks?: any[];
      }
    | undefined;

  // Parse TASK.md to extract task definition
  if (existsSync(ctx.filePath)) {
    const parsed = await parseTaskMd(ctx.filePath);
    if (parsed) {
      parsedDef = {
        description: parsed.def.description,
        inputs: parsed.def.inputs,
        outputs: parsed.def.outputs,
        checks: parsed.def.checks,
      };
    }
  }

  // Run factsApi if defined
  if (factsApiFn) {
    try {
      console.log(`   📊 Collecting facts...`);
      const factsLogger = new FactsLogger(
        ctx.projectDir,
        ctx.epicId,
        ctx.journalTaskId,
        attemptNumber,
      );

      // Load parent facts from parent context (if available)
      const parentFacts = preloadedUnit?.context
        ? await loadParentFacts(preloadedUnit.context)
        : {};

      const factsContext: FactsContext = {
        projectDir: ctx.projectDir,
        taskId: ctx.journalTaskId,
        parentFacts, // ✅ Loaded from parent.context
        collect: async (id: string, cmd: string, description?: string) => {
          return await factsLogger.collectFact({
            type: "task-fact",
            id,
            cmd,
            description,
          });
        },
      };

      await factsApiFn(factsContext);
      console.log(`   ✅ Facts collected → logs/facts.jsonl`);
    } catch (err: any) {
      console.warn(`   ⚠️  Facts collection failed: ${err.message}`);
      // Continue anyway - facts are optional
    }
  }

  // ── 1.5. Create Context Snapshot (BEFORE execution) ────────────────
  // Create NEEDS.md, TASK.md, CHECKS.md files that AI will read during execution
  try {
    // Parse TASK.md to get body and metadata
    let taskBody: string | undefined;

    if (existsSync(ctx.filePath)) {
      console.log(`   📖 Parsing TASK.md: ${ctx.filePath}`);
      const parsed = await parseTaskMd(ctx.filePath);
      if (parsed) {
        taskBody = parsed.body;
        console.log(`   ✅ Extracted task body: ${taskBody?.slice(0, 100)}...`);
        parsedDef = {
          description: parsed.def.description,
          inputs: parsed.def.inputs,
          outputs: parsed.def.outputs,
          checks: parsed.def.checks,
        };
      } else {
        console.log(
          `   ⚠️  parseTaskMd returned null/undefined for ${ctx.filePath}`,
        );
      }
    } else {
      console.log(`   ⚠️  Task file not found: ${ctx.filePath}`);
    }

    // Use provided taskDef from context, or fall back to parsed TASK.md data
    const description = ctx.taskDef?.description ?? parsedDef?.description;
    const inputs = ctx.taskDef?.inputs ?? parsedDef?.inputs;
    const outputs = ctx.taskDef?.outputs ?? parsedDef?.outputs;
    const checks = ctx.taskDef?.checks ?? parsedDef?.checks;
    const body = ctx.body ?? taskBody;

    const snapshotArgs: ContextSnapshotParams = {
      projectDir: ctx.projectDir,
      epicId: ctx.epicId,
      taskId: ctx.journalTaskId,
      attemptDir,
      description,
      inputs,
      outputs,
      checks,
      skillBody: body,
      attemptNumber,
    };

    let snapshotPaths = await writeContextSnapshot(snapshotArgs);

    console.log(`   📋 Context snapshot created → wip/`);

    // Pre-flight upstream-failure check.
    //
    // The snapshot reports `blocked: true` only when an input file is
    // missing. But a producer may have terminally failed *with* its
    // declared output already written to disk (e.g., partial output,
    // agent gave up later). In that case the snapshot is not blocked,
    // we'd happily run on top of a broken foundation, and the user has
    // to debug a cascade. Force the same UnblockStrategy path that
    // already handles missing inputs — DependencyBackoffStrategy will
    // re-run the failed producer.
    let failedUpstreamProducers: ProducerInfo[] = [];
    if (!snapshotPaths.blocked && Array.isArray(inputs) && inputs.length > 0) {
      try {
        const producers = await findProducersForInputs(inputs, ctx.projectDir);
        for (const p of producers) {
          if (await producerCheckpointStatusIsFailed(p, ctx.projectDir)) {
            failedUpstreamProducers.push(p);
          }
        }
      } catch (err: any) {
        console.warn(
          `   ⚠️  Upstream-failure pre-flight check errored: ${err.message}`,
        );
      }
      if (failedUpstreamProducers.length > 0) {
        const ids = failedUpstreamProducers
          .map((p) => `${p.epicId}/${p.journalTaskId}`)
          .join(", ");
        console.log(
          `   ⛔ Upstream task(s) in failed state: ${ids} — invoking repair before execution`,
        );
        // Mutate snapshotPaths to drive the existing repair branch below.
        // The blockedInputs list carries the failed producers' declared
        // outputs so DependencyBackoffStrategy can re-discover them.
        const failedOutputs = failedUpstreamProducers.flatMap((p) => p.outputs);
        snapshotPaths = {
          ...snapshotPaths,
          blocked: true,
          blockedReason: `Upstream task(s) failed: ${ids}`,
          blockedInputs: failedOutputs,
        };
      }
    }

    // Self-healing: required inputs missing — try repair strategies before failing
    if (snapshotPaths.blocked) {
      console.log(`   ⛔ Needs not met: ${snapshotPaths.blockedReason}`);
      console.log(
        `      Check ${snapshotPaths.relDir}/NEEDS.result.md for details`,
      );

      let proceedToExecution = false;

      // Build a synthetic Gap for repair strategies
      const blockerGap: Gap = {
        id: `blocker-${ctx.journalTaskId}`,
        type: "missing-intermediate",
        level: "task",
        scope: ctx.journalTaskId,
        description: snapshotPaths.blockedReason ?? "Missing required inputs",
        detected: new Date().toISOString(),
        resolved: false,
        checks: [],
        metadata: {
          gapKind: "blocker",
          // Provide under all key names the strategies may look for
          missingInputs: snapshotPaths.blockedInputs,
          blockedInputs: snapshotPaths.blockedInputs,
          allMissingItems: snapshotPaths.blockedInputs,
          // Absolute path to the source TASK.md, so repair strategies can patch it
          // directly without reconstructing the path from epicId/taskId segments.
          sourceTaskFile: ctx.filePath,
        },
      };

      // Build StrategyContext for repair strategies (with AI support)
      const timeline = new ExecutionTimeline(ctx.projectDir);
      const journalCtxForRepair = {
        epicId: ctx.epicId,
        taskId: ctx.journalTaskId,
      };
      const strategyCtx: StrategyContext = {
        projectDir: ctx.projectDir,
        journalCtx: journalCtxForRepair,
        timeline,
        attempt: 1,
        ai: () => createAIContext(ctx.projectDir, journalCtxForRepair),
      };

      // ── UnblockStrategy: coordinates all sub-strategies (pattern repair, dependency backoff, ...) ──
      console.log(`   🔧 Running UnblockStrategy...`);
      try {
        const unblockResult = await new UnblockStrategy().tryFix(
          blockerGap,
          strategyCtx,
        );

        if (
          unblockResult.success &&
          unblockResult.retryMode &&
          typeof unblockResult.retryMode === "object" &&
          unblockResult.retryMode.type === "backoff"
        ) {
          const producers = (unblockResult.metadata?.producers ?? []) as Array<{
            taskId: string;
            epicId: string;
            journalTaskId: string;
            filePath: string;
          }>;

          // ── Preflight mode: print decision and stop ─────────────────
          if (ctx.analyzeOnly) {
            console.log(
              `\n📊 Preflight mode — strategy selected, stopping before execution`,
            );
            console.log(
              `   Strategy : ${unblockResult.metadata?.solvedBy ?? "unblock-coordinator"}`,
            );
            console.log(`   Reason   : ${unblockResult.reason}`);
            if (producers.length > 0) {
              console.log(`   Producers to re-run:`);
              producers.forEach((p) =>
                console.log(
                  `     → ${p.epicId}/${p.journalTaskId} (${p.filePath})`,
                ),
              );
            }
            console.log(`\n   To execute: pnpm converge run --step\n`);
            delete process.env.CONVERGE_TASK_ATTEMPT;
            delete process.env.CONVERGE_TASK_ATTEMPT_DIR;
            return {
              success: true,
              attemptNumber,
              isWbsTask: false,
              durationMs: 0,
              isBlocking: false,
            };
          }

          if (producers.length > 0) {
            // Per-producer attempt-budget guard. Without this, an
            // exhausted-budget failed producer gets re-run by the repair
            // path (no per-task counter scopes this caller), the empty
            // task auto-succeeds, and the original failure is silently
            // erased. The budget here matches autonomous-run's default
            // (2). When exhausted, skip the re-run; the consumer's
            // failure will roll up and downstream blocking takes over.
            const PRODUCER_RETRY_BUDGET = 2;
            for (const producer of producers) {
              const producerCkpt = new UnitCheckpointManager(
                ctx.projectDir,
                "task",
                producer.epicId,
                producer.journalTaskId,
              );
              const producerAttempts = await producerCkpt.getAttemptCount();
              if (producerAttempts >= PRODUCER_RETRY_BUDGET) {
                console.log(
                  `\n   ⛔ Producer ${producer.epicId}/${producer.journalTaskId} has exhausted retry budget (${producerAttempts}/${PRODUCER_RETRY_BUDGET}) — leaving terminal failure intact.`,
                );
                continue;
              }
              console.log(
                `\n   ▶  Re-running producer: ${producer.epicId}/${producer.journalTaskId} (attempts: ${producerAttempts}/${PRODUCER_RETRY_BUDGET})`,
              );
              try {
                await executeTask(
                  {
                    projectDir: ctx.projectDir,
                    epicId: producer.epicId,
                    journalTaskId: producer.journalTaskId,
                    filePath: producer.filePath,
                    sessionLogger,
                  },
                  checkpointMgr,
                );
              } catch (err: any) {
                console.warn(`   ⚠️  Producer re-run failed: ${err.message}`);
              }
            }

            // Re-check inputs after producers ran
            console.log(`\n   🔄 Re-checking inputs after producer re-run...`);
            snapshotPaths = await writeContextSnapshot(snapshotArgs);
            if (!snapshotPaths.blocked) {
              console.log(`   ✅ Inputs satisfied after producer re-run`);
              proceedToExecution = true;
            } else {
              console.log(
                `   ❌ Inputs still missing after producer re-run: ${snapshotPaths.blockedReason}`,
              );
            }
          }
        } else if (unblockResult.success) {
          // Pattern repair or other non-backoff strategy succeeded — re-check inputs
          console.log(
            `   ✅ ${unblockResult.metadata?.solvedBy ?? "UnblockStrategy"} succeeded — re-checking inputs`,
          );
          snapshotPaths = await writeContextSnapshot(snapshotArgs);
          if (!snapshotPaths.blocked) {
            proceedToExecution = true;
          }
        } else if (ctx.analyzeOnly) {
          // Preflight mode: report that no repair strategy found a solution
          console.log(`\n📊 Preflight mode — no repair strategy succeeded`);
          console.log(`   Reason: ${unblockResult.reason}`);
          console.log(
            `\n   Task will remain blocked until inputs are available.\n`,
          );
          delete process.env.CONVERGE_TASK_ATTEMPT;
          delete process.env.CONVERGE_TASK_ATTEMPT_DIR;
          return {
            success: false,
            attemptNumber,
            isWbsTask: false,
            durationMs: 0,
            isBlocking: false,
          };
        }
      } catch (err: any) {
        console.warn(`   ⚠️  UnblockStrategy error: ${err.message}`);
      }

      // Analyze mode: if we reach here and haven't already returned, report status
      if (ctx.analyzeOnly && !proceedToExecution) {
        console.log(
          `\n📊 Preflight mode — task blocked, no automated repair available\n`,
        );
        delete process.env.CONVERGE_TASK_ATTEMPT;
        delete process.env.CONVERGE_TASK_ATTEMPT_DIR;
        return {
          success: false,
          attemptNumber,
          isWbsTask: false,
          durationMs: 0,
          isBlocking: false,
        };
      }

      if (!proceedToExecution) {
        // Inputs are unmet and no repair strategy unblocked them. This is
        // NOT a task failure — the producer just hasn't run yet. Returning
        // `failed` here makes autonomous-run increment the structural-attempt
        // counter, and after maxTaskAttempts (default 2) the task gets
        // permanently terminal-failed even though the agent never ran. That
        // wastes the retry budget on tasks the framework hasn't even tried
        // to execute.
        //
        // Instead, write a "blocked" result snapshot, leave the unit's
        // checkpoint in pending state, and return `success:false` with a
        // distinct `inputGateUnmet` flag so the scheduler knows to defer
        // (NOT increment the attempt counter). The next iteration will
        // re-check; once the producer writes its outputs, the gate clears.
        const blockedStartedAt = new Date().toISOString();
        await writeResultSnapshot(
          attemptDir,
          ctx.projectDir,
          "blocked",
          0,
          attemptNumber,
        );

        // Clean up environment variables
        delete process.env.CONVERGE_TASK_ATTEMPT;
        delete process.env.CONVERGE_TASK_ATTEMPT_DIR;

        return {
          success: false,
          attemptNumber,
          isWbsTask: false,
          durationMs: 0,
          isBlocking: false,
          inputGateUnmet: true,
        };
      }
    }
  } catch (err: any) {
    console.warn(`   ⚠️  Context snapshot creation failed: ${err.message}`);
    // Continue anyway - AI can work without these files (degraded mode)
  }

  // ── Preflight mode: task is ready to run — print what would execute and stop ──
  if (ctx.analyzeOnly) {
    console.log(
      `\n📊 Preflight mode — task inputs satisfied, ready to execute`,
    );
    console.log(`   Task    : ${ctx.journalTaskId}`);
    console.log(`   Epic    : ${ctx.epicId}`);
    console.log(`   File    : ${ctx.filePath}`);
    console.log(`\n   To execute: pnpm converge run --step\n`);
    delete process.env.CONVERGE_TASK_ATTEMPT;
    delete process.env.CONVERGE_TASK_ATTEMPT_DIR;
    return {
      success: true,
      attemptNumber,
      isWbsTask: false,
      durationMs: 0,
      isBlocking: false,
    };
  }

  // ── 2. Initialize Event Logging (File-First) ──────────────────────
  const eventsFile = path.join(attemptDir, "logs", "events.jsonl");

  // Clear stale events from a previous crashed attempt so the ConsoleFormatter
  // doesn't replay old events that look like the current run is failing repeatedly.
  if (!isResumingInterrupted && existsSync(eventsFile)) {
    await rm(eventsFile);
  }

  const eventWriter = new TaskEventWriter(eventsFile);

  // Start console formatter to tail events in real-time
  const formatter = new ConsoleFormatter(eventsFile, {
    minLevel: "info",
    useColor: true,
    useIcons: true,
  });

  // Wait for formatter to start before continuing
  // This ensures the file watcher is ready to capture events
  try {
    await formatter.start();
    console.log(`   📊 Event logging started → ${eventsFile}`);
  } catch (err: any) {
    console.warn(`   ⚠️  Console formatter failed to start: ${err.message}`);
    console.warn(
      `   ⚠️  Events will still be written to file, but won't be formatted to console`,
    );
  }

  // ── 2.5. Bridge Task Events to Session Logger ──────────────────────
  let sessionBridge: SessionEventBridge | null = null;
  if (sessionLogger) {
    sessionBridge = new SessionEventBridge(sessionLogger);
    // Start monitoring task events immediately (will read events as they're written)
    await sessionBridge.monitorTaskEvents(ctx.journalTaskId, eventsFile);
  }

  // ── 3. Mark Ancestors Running ──────────────────────────────────────
  // If we have a preloaded unit with context, use context-based propagation
  if (preloadedUnit?.context) {
    await markAncestorsRunning(preloadedUnit);
  } else {
    await markAncestorsRunning(ctx.projectDir, ctx.epicId, ctx.journalTaskId);
  }

  // ── 4. Initialize Universal Unit Checkpoint ────────────────────────
  // Use UnitCheckpointManager for consistent checkpoint management
  const unitCkpt = new UnitCheckpointManager(
    ctx.projectDir,
    "task",
    ctx.epicId,
    ctx.journalTaskId,
  );
  const attemptStartedAt = new Date().toISOString();
  await unitCkpt.startAttempt(attemptNumber);

  // Expose current task checkpoint globally so signal handlers (SIGINT/SIGTERM)
  // can mark it as interrupted before the process exits.
  const prevCurrentTask = (global as any).__CONVERGE_CURRENT_TASK__;
  (global as any).__CONVERGE_CURRENT_TASK__ = {
    journalTaskId: ctx.journalTaskId,
    unitCkpt,
  };

  // Also update legacy TaskCheckpointManager for backward compatibility
  const taskCkpt = new TaskCheckpointManager(
    ctx.projectDir,
    ctx.epicId,
    ctx.journalTaskId,
  );
  await taskCkpt.startAttempt(attemptNumber);

  // ── 5. Execute Unit (convergence loop inside Unit.run()) ───────────
  let success = false;
  let isWbsTask = false;
  let isBlocking = false;
  let resetSiblings: string[] | undefined;
  let unit: Unit | null = null;
  const executionStartTime = Date.now();

  try {
    // Use preloaded unit if available, otherwise load from path
    // Always use fromPath() - it handles TASK.md and other formats
    unit = preloadedUnit ?? (await Unit.fromPath(ctx.filePath));

    isWbsTask = !!unit.wbsFn;
    isBlocking = !!unit.config.blocking;

    // ── 5.5. Copy Task Materials ───────────────────────────────────────
    // If TASK.md declares materials:, copy them to the attempt directory
    const materials = unit.vars?._materials as string[] | undefined;
    if (materials && materials.length > 0) {
      const taskDir = path.dirname(ctx.filePath);
      await copyTaskMaterials(taskDir, attemptDir, materials);
    }

    // Log task start event
    eventWriter.taskStart({
      taskId: ctx.journalTaskId,
      taskName: unit.title || unit.id || ctx.journalTaskId,
      attempt: attemptNumber,
      inputs: unit.inputs || [],
      outputs: unit.outputs || [],
    });
    console.log(`   ✅ Logged task_start event to ${eventsFile}`);

    // Set event writer in process environment for Unit and children to use
    // This allows the entire execution tree to access the event writer
    (global as any).__CONVERGE_EVENT_WRITER__ = eventWriter;

    // Set session logger in global context for gap resolution to access
    if (sessionLogger) {
      (global as any).__CONVERGE_SESSION_LOGGER__ = sessionLogger;
    }

    success = await unit.run();
  } catch (err: any) {
    console.error(`\n❌ Task threw an error: ${err.message}`);
    console.error(err.stack);
    success = false;

    // Log error event
    eventWriter.write({
      type: "ai_error" as any,
      level: "error",
      error: err.message,
      stack: err.stack,
    });
  } finally {
    // Clear global event writer reference
    delete (global as any).__CONVERGE_EVENT_WRITER__;
    delete (global as any).__CONVERGE_SESSION_LOGGER__;

    // Restore previous task tracking (supports nested task execution)
    if (prevCurrentTask) {
      (global as any).__CONVERGE_CURRENT_TASK__ = prevCurrentTask;
    } else {
      delete (global as any).__CONVERGE_CURRENT_TASK__;
    }
  }

  const durationMs = Date.now() - executionStartTime;

  // Log completion or failure
  try {
    if (success && unit) {
      eventWriter.taskComplete(
        ctx.journalTaskId,
        durationMs,
        unit.outputs || [],
      );
    } else {
      eventWriter.taskFailed(
        ctx.journalTaskId,
        success ? "Convergence not achieved" : "Task execution failed",
        durationMs,
      );
    }
  } finally {
    // Close event writer and stop formatter
    eventWriter.close();
    formatter.stop();

    // Stop session event bridge
    if (sessionBridge) {
      sessionBridge.stop();
    }

    // Always clear so subsequent journal reads are not attempt-scoped
    delete process.env.CONVERGE_TASK_ATTEMPT;
    delete process.env.CONVERGE_TASK_ATTEMPT_DIR;
  }

  // ── 6. Update Checkpoints ──────────────────────────────────────────
  if (success) {
    // Clean up LEARN.md — task succeeded, guidance no longer needed
    const learnMdPath = path.join(wipDir, "LEARN.md");
    if (existsSync(learnMdPath)) {
      await rm(learnMdPath, { force: true });
    }

    // Settle delay: after the AI's spawn ends, give the filesystem a moment
    // for buffered writes to flush before running the post-attempt check
    // pass. Without this, fast-completing tasks routinely show false-negative
    // FEEDBACK.md (declared outputs missing, checks failing on files that
    // are about to appear), forcing a wasteful retry attempt.
    await new Promise((r) => setTimeout(r, 250));

    await writeResultSnapshot(
      wipDir,
      ctx.projectDir,
      "success",
      durationMs,
      attemptNumber,
    );

    // Enhance session logs with detailed tool calls from agentfn index.jsonl
    if (sessionLogger) {
      await enhanceSessionLogsFromAttempt(
        wipDir,
        ctx.journalTaskId,
        sessionLogger,
      );
    }

    // Update universal unit checkpoint
    await unitCkpt.completeAttempt(attemptNumber, "success", attemptStartedAt);

    // Update legacy task checkpoint for backward compatibility
    await taskCkpt.completeAttempt(attemptNumber, "success", attemptStartedAt);

    if (isWbsTask) {
      // WBS parent: mark as seeded (locked but not complete)
      // It completes automatically once all children finish
      await unitCkpt.markSeeded();
      await checkpointMgr.markTaskSeeded(ctx.journalTaskId, ctx.epicId);
      console.log(`\n✅ WBS seeded — waiting for children`);
    } else {
      // Regular task: mark as complete
      await unitCkpt.markComplete();
      await checkpointMgr.markTaskCompleted(ctx.journalTaskId, ctx.epicId);
      console.log(`\n✅ Task complete`);
    }
  } else {
    // Enhanced logging for debugging false failures
    console.error(`\n❌ Task did not converge`);
    console.error(`   Task ID: ${ctx.journalTaskId}`);
    console.error(`   Unit.run() returned: ${success}`);
    console.error(`   isWbsTask: ${isWbsTask}, isBlocking: ${isBlocking}`);
    console.error(`   Duration: ${durationMs}ms, Attempt: ${attemptNumber}`);

    await writeResultSnapshot(
      wipDir,
      ctx.projectDir,
      "failed",
      durationMs,
      attemptNumber,
    );

    // Enhance session logs with detailed tool calls from agentfn index.jsonl
    if (sessionLogger) {
      await enhanceSessionLogsFromAttempt(
        wipDir,
        ctx.journalTaskId,
        sessionLogger,
      );
    }

    // Self-correction: generate LEARN.md from check results if AI didn't write one
    await generateLearnMd(wipDir, ctx.projectDir, attemptNumber);

    // Loop detection: scan attempt's tool-call log for thrashing, append hint
    // to LEARN.md so the next attempt knows to question the check predicate.
    try {
      const loopResult = await detectAttemptLoop(wipDir);
      if (loopResult.detected) {
        await augmentLearnMdWithLoopHint(wipDir, loopResult);
        console.log(
          `   🔁 Loop detected (${loopResult.hotSignatures.length} hot signature(s)) — hint appended to LEARN.md`,
        );
      }
    } catch (err) {
      console.warn(`   ⚠️  Loop detector skipped: ${(err as Error).message}`);
    }

    // Buggy-check relaxer: if the agent flagged a check as wrong via
    // BUGGY_CHECK.md, validate the proposed cmd and patch the materialized
    // TASK.md so the next attempt sees the corrected predicate. Source
    // TASK.md is intentionally not touched.
    try {
      const relax = await tryRelaxBuggyCheck(wipDir);
      if (relax.applied) {
        console.log(
          `   🛠  Buggy-check relaxer applied to "${relax.checkId}":`,
        );
        console.log(`      old: ${relax.oldCmd}`);
        console.log(`      new: ${relax.newCmd}`);
      } else if (relax.reason !== "no BUGGY_CHECK.md present") {
        console.log(`   ⚠️  Buggy-check proposal rejected: ${relax.reason}`);
      }
    } catch (err) {
      console.warn(`   ⚠️  Buggy-check relaxer skipped: ${(err as Error).message}`);
    }

    try {
      // Update universal unit checkpoint
      await unitCkpt.completeAttempt(attemptNumber, "failed", attemptStartedAt);
      await unitCkpt.markFailed();

      // Update legacy checkpoints
      await taskCkpt.completeAttempt(attemptNumber, "failed", attemptStartedAt);
      await checkpointMgr.markTaskFailed(ctx.journalTaskId, ctx.epicId);

      // Verify the update was persisted (V2 uses per-task checkpoint files, not failedTasks array)
      const isFailed = await checkpointMgr.isTaskFailed(
        ctx.journalTaskId,
        ctx.epicId,
      );
      if (!isFailed) {
        console.warn(
          `⚠️  Warning: Task ${ctx.journalTaskId} not found as failed after markTaskFailed`,
        );
      } else {
        console.log(`   ✓ Checkpoint updated: task marked as failed`);
      }
    } catch (err: any) {
      console.error(
        `❌ Failed to update checkpoint for failed task: ${err.message}`,
      );
      throw err; // Re-throw to prevent rollUpCompletion with bad state
    }

    // ── 6.5. On-Fail Sibling Reset ───────────────────────────────────
    if (unit?.onFail?.reset?.length) {
      resetSiblings = [];
      for (const siblingId of unit.onFail.reset) {
        try {
          const siblingUnitCkpt = new UnitCheckpointManager(
            ctx.projectDir, "task", ctx.epicId, siblingId,
          );
          const siblingCheckpoint = await siblingUnitCkpt.load();
          if (!siblingCheckpoint) {
            console.warn(`   ⚠️  on-fail reset: sibling "${siblingId}" not found — skipping`);
            continue;
          }
          if (siblingCheckpoint.status === "pending") {
            continue;
          }
          await checkpointMgr.removeFromCompleted(siblingId, ctx.epicId);
          resetSiblings.push(siblingId);
          console.log(`   ↩️  on-fail reset: "${siblingId}" → pending`);
        } catch (err: any) {
          console.warn(`   ⚠️  on-fail reset failed for "${siblingId}": ${err.message}`);
        }
      }
    }
  }

  // ── 7. Propagate Completion/Failure Up the Tree ────────────────────
  // Use Unit-based rollup if we have a unit with context, otherwise legacy
  if (unit?.context) {
    await rollUpCompletion(unit, checkpointMgr);
  } else {
    await rollUpCompletion(
      ctx.projectDir,
      ctx.epicId,
      ctx.journalTaskId,
      checkpointMgr,
    );
  }

  // ── 8. Archive wip → attempts/{n}/ ──────────────────────────────────
  if (existsSync(wipDir)) {
    const archiveDir = path.join(path.dirname(wipDir), attemptPadded);

    // With the junction design, wip IS the real numbered dir (01/, 02/, …).
    // Just remove the junction pointer — data is already in attempts/{n}/.
    // For old-style real directories (migration path), fall back to cp + rm.
    const wipLstat = await import("node:fs/promises").then((m) =>
      m.lstat(wipDir).catch(() => null),
    );
    if (wipLstat?.isSymbolicLink()) {
      await rm(wipDir); // unlink junction only, real dir stays
    } else {
      await cp(wipDir, archiveDir, { recursive: true });
      await rm(wipDir, { recursive: true, force: true });
    }

    // Mask wip paths → attempts/{n}/ in all log files that captured absolute paths
    // during execution. The wip dir no longer exists after archiving, so any
    // stored references to it become stale without this rewrite.
    const wipAbs = wipDir.replace(/\\/g, "/");
    const archiveAbs = archiveDir.replace(/\\/g, "/");

    // Rewrite task-level README
    const taskJournalDir = path.dirname(path.dirname(wipDir));
    const readmePath = path.join(taskJournalDir, "README.md");
    if (existsSync(readmePath)) {
      const content = await readFile(readmePath, "utf-8");
      const updated = content.replace(
        "attempts/wip/",
        `attempts/${attemptPadded}/`,
      );
      if (updated !== content) await writeFile(readmePath, updated, "utf-8");
    }

    // Rewrite session log files (session.log + events.jsonl) which embed
    // absolute tool-call paths like /attempts/wip/TASK.md
    if (sessionLogger) {
      const sessionDir = sessionLogger.getSessionDir();
      for (const filename of ["session.log", "events.jsonl"]) {
        const filePath = path.join(sessionDir, filename);
        if (existsSync(filePath)) {
          const content = await readFile(filePath, "utf-8");
          const updated = content.replaceAll(wipAbs, archiveAbs);
          if (updated !== content) await writeFile(filePath, updated, "utf-8");
        }
      }
    }
  }

  return {
    success,
    attemptNumber,
    isWbsTask,
    durationMs,
    isBlocking,
    resetSiblings,
  };
}
