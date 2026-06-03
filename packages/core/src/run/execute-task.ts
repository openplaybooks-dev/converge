/**
 * Task lifecycle management for run-phase task execution.
 */

import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { Unit } from "../task/unit/index.ts";
import { TaskStateManager, TaskUnitStateManager, UnitStateManager } from "../checkpoint/state.ts";
import type { RunStateManager } from "../manifest/run-state-manager.js";
import {
  markAncestorsRunning,
  rollUpCompletion,
} from "../task/lifecycle/ancestor-propagation.ts";
import { generateLearnMd } from "../task/lifecycle/learn.ts";
import {
  detectAttemptLoop,
  augmentLearnMdWithLoopHint,
} from "../task/lifecycle/loop-detector.ts";
import { tryRelaxBuggyCheck } from "../task/lifecycle/buggy-check-relaxer.ts";
import { writeResultSnapshot } from "../task/lifecycle/result-snapshot.ts";
import { writeContextSnapshot } from "../task/lifecycle/context-snapshot.ts";
import type { ContextSnapshotParams } from "../task/lifecycle/context-snapshot.ts";
import { TaskEventWriter } from "../journal/event-writer.ts";
import { ConsoleFormatter } from "../journal/console-formatter.ts";
import { ExecutionEventBridge } from "../journal/session-event-bridge.ts";
import { enhanceExecutionLogsFromAttempt } from "../journal/enhance-session-logs.ts";
import { copyTaskMaterials } from "../task/unit/factories.ts";
import { parseTaskMd } from "../config/task-md-definition.ts";
import { FactsLogger } from "../task/facts/api.ts";
import { buildTaskEnv } from "./task-env.ts";
import type { InterceptorRegistry } from "../hooks/interceptor-registry.ts";
import type { FactsApiFn, FactsContext } from "../config/task-definition.ts";
import type { TaskContext } from "../task/unit/task-context.ts";
import { UnblockStrategy } from "../navigator/repair/strategies/unblock.ts";
import {
  findProducersForInputs,
  producerCheckpointStatusIsFailed,
} from "../navigator/repair/strategies/dependency-backoff.ts";
import type { ProducerInfo } from "../navigator/repair/strategies/dependency-backoff.ts";
import { ExecutionTimeline } from "../navigator/repair/timeline.ts";
import type { Gap } from "../task/gap/types.ts";
import type { StrategyContext } from "../navigator/repair/types.ts";
import { createAIContext } from "../ai/context.ts";
import path from "node:path";
import { cp, rm, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { constructJournalPath } from "../task/unit/path-utils.ts";
import {
  appendTaskStatus,
  ensureRuntimeLedger,
} from "../task/goal/runtime-ledger.ts";
import { execSync } from "node:child_process";

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

/**
 * Execute a passthrough task: extract ```bash fence(s) from TASK.md
 * and run them as a single shell script. No spawner child-validation.
 *
 * @param unit The task unit to execute
 * @param projectDir Absolute path to the project root
 * @returns true on successful execution, false on failure
 */
async function runPassthroughTask(
  unit: Unit,
  projectDir: string,
  taskEnv: NodeJS.ProcessEnv,
): Promise<boolean> {
  try {
    // Resolve TASK.md path
    const unitPath = (unit as any).path;
    let taskMdPath: string | undefined;

    if (unitPath && existsSync(unitPath)) {
      if (unitPath.endsWith("TASK.md")) {
        taskMdPath = unitPath;
      } else {
        const candidate = path.join(unitPath, "TASK.md");
        if (existsSync(candidate)) taskMdPath = candidate;
      }
    }

    if (!taskMdPath) {
      console.error(`   ❌ TASK.md not found for passthrough task "${unit.id}"`);
      return false;
    }

    // Ensure exec dir exists
    const execDir = process.env.CONVERGE_TASK_DIR;
    if (!execDir) {
      console.error(`   ❌ CONVERGE_TASK_DIR not set; passthrough task cannot execute`);
      return false;
    }
    mkdirSync(execDir, { recursive: true });

    // Parse TASK.md and extract shell commands
    const parsed = await parseTaskMd(taskMdPath);
    const body = parsed?.body ?? "";
    const commands = extractShellCommands(body);

    if (commands.length === 0) {
      console.error(`   ❌ No shell commands found in passthrough task "${unit.id}"`);
      return false;
    }

    console.log(
      `   ⚡ Passthrough (task): running ${commands.length} shell command(s)`,
    );

    // Build script with environment setup
    const envSetup =
      'export PATH="$(pwd)/node_modules/.bin:$PATH"\n' +
      'if [ -n "${CONVERGE_BIN:-}" ] && [ -f "$CONVERGE_BIN" ]; then\n' +
      '  converge() { node "$CONVERGE_BIN" "$@"; }\n' +
      '  export -f converge 2>/dev/null || true\n' +
      'fi\n';

    const script = envSetup + commands.join("\n");
    const bashShell = process.platform === "win32" ? "bash" : "/bin/bash";

    execSync(script, {
      cwd: projectDir,
      stdio: "inherit",
      timeout: 120_000,
      shell: bashShell,
      env: taskEnv,
    });

    return true;
  } catch (err: any) {
    console.error(`   ❌ Passthrough task execution error: ${err.message}`);
    return false;
  }
}

/** Extract shell commands from fenced ```bash / ```sh / ```shell blocks. */
function extractShellCommands(body: string): string[] {
  const commands: string[] = [];
  const fenceRegex = /```(?:bash|sh|shell)?\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(body)) !== null) {
    const raw = match[1].trim();
    if (raw.length > 0) commands.push(raw);
  }
  return commands;
}

function clearTaskEnv(): void {
  for (const k of Object.keys(process.env)) {
    if (
      k.startsWith("CONVERGE_VAR_") ||
      k === "CONVERGE_TASK_ATTEMPT" ||
      k === "CONVERGE_TASK_ATTEMPT_DIR" ||
      k === "CONVERGE_TASK_WAVE" ||
      k === "CONVERGE_TASK_WAVE_SOURCE"
    ) {
      delete process.env[k];
    }
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
    review?: {
      artifact: string;
      format?: "md" | "html";
      prompt?: string;
      skill?: string;
    };
    vars?: Record<string, unknown>;
  };
  /** Optional TASK.md body content for context snapshot */
  body?: string;
  /** Optional session logger for session-level event recording */
  executionLogger?: any; // Import type would be ExecutionLogger but avoiding circular deps
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
  /** Extra vars to merge into task context (e.g. epoch number from evolve runner) */
  extraVars?: Record<string, unknown>;
  /** RunStateManager for execution-scoped result tracking */
  runResults?: RunStateManager;
}

export interface TaskExecutionResult {
  /** Whether the task succeeded */
  success: boolean;
  /** Attempt number that was executed */
  attemptNumber: number;
  /** Whether this task spawned children (mode: spawner / converger). */
  isWbsTask: boolean;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether this task is a blocker (must complete successfully) */
  isBlocking: boolean;
  /** Sibling task IDs that were reset to pending by on-fail config */
  resetSiblings?: string[];
  /** Queue task already converged (no work to do) */
  _queueConverged?: boolean;
  /** Queue task exceeded max batches */
  _queueMaxedOut?: boolean;
  /** Queue task has more work remaining */
  _queueNotConverged?: boolean;
  /** Converger task has more waves to run before halting. */
  _incrementalSeedNotDone?: boolean;
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
  /**
   * True when the task's outputs and checks succeeded but its declared
   * `review:` block is awaiting a human verdict. The scheduler should
   * mark the node blocked (not failed) and poll the inventory's review
   * JSONL for an `approve` decision before proceeding.
   */
  blocked?: boolean;
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
/**
 * Optional plumbing handed in by the run loop. Decoupled from the main
 * positional signature so callers outside the loop (tests, ad-hoc CLI
 * invocations, replays) can pass nothing.
 */
export interface ExecuteTaskOptions {
  /**
   * Pull newly-spawned children from tasks.jsonl into the live DAG so
   * mid-strategy spawns (e.g. TaskRunStrategy creating subtasks) enter
   * the running pass without waiting for the next outer iteration.
   * Wired by the run loop via a closure over `dag` + `resultsMgr`.
   */
  syncSpawnedToDag?: () => Promise<void>;
  /** RFC 0021: stub mode — run stub.cmd and skip AI convergence */
  stubMode?: boolean;
  /** Skip env-var and outputs-exist pre-flight checks */
  skipPreflight?: boolean;
  /** Interceptor registry for middleware chains (RFC 0014) */
  interceptorRegistry?: InterceptorRegistry;
}

export async function executeTask(
  unitOrCtx: Unit | TaskExecutionContext,
  checkpointMgrOrExecutionLogger?: TaskStateManager | any,
  executionLoggerOpt?: any,
  execOptions?: ExecuteTaskOptions,
): Promise<TaskExecutionResult> {
  const mirrorTaskStatus = (
    status: "doing" | "awaiting-review" | "done" | "blocked" | "dropped",
  ) => {
    try {
      const playbookName = process.env.CONVERGE_PLAYBOOK || "default";
      ensureRuntimeLedger(ctx.projectDir, playbookName, undefined);
      // Extract leaf ID: "parent/child" -> "child", "task-id" -> "task-id"
      const taskId = ctx.journalTaskId.split("/").pop() ?? ctx.journalTaskId;
      // No metadata payload — the status mirror only mutates `status`.
      // Passing `{ checkpointMirrored: true }` here used to clobber
      // applyManifest-written metadata (template, renderedHash) on
      // every transition, leaving spawned children with no template
      // identity and tripping duplicate-id on the next apply.
      appendTaskStatus(ctx.projectDir, playbookName, taskId, status);
    } catch {
      // ledger mirror is best effort
    }
  };
  // Normalize parameters based on signature
  let ctx: TaskExecutionContext;
  let preloadedUnit: Unit | undefined;
  let checkpointMgr: TaskStateManager;
  let executionLogger: any | undefined;

  if ("path" in unitOrCtx && "parent" in unitOrCtx) {
    // New signature: executeTask(unit, checkpointMgr, executionLogger?)
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
      // These will be populated from unit later
    };

    checkpointMgr = checkpointMgrOrExecutionLogger as TaskStateManager;
    executionLogger = executionLoggerOpt;
  } else {
    // Legacy signature: executeTask(ctx, checkpointMgr)
    ctx = unitOrCtx as TaskExecutionContext;
    checkpointMgr = checkpointMgrOrExecutionLogger as TaskStateManager;
    executionLogger = ctx.executionLogger;
  }
  // ── 0. Container guard — skip attempts for pure container tasks ──
  // A container has child task directories under `tasks/`. With the seed
  // system removed, all such containers are "pure" — the parent has no
  // own body to run; it just blocks until children complete. Static
  // containers fall through here; mode: spawner/converger run their
  // body via the runner instead and don't need this guard.
  {
    const guardUnit = preloadedUnit ?? (await Unit.fromPath(ctx.filePath));
    if (!preloadedUnit) preloadedUnit = guardUnit; // reuse below

    if (
      !guardUnit.executorFn &&
      !guardUnit.loopFn &&
      !guardUnit.mode // typed-mode tasks run via the runner, not the container skip
    ) {
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
        console.log(
          `   ⏳ Container task — blocking until children complete`,
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
  }

  // ── 0.0. Stub mode — run stub.cmd and skip AI convergence ──
  // RFC 0021: script-based stubs take priority over inline stub.cmd.
  // If taskDef.cmd points to a script in taskFolder/scripts/, run it.
  // Otherwise fall back to stub: block.
  if (execOptions?.stubMode) {
    const stubUnit = preloadedUnit ?? (await Unit.fromPath(ctx.filePath));
    if (!preloadedUnit) preloadedUnit = stubUnit;

    // Check for script-based stub first (cmd: scripts/<name>)
    const taskFolder = path.dirname(ctx.filePath);
    const stubDef = existsSync(ctx.filePath) ? (await parseTaskMd(ctx.filePath))?.def : null;
    const cmdScript = stubDef?.cmd;
    let stubCmdToRun: string | null = null;

    if (cmdScript) {
      const scriptPath = path.join(taskFolder, "scripts", cmdScript);
      if (existsSync(scriptPath)) {
        stubCmdToRun = `python "${scriptPath}"`;
      }
    }

    // Fall back to inline stub: block if no script found
    if (!stubCmdToRun && stubDef?.stub) {
      stubCmdToRun = stubDef.stub.cmd;
    }

    if (stubCmdToRun) {
      // Execute stub command directly
      const taskId = ctx.journalTaskId.split("/").pop() ?? ctx.journalTaskId;
      const attemptDir = path.join(ctx.projectDir, ".converge", "journal", ctx.epicId, taskId, "wip");
      await mkdir(attemptDir, { recursive: true });
      const child = spawnSync(stubCmdToRun, [], {
        cwd: attemptDir,
        shell: true,
        encoding: "utf-8",
      });
      if (child.status === 0) {
        // RFC 0047: a stub run must faithfully reproduce the review gate so a
        // stubbed task can be driven through approve/reject without a live AI.
        // The stub.cmd is responsible for writing the artifact (stub bypasses
        // verify/findGaps); here we only apply the human-verdict gate. Read the
        // block from the freshly-parsed def — the preloaded Unit comes from the
        // manifest, which does not carry `handoff`.
        if (stubDef?.review ?? stubDef?.handoff) {
          const { evaluateReviewGate } = await import("../task/review.ts");
          const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";
          const gate = await evaluateReviewGate(
            ctx.projectDir,
            playbookName,
            ctx.journalTaskId,
          );
          if (gate.status !== "approved") {
            if (gate.status === "revise") {
              console.log(`\n⏸  awaiting-revision · ${gate.feedback}`);
            } else if (gate.status === "reject") {
              console.log(`\n⛔  review-rejected · ${gate.feedback}`);
            } else {
              console.log(`\n⏸  awaiting-review · task output produced, holding for human verdict`);
            }
            mirrorTaskStatus("awaiting-review");
            return {
              success: false,
              attemptNumber: 1,
              isWbsTask: false,
              durationMs: 0,
              isBlocking: false,
              blocked: true,
            } as any;
          }
        }
        return {
          success: true,
          attemptNumber: 1,
          isWbsTask: false,
          durationMs: 0,
          isBlocking: false,
        };
      } else {
        return {
          success: false,
          attemptNumber: 1,
          isWbsTask: false,
          durationMs: 0,
          isBlocking: false,
        };
      }
    } else {
      return {
        success: true,
        attemptNumber: 0,
        isWbsTask: false,
        durationMs: 0,
        isBlocking: false,
      };
    }
  }

  // ── 0.5. Incremental materialization — skip if already completed ──
  // mode: converger tasks own their own halt logic via the wave loop;
  // legacy `keepLooping` semantics from the seed era are gone.
  {
    const guardUnit = preloadedUnit;
    if (guardUnit?.materialization === "incremental") {
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

  // ── 0.6. Queue materialization — skip if already drained ──
  // Queue tasks always re-execute if pending items remain.
  // If the state file exists and has no pending items, skip (converged).
  {
    const guardUnit = preloadedUnit;
    if (guardUnit?.materialization === "queue" && guardUnit?.incrementConfig) {
      const { computeQueueContext, checkQueueConvergence } = await import("../task/incremental.ts");
      const qCtx = computeQueueContext(
        guardUnit.materialization,
        guardUnit.incrementConfig,
        ctx.projectDir,
      );
      if (qCtx.isQueue) {
        if (!qCtx.hasPending && qCtx.stateFilePath && qCtx.state) {
          // State file exists with no pending — already converged
          const completed = await checkpointMgr.getCompletedTasks();
          if (completed.includes(ctx.journalTaskId)) {
            return {
              success: true,
              attemptNumber: 0,
              isWbsTask: false,
              durationMs: 0,
              isBlocking: !!guardUnit.blocking,
              _queueConverged: true,
            };
          }
        }
        if (qCtx.maxBatchesExceeded) {
          console.warn(
            `   ⚠ Queue task ${ctx.journalTaskId}: max batches (${qCtx.maxBatches}) exceeded. Marking complete.`,
          );
          return {
            success: true,
            attemptNumber: 0,
            isWbsTask: false,
            durationMs: 0,
            isBlocking: !!guardUnit.blocking,
            _queueMaxedOut: true,
          };
        }
        // Store queue context for post-execution convergence check
        (ctx as any)._queueContext = qCtx;
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
    );
    attemptNumber = Math.max(currentAttempts, 1);
    console.log(
      `   ⚡ Resuming interrupted attempt #${attemptNumber} (wip/ preserved)`,
    );
  } else {
    attemptNumber = await checkpointMgr.incrementTaskAttempt(
      ctx.journalTaskId,
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
  mirrorTaskStatus("doing");

  // Set environment variables for journal routing
  process.env.CONVERGE_TASK_ATTEMPT = attemptPadded;
  process.env.CONVERGE_TASK_ATTEMPT_DIR = attemptDir;

  // Expose the converge CLI binary path so task bodies can always invoke
  // it as `node "$CONVERGE_BIN" spawn ...` regardless of whether
  // `converge` is on PATH. Passthrough bodies also get a `converge`
  // shell function (see task-run.ts:268) that delegates to this binary,
  // so the natural shape `converge spawn <id> --from <tpl>` works
  // uniformly in every passthrough body.
  //
  // We're running INSIDE the CLI right now, so process.argv[1] is the
  // dist entry that we want bodies to re-invoke.
  if (!process.env.CONVERGE_BIN && typeof process.argv[1] === "string") {
    process.env.CONVERGE_BIN = process.argv[1];
  }

  // Per-task wave counter — first-class framework primitive with three
  // sources, evaluated in precedence order (highest first):
  //
  //   1. CONVERGE_TASK_WAVE env var (caller-supplied, e.g. test harness,
  //      CI replay, manual override) — explicit external control.
  //   2. task frontmatter `vars.wave` (per-task baseline pin) — declared
  //      in TASK.md to start a task at a known wave (useful when the
  //      converge auto-bump hasn't yet ticked).
  //   3. tasks.jsonl `metadata.wave` (auto, framework-managed) — bumped
  //      on each `converge:` "continue" verdict (see task-run.ts).
  //   4. 0 — default, first execution before any continue has fired.
  //
  // The body and converge prompt always read $CONVERGE_TASK_WAVE; the
  // precedence chain is the framework's responsibility to resolve.
  let resolvedWave = 0;
  let waveSource: "env" | "vars" | "ledger" | "default" = "default";

  // Source 1: explicit env (highest precedence — caller wants this exactly)
  //
  // Important: we CANNOT trust the env we set ourselves on a previous
  // task's invocation in the same process. The framework runs many
  // tasks in one Node process; without a snapshot guard, the wave from
  // task-A's execution would leak into task-B (or into a later iteration
  // of task-A itself, defeating the bump). The runtime explicitly opts
  // into env-source by setting `CONVERGE_TASK_WAVE_EXTERNAL=1` first;
  // otherwise we ignore process.env.CONVERGE_TASK_WAVE here and let the
  // ledger / vars / default chain decide.
  const externalEnv = process.env.CONVERGE_TASK_WAVE_EXTERNAL === "1";
  if (externalEnv) {
    const envWaveRaw = process.env.CONVERGE_TASK_WAVE;
    if (envWaveRaw !== undefined && envWaveRaw !== "") {
      const envWave = Number(envWaveRaw);
      if (Number.isFinite(envWave)) {
        resolvedWave = envWave;
        waveSource = "env";
      }
    }
  }

  // Source 2: vars.wave from frontmatter (if env not set)
  if (waveSource === "default") {
    try {
      if (existsSync(ctx.filePath)) {
        const parsed = await parseTaskMd(ctx.filePath);
        const taskVars = parsed?.def?.vars;
        if (taskVars && typeof taskVars === "object" && "wave" in taskVars) {
          const varsWave = Number(
            (taskVars as Record<string, unknown>).wave as number | string,
          );
          if (Number.isFinite(varsWave)) {
            resolvedWave = varsWave;
            waveSource = "vars";
          }
        }
      }
    } catch {
      // Non-fatal: vars.wave unreadable → fall through to ledger.
    }
  }

  // Source 3: framework-managed metadata.wave from the ledger
  if (waveSource === "default") {
    try {
      const playbookName = process.env.CONVERGE_PLAYBOOK;
      if (playbookName) {
        const { readRuntimeLedgerState } = await import(
          "../task/goal/runtime-ledger.ts"
        );
        const ledger = readRuntimeLedgerState(ctx.projectDir, playbookName);
        const row = ledger.tasks.find((t) => t.id === ctx.journalTaskId);
        if (row?.metadata?.wave !== undefined) {
          const ledgerWave = Number(
            row.metadata.wave as number | string,
          );
          if (Number.isFinite(ledgerWave)) {
            resolvedWave = ledgerWave;
            waveSource = "ledger";
          }
        }
      }
    } catch {
      // Non-fatal: ledger unreadable → default wave=0.
    }
  }

  process.env.CONVERGE_TASK_WAVE = String(resolvedWave);
  process.env.CONVERGE_TASK_WAVE_SOURCE = waveSource;

  // Human review is enforced post-execution by the gates in
  // `verify.ts` (task) and `run-gateway.ts` (gateway), not before the
  // body runs — the first attempt must produce artifacts for the human
  // to review.

  // Inject the task's frontmatter `vars:` as CONVERGE_VAR_<KEY>=<value>
  // env vars so the task body can read context without re-parsing
  // TASK.md. This is the bridge that makes `--var key=value` on
  // `converge spawn task` flow through into the spawned task's shell
  // body: build → spawn task --var nnn=001 → spawned TASK.md has
  // `vars: { nnn: "001" }` → framework here exports
  // `CONVERGE_VAR_NNN=001` → body reads `${CONVERGE_VAR_NNN}`.
  //
  // For spawned template tasks, ctx.taskDef.vars already has params
  // merged in (via syncLedgerToDag). For static tasks, fall back to
  // parsing the file directly.
  //
  // Cleared first to avoid leaking vars from a previous task in the
  // same run loop.
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("CONVERGE_VAR_")) delete process.env[k];
  }
  // Priority: preloadedUnit.vars (merged with params from syncLedgerToDag)
  // > ctx.taskDef.vars > file-parsed vars.
  const effectiveVars =
    preloadedUnit?.vars ??
    ctx.taskDef?.vars;
  if (effectiveVars && typeof effectiveVars === "object") {
    for (const [key, value] of Object.entries(effectiveVars)) {
      if (value === undefined || value === null) continue;
      const envKey = `CONVERGE_VAR_${key.toUpperCase()}`;
      process.env[envKey] = String(value);
    }
  } else if (existsSync(ctx.filePath)) {
    try {
      const parsed = await parseTaskMd(ctx.filePath);
      const taskVars = parsed?.def?.vars;
      if (taskVars && typeof taskVars === "object") {
        for (const [key, value] of Object.entries(taskVars)) {
          if (value === undefined || value === null) continue;
          const envKey = `CONVERGE_VAR_${key.toUpperCase()}`;
          process.env[envKey] = String(value);
        }
      }
    } catch {
      // Non-fatal: if vars can't be parsed, the body just won't see them.
    }
  }

  const taskEnv = buildTaskEnv(process.env, {
    currentTaskPath: `.converge/journal/${
      process.env.CONVERGE_PLAYBOOK ?? "default"
    }/tasks/${ctx.journalTaskId}`,
    workerId: process.env.CONVERGE_WORKER_ID,
    taskDir: process.env.CONVERGE_TASK_DIR,
    taskWave: String(resolvedWave),
    taskWaveSource: waveSource,
    attemptDir,
    attempt: attemptPadded,
    vars: effectiveVars && typeof effectiveVars === "object" ? effectiveVars : undefined,
  });

  // ── 1.4. Collect Facts (BEFORE context snapshot) ──────────────────
  // Collect task-specific facts before creating context files
  let factsApiFn: FactsApiFn | undefined;
  let parsedDef:
    | {
        description?: string;
        inputs?: string[];
        outputs?: string[];
        checks?: any[];
        review?: {
          artifact: string;
          format?: "md" | "html";
          prompt?: string;
          skill?: string;
        };
        handoff?: {
          artifact: string;
          format?: "md" | "html";
          generate?: string;
          skill?: string;
        };
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
        handoff: parsed.def.handoff,
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
          handoff: parsed.def.handoff,
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
    const rawInputs = ctx.taskDef?.inputs ?? parsedDef?.inputs;
    const rawOutputs = ctx.taskDef?.outputs ?? parsedDef?.outputs;
    const checks = ctx.taskDef?.checks ?? parsedDef?.checks;
    const body = ctx.body ?? taskBody;

    // Resolve {{placeholder}} patterns in inputs/outputs using effectiveVars
    // before input validation runs. This prevents UnblockStrategy from trying
    // to auto-fix template placeholders as if they were literal file paths.
    const resolveTemplateVars = (arr: string[] | undefined): string[] | undefined => {
      if (!arr || !effectiveVars) return arr;
      return arr.map((str) =>
        str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
          const val = effectiveVars[key];
          return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
        })
      );
    };

    const inputs = resolveTemplateVars(rawInputs);
    const outputs = resolveTemplateVars(rawOutputs);

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
      handoff: (ctx.taskDef as any)?.handoff ?? parsedDef?.handoff,
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
        syncSpawnedToDag: execOptions?.syncSpawnedToDag,
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
            clearTaskEnv();
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
              const producerCkpt = new UnitStateManager(
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
                    executionLogger,
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
          clearTaskEnv();
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
        clearTaskEnv();
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
        clearTaskEnv();

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
    clearTaskEnv();
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
  let executionBridge: ExecutionEventBridge | null = null;
  if (executionLogger) {
    executionBridge = new ExecutionEventBridge(executionLogger);
    // Start monitoring task events immediately (will read events as they're written)
    await executionBridge.monitorTaskEvents(ctx.journalTaskId, eventsFile);
  }

  // ── 3. Mark Ancestors Running ──────────────────────────────────────
  // If we have a preloaded unit with context, use context-based propagation
  if (preloadedUnit?.context) {
    await markAncestorsRunning(preloadedUnit);
  } else {
    await markAncestorsRunning(ctx.projectDir, ctx.epicId, ctx.journalTaskId);
  }

  // ── 4. Initialize Universal Unit Checkpoint ────────────────────────
  // Use UnitStateManager for consistent checkpoint management
  const unitCkpt = new UnitStateManager(
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

  // Also update legacy TaskUnitStateManager for backward compatibility
  const taskCkpt = new TaskUnitStateManager(
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

    // Only spawners take the one-shot WBS shortcut here. Convergers need to
    // re-enter the normal loop so their body can run across waves.
    isWbsTask = unit.mode === "spawner";
    isBlocking = !!unit.config.blocking;

    // Spawned children run as AI agents regardless of what their template declared.
    // Clear passthrough so they go through unit.run() → AI convergence loop.
    unit.passthrough = undefined;

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
    if (executionLogger) {
      (global as any).__CONVERGE_EXECUTION_LOGGER__ = executionLogger;
    }

    // Mark running in execution-scoped results
    await ctx.runResults?.markRunning(ctx.journalTaskId);

    // Spawners take the direct one-shot path. Convergers and normal tasks
    // stay in the regular loop so their body can be re-driven across waves.
    const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";
    if (isWbsTask) {
      const { executeSpawner } = await import("./spawner-executor.ts");
      const result = await executeSpawner(unit, ctx.projectDir, playbookName, eventWriter);
      success = result.success;
      if (!result.success) {
        console.error(`   ❌ Spawner failed: ${result.reason}`);
      } else {
        console.log(`   ✅ Spawner: ${result.childCount} child(ren) spawned`);
      }
    } else if (unit.passthrough) {
      // Passthrough tasks run their body directly without the convergence
      // loop and without spawner child-validation.
      success = await runPassthroughTask(unit, ctx.projectDir, taskEnv);
      if (!success) {
        console.error(`   ❌ Passthrough body execution failed for "${unit.id}"`);
      }
    } else {
      success = await unit.run();
    }
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
    delete (global as any).__CONVERGE_EXECUTION_LOGGER__;

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
    if (executionBridge) {
      executionBridge.stop();
    }

    // Always clear so subsequent journal reads are not attempt-scoped
    clearTaskEnv();
  }

  // ── 6. Update Checkpoints ──────────────────────────────────────────
  const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";

  // RFC 0039 human-review gate: if this task declares `review:` or
  // `handoff:`, hold it in `awaiting-review` instead of marking done
  // until a human verdict is recorded. For task `handoff:` tasks the
  // artifact's existence is enforced upstream by `findGaps` (it is folded
  // into the output-existence check), so by the time `success` is true the
  // artifact is guaranteed present — this gate only decides the verdict.
  const reviewBlock = (ctx.taskDef as any)?.review ?? parsedDef?.review;
  const handoffBlock = (ctx.taskDef as any)?.handoff ?? parsedDef?.handoff;
  if (success && (reviewBlock || handoffBlock)) {
    const { evaluateReviewGate } = await import("../task/review.ts");
    const gate = await evaluateReviewGate(
      ctx.projectDir,
      playbookName,
      ctx.journalTaskId,
    );
    if (gate.status !== "approved") {
      if (gate.status === "revise") {
        console.log(`\n⏸  awaiting-revision · ${gate.feedback}`);
      } else if (gate.status === "reject") {
        console.log(`\n⛔  review-rejected · ${gate.feedback}`);
      } else {
        console.log(`\n⏸  awaiting-review · task output produced, holding for human verdict`);
      }
      mirrorTaskStatus("awaiting-review");
      clearTaskEnv();
      return {
        success: false,
        attemptNumber,
        isWbsTask,
        durationMs,
        isBlocking: false,
        blocked: true,
      } as any;
    }
  }

  if (success) {
    await ctx.runResults?.markComplete(ctx.journalTaskId, durationMs);

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
    if (executionLogger) {
      await enhanceExecutionLogsFromAttempt(
        wipDir,
        ctx.journalTaskId,
        executionLogger,
      );
    }

    // Update universal unit checkpoint
    await unitCkpt.completeAttempt(attemptNumber, "success", attemptStartedAt);

    // Update legacy task checkpoint for backward compatibility
    await taskCkpt.completeAttempt(attemptNumber, "success", attemptStartedAt);

    if (isWbsTask) {
      // Spawner / converger parent: mark as seeded (locked but not
      // complete). The parent converges once all children finish; the
      // post-task `convergeSpawnerParents` sweep transitions it then.
      await unitCkpt.markSeeded();
      await checkpointMgr.markTaskSeeded(ctx.journalTaskId);
      mirrorTaskStatus("blocked");
      console.log(`\n✅ Spawned — waiting for children`);
    } else {
      // Regular task: mark as complete
      await unitCkpt.markComplete();
      await checkpointMgr.markTaskCompleted(ctx.journalTaskId, ctx.epicId);
      mirrorTaskStatus("done");
      console.log(`\n✅ Task complete`);
    }
  } else {
    // Enhanced logging for debugging false failures
    console.error(`\n❌ Task did not converge`);
    console.error(`   Task ID: ${ctx.journalTaskId}`);
    console.error(`   Unit.run() returned: ${success}`);
    console.error(`   isWbsTask: ${isWbsTask}, isBlocking: ${isBlocking}`);
    console.error(`   Duration: ${durationMs}ms, Attempt: ${attemptNumber}`);

    await ctx.runResults?.markFailed(ctx.journalTaskId, 'Task did not converge', durationMs);

    await writeResultSnapshot(
      wipDir,
      ctx.projectDir,
      "failed",
      durationMs,
      attemptNumber,
    );

    // Enhance session logs with detailed tool calls from agentfn index.jsonl
    if (executionLogger) {
      await enhanceExecutionLogsFromAttempt(
        wipDir,
        ctx.journalTaskId,
        executionLogger,
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

    try {
      // Update universal unit checkpoint
      await unitCkpt.completeAttempt(attemptNumber, "failed", attemptStartedAt);
      await unitCkpt.markFailed();

      // Update legacy checkpoints
      await taskCkpt.completeAttempt(attemptNumber, "failed", attemptStartedAt);
      await checkpointMgr.markTaskFailed(ctx.journalTaskId);
      mirrorTaskStatus("dropped");

      // Verify the update was persisted (V2 uses per-task checkpoint files, not failedTasks array)
      const isFailed = await checkpointMgr.isTaskFailed(
        ctx.journalTaskId,
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
          const siblingUnitCkpt = new UnitStateManager(
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
          await checkpointMgr.removeFromCompleted(siblingId);
          resetSiblings.push(siblingId);
          console.log(`   ↩️  on-fail reset: "${siblingId}" → pending`);
        } catch (err: any) {
          console.warn(`   ⚠️  on-fail reset failed for "${siblingId}": ${err.message}`);
        }
      }
    }
  }

  // ── 6.6. Buggy-check relaxer — runs after every attempt ─────────────
  // Moved outside the success/failure branch so BUGGY_CHECK.md proposals
  // are always processed. unit.run() returns true (agent didn't crash)
  // even when checks fail, so the relaxer was previously skipped.
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
    if (executionLogger) {
      const executionDir = executionLogger.getExecutionDir();
      for (const filename of ["execution.log", "events.jsonl"]) {
        const filePath = path.join(executionDir, filename);
        if (existsSync(filePath)) {
          const content = await readFile(filePath, "utf-8");
          const updated = content.replaceAll(wipAbs, archiveAbs);
          if (updated !== content) await writeFile(filePath, updated, "utf-8");
        }
      }
    }
  }

  // ── Queue convergence check ──
  // If this is a queue task and it hasn't converged, keep it pending
  // so the DAG will re-execute it in the next iteration.
  let queueNotConverged = false;
  {
    const qCtx = (ctx as any)._queueContext;
    if (qCtx?.isQueue && success) {
      const { checkQueueConvergence } = await import("../task/incremental.ts");
      const converged = checkQueueConvergence(
        qCtx.convergeCheck,
        qCtx.stateFilePath,
      );
      if (!converged) {
        queueNotConverged = true;
      }
    }
  }

  // Converger wave-loop continuation is owned by the runner's run-converger
  // action handler (writes `wave.counter` under $CONVERGE_TASK_DIR). The
  // legacy keepLooping flag is gone with the seed system.
  let taskResult: TaskExecutionResult = {
    success: success && !queueNotConverged,
    attemptNumber,
    isWbsTask,
    durationMs,
    isBlocking,
    resetSiblings,
    _queueNotConverged: queueNotConverged || undefined,
  };

  // RFC 0014: intercept:task-execute — let plugins transform the result
  if (execOptions?.interceptorRegistry?.has("intercept:task-execute")) {
    taskResult = await execOptions.interceptorRegistry.intercept(
      "intercept:task-execute",
      taskResult,
      async (r) => r,
    );
  }

  return taskResult;
}
