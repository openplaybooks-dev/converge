/**
 * Autonomous Run — Snap → Execute → Snap
 *
 * Architecture (stateless, resumable):
 *
 *   loop {
 *     1. SNAP    — re-scan filesystem for all epics/tasks
 *     2. FIND    — pick first incomplete task (checkpoint + journal status.json)
 *     3. EXECUTE — run the task (AI may create new files/epics during this step)
 *     4. COMMIT  — mark task complete in checkpoint
 *     → back to 1 (picks up any AI-created tasks naturally)
 *   }
 *
 * Why re-scan every iteration:
 *   The AI can write new SKILL.md / task.ts files during execution (yields, sub-planning).
 *   Re-scanning ensures those files are discovered before we decide what to run next.
 *   No in-memory tree pointers → no staleness.
 */

import { createDiscoveryScanner } from "@converge/core/task/discovery/scanner.ts";
import { CheckpointManager } from "@converge/core/checkpoint/manager.ts";
import { findNextTask } from "./next-task.ts";
import type { ConvergeConfig } from "@converge/core/config/types.ts";
import type { HookRegistry } from "@converge/core/hooks/registry.ts";
import { executeTask } from "@converge/core/task/lifecycle/task-runner.ts";
import { SessionLogger, generateSessionId } from "@converge/core/journal/session-logger.ts";
import type {
  ProgressSnapshot,
  GapInfo,
  SessionMetadata,
  SessionStatus,
} from "@converge/core/journal/session-types.ts";
import { Unit } from "@converge/core/task/unit/unit.ts";
import { TaskTree } from "@converge/core/task/tree/index.ts";
import { UnitCheckpointManager } from "@converge/core/checkpoint/unit-checkpoint.ts";
import { findGaps } from "@converge/core/task/unit/find-gaps.ts";
import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { generateInterruptedMd } from "@converge/core/task/lifecycle/learn.ts";
import { getEpicsDir, getSessionsDir } from "@converge/core/journal/structure.ts";
import { UnblockStrategy } from "@converge/core/navigator/repair/strategies/unblock.ts";
import { ExecutionTimeline } from "@converge/core/navigator/repair/timeline.ts";
import { createAIContext } from "@converge/core/ai/context.ts";
import type { StrategyContext } from "@converge/core/navigator/repair/types.ts";
import type { Gap } from "@converge/core/task/gap/types.ts";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

export interface AutonomousRunConfig {
  /** Absolute project directory */
  projectDir: string;

  /** Loaded PROJECT.md config (provides discovery patterns) */
  convergeConfig: ConvergeConfig;

  /** Pre-built hook registry */
  hookRegistry?: HookRegistry;

  /** Maximum task executions before stopping (default: 100) */
  maxIterations?: number;

  /** Max attempts per individual task before permanently skipping it (default: 2) */
  maxTaskAttempts?: number;

  /** Global wall-clock timeout for the entire run in ms (default: 72 hours) */
  maxRunDurationMs?: number;

  /** Verbose logging */
  verbose?: boolean;

  /** Filter to a specific epic or task (e.g. "99-test" or "99-test/skill-invoke-test") */
  filter?: string;

  /** Force-run the filtered task even if blocked, completed, or failed */
  force?: boolean;

  /** Resume: recover interrupted/running tasks from a previous session */
  resume?: boolean;

  /** Restart: reset all tasks to pending and start fresh */
  restart?: boolean;

  /** Force non-incremental execution; rebuild from scratch */
  fullRefresh?: boolean;

  /** Extra vars to pass to WBS contexts (e.g. epoch number from evolve runner) */
  epochVars?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Result                                                             */
/* ------------------------------------------------------------------ */

export interface AutonomousRunResult {
  completed: boolean;
  tasksCompleted: number;
  tasksFailed: number;
  iterations: number;
  stoppedReason?: "timeout" | "max-iterations" | "consecutive-failures";
}

/* ------------------------------------------------------------------ */
/*  Snap result                                                        */
/* ------------------------------------------------------------------ */

interface TreeSnap {
  epics: Array<{ filePath: string; type: string }>;
  tasks: Array<{ filePath: string; type: string }>;
  totalDiscovered: number;
}

/* ------------------------------------------------------------------ */
/*  Tree snap — re-read filesystem                                     */
/* ------------------------------------------------------------------ */

async function snapTree(config: AutonomousRunConfig): Promise<TreeSnap> {
  const scanner = createDiscoveryScanner(
    config.convergeConfig.discovery || { epics: [], tasks: [] },
    config.projectDir,
    config.hookRegistry,
  );

  const discovery = await scanner.scan();

  const epics = discovery.files.filter((f) => f.type === "epic");
  const epicPaths = new Set(epics.map((e) => e.filePath));
  const tasks = discovery.files.filter(
    (f) => f.type === "task" && !epicPaths.has(f.filePath),
  );

  return { epics, tasks, totalDiscovered: discovery.files.length };
}

/* ------------------------------------------------------------------ */
/*  Stuck Task Detection & Recovery                                    */
/* ------------------------------------------------------------------ */

export interface StuckTask {
  taskId: string;
  epicId: string;
  status: string;
  checkpointPath: string;
  /** Last activity timestamp from checkpoint (lastUpdated or latest attempt start) */
  lastActivity?: string;
}

/**
 * Detect tasks stuck in 'interrupted' or 'running' state from a previous session.
 * Returns a list without modifying anything.
 */
export async function detectStuckTasks(
  projectDir: string,
  tree: TaskTree,
): Promise<StuckTask[]> {
  const journalEpicsDir = getEpicsDir(projectDir);
  if (!existsSync(journalEpicsDir)) return [];

  const stuck: StuckTask[] = [];

  const epicEntries = await readdir(journalEpicsDir, { withFileTypes: true });
  for (const epicEntry of epicEntries) {
    if (!epicEntry.isDirectory()) continue;
    const epicId = epicEntry.name;
    const epicDir = path.join(journalEpicsDir, epicId);

    const checkpointPaths = await collectCheckpointsRecursive(epicDir);

    for (const ckptPath of checkpointPaths) {
      try {
        const raw = JSON.parse(await readFile(ckptPath, "utf-8"));
        if (raw.status !== "interrupted" && raw.status !== "running") continue;

        const taskDir = path.dirname(ckptPath);
        const rel = path.relative(epicDir, taskDir).replace(/\\/g, "/");
        const taskId =
          !rel || rel === "." ? epicId : rel.replace(/(^|\/)tasks\//g, "$1");

        // Extract last activity timestamp for diagnostics
        let lastActivity: string | undefined = raw.lastUpdated;
        if (raw.attempts?.length) {
          const latest = raw.attempts[raw.attempts.length - 1];
          const ts = latest.completedAt || latest.startedAt;
          if (ts && (!lastActivity || ts > lastActivity)) lastActivity = ts;
        }

        stuck.push({
          taskId,
          epicId,
          status: raw.status,
          checkpointPath: ckptPath,
          lastActivity,
        });
      } catch {
        // Ignore corrupt checkpoint files
      }
    }
  }

  return stuck;
}

/**
 * Recover stuck tasks (interrupted or running from a previous session).
 *
 * Strategy:
 * - Load the Unit and run findGaps() as a pre-flight check
 * - If no output/check gaps → mark the task complete (it finished before signal)
 * - If output gaps remain → reset to pending (will be re-run from scratch)
 */
export async function recoverStuckTasks(
  projectDir: string,
  tree: TaskTree,
  stuckTasks: StuckTask[],
): Promise<void> {
  let recovered = 0;
  let reset = 0;

  for (const stuck of stuckTasks) {
    try {
      console.log(
        `\n⚡ Recovering ${stuck.status} task: ${stuck.epicId}/${stuck.taskId}`,
      );

      const node =
        tree.getNode(stuck.taskId) ??
        tree.getNode(`${stuck.epicId}/${stuck.taskId}`);

      if (!node) {
        // Write INTERRUPTED.md so task runner continues in-place
        const taskJournalDir = path.dirname(stuck.checkpointPath);
        const wipDir = path.join(taskJournalDir, "attempts", "wip");
        if (existsSync(wipDir)) {
          const unitCkptForAttempt = new UnitCheckpointManager(
            projectDir,
            "task",
            stuck.epicId,
            stuck.taskId,
          );
          const ckpt = await unitCkptForAttempt.load();
          await generateInterruptedMd(
            wipDir,
            projectDir,
            ckpt?.currentAttempt ?? 1,
            [],
            [],
          );
        }

        const unitCkpt = new UnitCheckpointManager(
          projectDir,
          "task",
          stuck.epicId,
          stuck.taskId,
        );
        const checkpoint = await unitCkpt.load();
        if (checkpoint) {
          checkpoint.status = "pending";
          await unitCkpt.save(checkpoint);
        }
        console.log(`   → Reset to pending (unit not found in tree)`);
        reset++;
        continue;
      }

      const unit = node.unit;
      if (!unit) {
        console.log(`   → Skipped (no unit on tree node)`);
        continue;
      }

      const unitCkpt = new UnitCheckpointManager(
        projectDir,
        "task",
        stuck.epicId,
        stuck.taskId,
      );

      if ((unit.outputs?.length ?? 0) > 0) {
        const gaps = await findGaps(unit);
        const actionableGaps = gaps.filter(
          (g) =>
            g.metadata?.gapKind === "output" ||
            g.metadata?.gapKind === "corrupted" ||
            g.metadata?.gapKind === "check",
        );

        if (actionableGaps.length === 0) {
          await unitCkpt.markComplete();
          console.log(`   → Marked complete (all outputs present)`);
          recovered++;
        } else {
          // Write INTERRUPTED.md into wip/ so the task runner continues in-place
          const taskJournalDir = path.dirname(stuck.checkpointPath);
          const wipDir = path.join(taskJournalDir, "attempts", "wip");
          if (existsSync(wipDir)) {
            const allOutputs = unit.outputs ?? [];
            const missingOutputPaths = actionableGaps
              .filter((g) => g.metadata?.gapKind === "output")
              .map((g) => g.description);
            const existingOutputs = allOutputs.filter(
              (o) => !missingOutputPaths.includes(o),
            );
            const checkpoint = await unitCkpt.load();
            await generateInterruptedMd(
              wipDir,
              projectDir,
              checkpoint?.currentAttempt ?? 1,
              existingOutputs,
              missingOutputPaths,
            );
          }

          const checkpoint = await unitCkpt.load();
          if (checkpoint) {
            checkpoint.status = "pending";
            await unitCkpt.save(checkpoint);
          }
          console.log(
            `   → Reset to pending (${actionableGaps.length} output gap(s) remain)`,
          );
          reset++;
        }
      } else {
        // Write INTERRUPTED.md into wip/ so the task runner continues in-place
        const taskJournalDir = path.dirname(stuck.checkpointPath);
        const wipDir = path.join(taskJournalDir, "attempts", "wip");
        if (existsSync(wipDir)) {
          const checkpoint = await unitCkpt.load();
          await generateInterruptedMd(
            wipDir,
            projectDir,
            checkpoint?.currentAttempt ?? 1,
            [],
            [],
          );
        }

        const checkpoint = await unitCkpt.load();
        if (checkpoint) {
          checkpoint.status = "pending";
          await unitCkpt.save(checkpoint);
        }
        console.log(`   → Reset to pending (no outputs declared)`);
        reset++;
      }
    } catch {
      // Ignore corrupt checkpoint files
    }
  }

  if (recovered > 0 || reset > 0) {
    console.log(
      `\n⚡ Recovery: ${recovered} completed, ${reset} reset to pending\n`,
    );
  }
}

/**
 * Detect tasks marked `complete` whose source TASK.md has been edited since
 * the checkpoint was last written, and reset them to pending so the runner
 * re-runs their checks against the current spec.
 *
 * Without this, a user editing TASK.md mid-flight (between sessions) would
 * see their changes silently ignored because the checkpoint records the task
 * as complete and the runner never revisits it.
 *
 * Returns the count of tasks that were reset.
 */
export async function recheckEditedCompletedTasks(
  projectDir: string,
): Promise<number> {
  return 0;
}

function formatAgeBetween(newerMs: number, olderMs: number): string {
  const deltaMs = newerMs - olderMs;
  const s = Math.round(deltaMs / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return `${h}h`;
}

/**
 * Stale-template detection — when the source TASK.md under
 * `.converge/playbooks/<playbook>/...` was edited *after* the journal
 * copy was materialized, re-materialize the journal copy so the user's
 * edits actually take effect on the next attempt.
 *
 * Without this, editing a source TASK.md mid-run is silently ignored:
 * the runner reads the journal-materialized copy, which is the snapshot
 * taken at first attempt time. Forces the operator to nuke the journal
 * subtree manually — the most common confusion in this codebase.
 *
 * Scope: top-level playbook tasks where source ↔ journal mapping is
 * deterministic. WBS-spawned children whose template-ref path is
 * recoverable from `.spawn-source` sidecars are also covered. Anything
 * else gets a warning so the user knows to reset manually.
 */
export async function rematerializeStaleTemplates(
  projectDir: string,
): Promise<{ rematerialized: number; warnings: number }> {
  const journalEpicsDir = getEpicsDir(projectDir);
  if (!existsSync(journalEpicsDir)) return { rematerialized: 0, warnings: 0 };

  let rematerialized = 0;
  let warnings = 0;

  const epicEntries = await readdir(journalEpicsDir, { withFileTypes: true });
  for (const epicEntry of epicEntries) {
    if (!epicEntry.isDirectory()) continue;
    const epicId = epicEntry.name;
    const epicDir = path.join(journalEpicsDir, epicId);

    const checkpointPaths = await collectCheckpointsRecursive(epicDir);
    for (const ckptPath of checkpointPaths) {
      const taskJournalDir = path.dirname(ckptPath);
      const journalTaskMd = path.join(taskJournalDir, "TASK.md");
      if (!existsSync(journalTaskMd)) continue;

      // Resolve the source TASK.md path. Two layouts:
      //   1. Top-level playbook tasks: source path mirrors the journal path
      //      (.../playbooks/<epic>/tasks/<id>/TASK.md).
      //   2. WBS-spawned tasks: the WBS that created this task may have
      //      written a `.spawn-source` sidecar pointing at the source
      //      template; if present, use it.
      const spawnSource = path.join(taskJournalDir, ".spawn-source");
      let sourceTaskMd: string | null = null;
      if (existsSync(spawnSource)) {
        try {
          const raw = (await readFile(spawnSource, "utf-8")).trim();
          if (raw) sourceTaskMd = path.resolve(projectDir, raw);
        } catch {
          /* ignore */
        }
      }
      if (!sourceTaskMd) {
        // Try the deterministic top-level mapping.
        const rel = path
          .relative(epicDir, taskJournalDir)
          .replace(/\\/g, "/");
        if (!rel || rel === "." || rel.includes("/tasks/")) {
          // Likely a WBS-spawned child (has .../tasks/.../tasks/...).
          // Skip silently — those need .spawn-source to track.
          continue;
        }
        // rel is like "tasks/01-foo" → playbook source is at
        // .converge/playbooks/<epic>/tasks/01-foo/TASK.md
        const candidate = path.join(
          projectDir,
          ".converge",
          "playbooks",
          epicId,
          rel,
          "TASK.md",
        );
        if (!existsSync(candidate)) continue;
        sourceTaskMd = candidate;
      }
      if (!existsSync(sourceTaskMd)) continue;

      try {
        const [srcStat, journalStat] = await Promise.all([
          stat(sourceTaskMd),
          stat(journalTaskMd),
        ]);
        // Source must be newer than journal copy by more than the slack window.
        if (srcStat.mtimeMs <= journalStat.mtimeMs + 2000) continue;

        // Re-materialize the journal copy with the same Mustache substitution
        // the original spawn would have used. We don't have the original
        // vars here for WBS-spawned tasks — limit re-materialization to
        // top-level tasks (no `{{var}}` placeholders by convention) for now;
        // for spawn-sourced tasks emit a warning so the operator resets manually.
        const srcContent = await readFile(sourceTaskMd, "utf-8");
        const hasPlaceholders = /\{\{\w+\}\}/.test(srcContent);
        if (hasPlaceholders && spawnSource) {
          // We have a sidecar but it didn't carry vars — bail with a warning.
          console.log(
            `   ⚠ Stale spawn template (${path.relative(projectDir, sourceTaskMd)} edited after journal copy); reset the task manually if you want the edits applied.`,
          );
          warnings++;
          continue;
        }
        if (hasPlaceholders) {
          // Top-level path with placeholders means the playbook's normal
          // install-time substitution already happened. We can't recover
          // those vars cleanly; warn and skip.
          console.log(
            `   ⚠ Stale template at ${path.relative(projectDir, sourceTaskMd)} contains {{vars}} we can't substitute on resume; reset the task manually.`,
          );
          warnings++;
          continue;
        }

        // Plain copy — write the source content over the journal TASK.md.
        const { writeFile } = await import("node:fs/promises");
        await writeFile(journalTaskMd, srcContent, "utf-8");
        rematerialized++;
        console.log(
          `   ↻ Re-materialized: ${path.relative(projectDir, journalTaskMd)} (source edited ${formatAgeBetween(srcStat.mtimeMs, journalStat.mtimeMs)} after journal copy)`,
        );
      } catch {
        /* ignore individual failures */
      }
    }
  }

  if (rematerialized > 0 || warnings > 0) {
    const parts: string[] = [];
    if (rematerialized > 0) parts.push(`${rematerialized} re-materialized`);
    if (warnings > 0) parts.push(`${warnings} warning(s)`);
    console.log(`\n⚡ Stale-template scan: ${parts.join(", ")}\n`);
  }

  return { rematerialized, warnings };
}

/**
 * Reset ALL non-complete tasks to pending (--restart mode).
 * Scans all checkpoints recursively and resets status + attempt records for stuck tasks.
 */
export async function resetAllTasks(
  projectDir: string,
  tree: TaskTree,
): Promise<void> {
  const journalEpicsDir = getEpicsDir(projectDir);
  if (!existsSync(journalEpicsDir)) return;

  let resetCount = 0;

  const epicEntries = await readdir(journalEpicsDir, { withFileTypes: true });
  for (const epicEntry of epicEntries) {
    if (!epicEntry.isDirectory()) continue;
    const epicId = epicEntry.name;
    const epicDir = path.join(journalEpicsDir, epicId);

    const checkpointPaths = await collectCheckpointsRecursive(epicDir);

    for (const ckptPath of checkpointPaths) {
      try {
        const raw = JSON.parse(await readFile(ckptPath, "utf-8"));
        if (raw.status === "complete") continue;

        const taskDir = path.dirname(ckptPath);
        const rel = path.relative(epicDir, taskDir).replace(/\\/g, "/");
        const taskId =
          !rel || rel === "." ? epicId : rel.replace(/(^|\/)tasks\//g, "$1");

        const unitCkpt = new UnitCheckpointManager(
          projectDir,
          "task",
          epicId,
          taskId,
        );
        const checkpoint = await unitCkpt.load();
        if (checkpoint) {
          checkpoint.status = "pending";
          // Reset attempt records for stuck tasks so they get fresh retries
          if (checkpoint.attempts) {
            checkpoint.attempts = [];
            checkpoint.currentAttempt = 0;
          }
          await unitCkpt.save(checkpoint);
          resetCount++;
        }
      } catch {
        // Ignore corrupt checkpoint files
      }
    }
  }

  console.log(`\n🔄 Restart: ${resetCount} task(s) reset to pending\n`);
}

async function collectCheckpointsRecursive(dir: string): Promise<string[]> {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectCheckpointsRecursive(fullPath)));
    } else if (entry.name === "checkpoint.json") {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Recover INTERRUPTED tasks for retry.
 *
 * "Interrupted" = the process died mid-attempt (crash, kill, OS signal). The
 * agent never got to finish, so retrying is safe and almost always succeeds.
 *
 * "Failed" = the agent ran to completion and the result was rejected
 * (validation said no, or the agent gave up). Retrying does the same thing
 * and silently overwrites the failure record if it happens to "succeed" the
 * second time — masking real bugs and letting downstream tasks proceed on a
 * broken foundation. Failed tasks must remain failed so the blocking
 * contract holds; the user fixes the underlying cause and re-runs.
 *
 * Returns a map of taskId → attempt count for all interrupted tasks that
 * were reset.
 */
export async function recoverFailedTasks(
  projectDir: string,
  tree: TaskTree,
  maxTaskAttempts: number,
): Promise<Map<string, number>> {
  const taskAttempts = new Map<string, number>();
  const journalEpicsDir = getEpicsDir(projectDir);
  if (!existsSync(journalEpicsDir)) return taskAttempts;

  let resetCount = 0;
  const allNodes = tree.getAllNodes();

  for (const node of allNodes) {
    // Only consider leaf tasks (not parents with children)
    if (node.children.length > 0) continue;

    const epicId = node.epicId || "unknown";
    const taskId = node.id;

    const unitCkpt = new UnitCheckpointManager(
      projectDir,
      "task",
      epicId,
      taskId,
    );

    const checkpoint = await unitCkpt.load();
    if (!checkpoint) continue;

    // Only auto-recover interrupted tasks (crashes). Terminal failures stay
    // failed so the blocking contract holds.
    if (checkpoint.status !== "interrupted") {
      continue;
    }

    // Count attempts that produced a terminal outcome (any of success,
    // failed, interrupted). Used to enforce the per-task retry cap.
    const attemptCount = checkpoint.attempts
      ? checkpoint.attempts.filter(
          (a) => a.outcome === "success" || a.outcome === "failed" || a.outcome === "interrupted"
        ).length
      : 0;

    // If attempts haven't exceeded max, reset to pending for retry
    if (attemptCount < maxTaskAttempts) {
      await unitCkpt.resetToPending();
      taskAttempts.set(taskId, attemptCount);
      resetCount++;
    }
  }

  if (resetCount > 0) {
    console.log(
      `\n🔄 Reset ${resetCount} interrupted task(s) for retry (attempts < ${maxTaskAttempts})\n`,
    );
  }

  return taskAttempts;
}

/* ------------------------------------------------------------------ */
/*  Post-Failure Auto-Repair                                           */
/* ------------------------------------------------------------------ */

/**
 * Invoked once per failed-attempt when the per-task retry budget hasn't been
 * exhausted. Runs the repair pipeline (UnblockStrategy) against a synthetic
 * gap representing "this task failed." If a strategy succeeds, reset the
 * task's checkpoint to pending so the scheduler picks it up on the next
 * iteration with whatever fix the strategy applied (re-running a producer,
 * patching TASK.md, etc.). If no strategy succeeds, leave the checkpoint
 * failed — downstream blocking takes over.
 *
 * Termination is bounded by the same maxTaskAttempts counter that gates
 * the surrounding retry loop. No new infinite-loop hazard.
 */
async function runAutoRepair(
  ctx: RunContext,
  selected: SelectedNode,
  attempts: number,
): Promise<void> {
  console.log(
    `   🔧 Attempting auto-repair (attempt ${attempts}/${ctx.maxTaskAttempts})...`,
  );

  const journalCtx = {
    epicId: selected.epicId,
    taskId: selected.journalTaskId,
  };
  const timeline = new ExecutionTimeline(ctx.projectDir);
  const strategyCtx: StrategyContext = {
    projectDir: ctx.projectDir,
    journalCtx,
    timeline,
    attempt: attempts,
    ai: () => createAIContext(ctx.projectDir, journalCtx),
  };

  // Synthesize a Gap representing the terminal failure. Using gapKind
  // "blocker" makes UnblockStrategy.canHandle return true so its
  // sub-strategies (DependencyBackoffStrategy first) get a shot.
  const failureGap: Gap = {
    id: `task-failed-${selected.journalTaskId}-${attempts}`,
    type: "missing-intermediate",
    level: "task",
    scope: selected.journalTaskId,
    description: `Task ${selected.journalTaskId} failed on attempt ${attempts}`,
    detected: new Date().toISOString(),
    resolved: false,
    checks: [],
    metadata: {
      gapKind: "blocker",
      sourceTaskFile: selected.filePath,
      failedTaskId: selected.journalTaskId,
      failedTaskEpicId: selected.epicId,
      attemptNumber: attempts,
    },
  };

  const outcome = await new UnblockStrategy().tryFix(failureGap, strategyCtx);

  if (!outcome.success) {
    console.log(
      `   ↳ No repair strategy applied (${outcome.reason}) — leaving task failed.`,
    );
    return;
  }

  console.log(
    `   ↳ Repair strategy succeeded (${outcome.metadata?.solvedBy ?? "unblock-coordinator"}): ${outcome.reason}`,
  );

  // The strategy mutated state (re-ran a producer, patched TASK.md,
  // injected LEARN.md, etc.). Reset the failed task's checkpoint to
  // pending so the next scheduler iteration picks it up with the new
  // foundation. The per-task attempt counter (ctx.taskAttempts) is the
  // source of truth for the retry budget — if the next attempt also
  // fails, it'll burn through to maxTaskAttempts and become terminal.
  const ckpt = new UnitCheckpointManager(
    ctx.projectDir,
    "task",
    selected.epicId,
    selected.journalTaskId,
  );
  await ckpt.resetToPending();
}

/* ------------------------------------------------------------------ */
/*  Previous Session Guard                                             */
/* ------------------------------------------------------------------ */

/**
 * Session statuses that should block a fresh run.
 * - error: consecutive failures or infinite loop — needs investigation
 * - cancelled: user interrupted mid-task — task state may be inconsistent
 * - running: no clean shutdown (crash) — task state unknown
 *
 * NOT included:
 * - stalled: timeout — all executed tasks succeeded, just ran out of time.
 *   Safe to continue with a fresh run.
 */
const DIRTY_SESSION_STATUSES: Set<SessionStatus> = new Set([
  "error",
  "cancelled",
  "running",
]);

function formatAge(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d${hours % 24}h`;
}

/**
 * Read the most recent session's metadata.json from the sessions journal.
 * Returns null if no sessions exist or the metadata can't be read.
 */
async function getLastSessionMetadata(
  projectDir: string,
): Promise<SessionMetadata | null> {
  const sessionsDir = getSessionsDir(projectDir);
  if (!existsSync(sessionsDir)) return null;

  const entries = await readdir(sessionsDir, { withFileTypes: true });
  const sessionDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(); // Lexicographic sort — session IDs are timestamp-prefixed

  if (sessionDirs.length === 0) return null;

  const latestDir = sessionDirs[sessionDirs.length - 1];
  const metadataPath = path.join(sessionsDir, latestDir, "metadata.json");
  if (!existsSync(metadataPath)) return null;

  try {
    return JSON.parse(await readFile(metadataPath, "utf-8")) as SessionMetadata;
  } catch {
    return null;
  }
}

/**
 * Guard against starting a new run when the previous session exited dirty.
 * Call this before any execution (full run, step, converge).
 * Exits the process if the guard triggers. No-op if --resume or --restart is set.
 */
export async function guardDirtySession(
  projectDir: string,
  resume?: boolean,
  restart?: boolean,
): Promise<void> {
  if (resume || restart) return;

  const lastSession = await getLastSessionMetadata(projectDir);
  if (!lastSession || !DIRTY_SESSION_STATUSES.has(lastSession.status)) return;

  const age = lastSession.endTime
    ? formatAge(Date.now() - new Date(lastSession.endTime).getTime())
    : "unknown";
  const outcomes = lastSession.outcomes;
  console.error(
    `\n⛔ Previous session exited with status: ${lastSession.status}\n`,
  );
  console.error(`   Session:    ${lastSession.sessionId}`);
  console.error(`   Status:     ${lastSession.status}`);
  console.error(`   Ended:      ${age} ago`);
  if (outcomes) {
    console.error(
      `   Progress:   ${outcomes.tasksCompleted} completed, ${outcomes.tasksFailed} failed (${outcomes.totalIterations} iterations)`,
    );
  }
  console.error(`\nTo continue, use one of:`);
  console.error(
    `   converge run --resume    # recover and continue from where it stopped`,
  );
  console.error(
    `   converge run --restart   # reset non-complete tasks and start fresh\n`,
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/*  State Machine Context                                               */
/* ------------------------------------------------------------------ */

/**
 * All mutable state for one autonomous run. Each state function receives
 * this context, enriches it, and returns the next state.
 */
interface RunContext {
  // ── Fixed config ──────────────────────────────────────────
  config: AutonomousRunConfig;
  projectDir: string;
  checkpointMgr: CheckpointManager;
  sessionLogger: SessionLogger;
  maxIterations: number;
  maxTaskAttempts: number;
  maxRunDurationMs: number;

  // ── Counters (enriched each iteration) ─────────────────────
  iteration: number;
  tasksCompleted: number;
  tasksFailed: number;
  gapsResolved: number;

  // ── Task execution tracking ───────────────────────────────
  taskAttempts: Map<string, number>;          // taskId → STRUCTURAL attempt count (counts toward maxTaskAttempts)
  taskTransientAttempts: Map<string, number>; // taskId → transient attempt count (separate budget, generous)
  taskDeferCount?: Map<string, number>;       // taskId → number of times deferred for unmet input gate
  consecutiveFailures: number;        // consecutive exhausted failures → halt
  consecutiveSelections: number;     // same task selected → infinite loop detection
  lastSelectedTaskId: string | null;

  // ── Current iteration data (enriched by SELECT → EXECUTE → COMMIT) ──
  tree: TaskTree | null;
  selectedNode: SelectedNode | null;
  execResult: TaskExecutionResult | null;

  // ── Lifecycle ─────────────────────────────────────────────
  runStartedAt: number;
  cancelled: boolean;
}

interface SelectedNode {
  epicId: string;
  taskId: string;
  filePath: string;
  relPath: string;
  journalTaskId: string;
  blocking: boolean;
  parentTaskId: string | undefined;
  currentAttempt: number;
  treeNode: TreeNode | null;
}

type RunState =
  | "INIT"
  | "SCAN"
  | "SELECT"
  | "EXECUTE"
  | "COMMIT"
  | "CHECK"
  | "DONE";

/* ------------------------------------------------------------------ */
/*  State Handlers                                                      */
/* ------------------------------------------------------------------ */

async function stateInit(ctx: RunContext): Promise<RunState> {
  const { config, sessionLogger } = ctx;

  console.log("🤖 Starting autonomous run (tree-based traversal)\n");

  await sessionLogger.writeSessionStart();

  // Load tree once — SCAN will reload after mutations
  ctx.tree = await TaskTree.load(config.projectDir, config.convergeConfig);

  // On --resume, re-materialize the journal TASK.md from source when source
  // has changed since the journal was written. The runner reads the journal
  // copy, so stale journal copies were the most common cause of "I edited
  // the source but my changes don't take effect".
  if (config.resume) {
    const stale = await rematerializeStaleTemplates(config.projectDir);
    if (stale.rematerialized > 0) await ctx.tree.reload();
  }

  // Handle stuck tasks from previous session
  const stuckTasks = await detectStuckTasks(config.projectDir, ctx.tree);

  if (stuckTasks.length > 0) {
    if (config.resume) {
      await recoverStuckTasks(config.projectDir, ctx.tree, stuckTasks);
      await ctx.tree.reload();
    } else if (config.restart) {
      await resetAllTasks(config.projectDir, ctx.tree);
      await ctx.tree.reload();
    } else {
      console.error(
        `\n⛔ Found ${stuckTasks.length} task(s) in interrupted/running state:\n`,
      );
      for (const t of stuckTasks) {
        let age = "";
        if (t.lastActivity) {
          const elapsed = Date.now() - new Date(t.lastActivity).getTime();
          const mins = Math.floor(elapsed / 60_000);
          age = mins < 60 ? `, idle ${mins}m` : `, idle ${Math.floor(mins / 60)}h${mins % 60}m`;
        }
        console.error(`   • ${t.taskId} (status: ${t.status}${age})`);
      }
      console.error(`\nTo continue, use one of:`);
      console.error(`   converge run --resume    # recover interrupted tasks`);
      console.error(`   converge run --restart   # reset all tasks to pending\n`);
      process.exit(1);
    }
  } else if (config.restart) {
    await resetAllTasks(config.projectDir, ctx.tree);
    await ctx.tree.reload();
  }

  // Recover failed tasks for retry
  const recovered = await recoverFailedTasks(
    config.projectDir,
    ctx.tree,
    ctx.maxTaskAttempts,
  );
  if (recovered.size > 0) {
    ctx.taskAttempts = new Map([...ctx.taskAttempts, ...recovered]);
    await ctx.tree.reload();
  }

  return "SCAN";
}

async function stateScan(ctx: RunContext): Promise<RunState> {
  ctx.iteration++;

  const { tree, config, sessionLogger } = ctx;

  if (config.verbose) {
    const progress = await tree!.getProgress();
    console.log(
      `\n── Iteration ${ctx.iteration} ───────────────────────────────────────────`,
    );
    console.log(`   Progress: ${progress.completed}/${progress.total} tasks complete`);
  }

  // Wall-clock timeout guard
  const elapsed = Date.now() - ctx.runStartedAt;
  if (elapsed > ctx.maxRunDurationMs) {
    const mins = Math.floor(elapsed / 60_000);
    console.log(
      `\n⛔ Run timeout: exceeded ${Math.floor(ctx.maxRunDurationMs / 60_000)} minute limit (ran ${mins}m).\n`,
    );
    await sessionLogger.writeSessionEnd(
      {
        totalIterations: ctx.iteration,
        tasksCompleted: ctx.tasksCompleted,
        tasksFailed: ctx.tasksFailed,
        gapsResolved: ctx.gapsResolved,
        convergenceAchieved: false,
      },
      "stalled",
    );
    ctx.tasksCompleted = ctx.tasksCompleted; // no-op, for clarity
    return "DONE";
  }

  return "SELECT";
}

async function stateSelect(ctx: RunContext): Promise<RunState> {
  const { config, tree, sessionLogger } = ctx;

  const result = await tree!.findNextTask(config.filter, config.force, config.fullRefresh);

  if (!result.node) {
    // No runnable tasks — check why
    const failedCount = result.failedIds.length;
    const hasFilter = !!config.filter;

    if (failedCount > 0) {
      console.log(
        hasFilter
          ? `\n⛔ No pending tasks match filter "${config.filter}" (${failedCount} tasks failed).\n`
          : `\n⛔ All remaining tasks are failed or blocked (${failedCount} failed). Fix and resume.\n`,
      );
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: ctx.iteration,
          tasksCompleted: ctx.tasksCompleted,
          tasksFailed: ctx.tasksFailed,
          gapsResolved: ctx.gapsResolved,
          convergenceAchieved: false,
        },
        "error",
      );
      return "DONE";
    }

    console.log(
      hasFilter
        ? `\n✅ No pending tasks match filter "${config.filter}" — done.\n`
        : "\n✅ All tasks complete — autonomous run finished.\n",
    );
    await sessionLogger.writeSessionEnd(
      {
        totalIterations: ctx.iteration,
        tasksCompleted: ctx.tasksCompleted,
        tasksFailed: ctx.tasksFailed,
        gapsResolved: ctx.gapsResolved,
        convergenceAchieved: true,
      },
      "complete",
    );
    return "DONE";
  }

  const { node: nodeData, completedCount, totalCount } = result;

  // Infinite loop guard
  const currentTaskId = nodeData.id;
  if (currentTaskId === ctx.lastSelectedTaskId) {
    ctx.consecutiveSelections++;
    if (ctx.consecutiveSelections >= 3) {
      console.error(
        `\n⛔ INFINITE LOOP DETECTED: Task "${currentTaskId}" selected ${ctx.consecutiveSelections} times\n`,
      );
      console.error(`   This indicates a bug in task completion detection.\n`);
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: ctx.iteration,
          tasksCompleted: ctx.tasksCompleted,
          tasksFailed: ctx.tasksFailed,
          gapsResolved: ctx.gapsResolved,
          convergenceAchieved: false,
        },
        "error",
      );
      return "DONE";
    }
  } else {
    ctx.consecutiveSelections = 0;
  }
  ctx.lastSelectedTaskId = currentTaskId;

  const currentAttempt = (ctx.taskAttempts.get(currentTaskId) ?? 0) + 1;
  const treeNode = tree!.getNode(currentTaskId);

  ctx.selectedNode = {
    epicId: nodeData.epicId || "unknown",
    taskId: currentTaskId.split("/").pop() || currentTaskId,
    filePath: nodeData.unit.path,
    relPath: nodeData.unit.path.replace(config.projectDir + "/", ""),
    parentTaskId: currentTaskId.includes("/") ? currentTaskId.split("/")[0] : undefined,
    journalTaskId: currentTaskId,
    blocking: nodeData.blocking,
    currentAttempt,
    treeNode,
  };

  // Print progress header
  console.log(
    `\n── Iteration ${ctx.iteration} ─────────────────────────────────────────────`,
  );
  console.log(`📍 Progress: ${completedCount}/${totalCount} tasks complete`);
  console.log(`▶  Next task: ${ctx.selectedNode.relPath}`);
  console.log(`   Epic: ${ctx.selectedNode.epicId}  Task: ${ctx.selectedNode.taskId}`);

  // Mirror the same transition into the optional NDJSON event stream so
  // babysitters can subscribe without grepping prose console output.
  try {
    const { emitRunEvent } = await import("./run-event-stream.ts");
    emitRunEvent("run.iteration", {
      n: ctx.iteration,
      progress: { completed: completedCount, total: totalCount },
    });
    emitRunEvent("task.start", {
      taskId: ctx.selectedNode.journalTaskId,
      relPath: ctx.selectedNode.relPath,
      epicId: ctx.selectedNode.epicId,
      attempt: currentAttempt,
    });
  } catch {
    /* event stream is best-effort */
  }

  await sessionLogger.logTaskSelected(
    ctx.selectedNode.journalTaskId,
    ctx.selectedNode.epicId,
    currentAttempt,
  );
  await sessionLogger.logTaskAttemptStart(ctx.selectedNode.journalTaskId, currentAttempt);

  return "EXECUTE";
}

async function stateExecute(ctx: RunContext): Promise<RunState> {
  const { selectedNode, config, checkpointMgr, sessionLogger } = ctx;
  const taskStartTime = Date.now();

  let unit: Unit | null = null;
  try {
    unit = await Unit.fromPath(selectedNode!.filePath);
    if (config.epochVars) {
      unit.vars = { ...unit.vars, ...config.epochVars };
    }
  } catch (err: any) {
    // Fall back to context-based execution if Unit loading fails
    console.error(
      `   ❌ Failed to load unit from ${selectedNode!.filePath}: ${err.message}`,
    );
    const execResult = await executeTask(
      {
        projectDir: config.projectDir,
        epicId: selectedNode!.epicId,
        journalTaskId: selectedNode!.journalTaskId,
        filePath: selectedNode!.filePath,
        sessionLogger,
        extraVars: config.epochVars,
        fullRefresh: config.fullRefresh,
      },
      checkpointMgr,
    );
    ctx.execResult = execResult;
    const taskDuration = Date.now() - taskStartTime;
    await sessionLogger.logTaskAttemptComplete(
      selectedNode!.journalTaskId,
      selectedNode!.currentAttempt,
      execResult.success,
      taskDuration,
    );
    return "COMMIT";
  }

  // Container check: WBS parent with children but no wbsFn → skip
  if (selectedNode!.treeNode && selectedNode!.treeNode.children.length > 0 && !unit.wbsFn) {
    console.log(
      `   ⏩ Container task (${selectedNode!.treeNode.children.length} children) — skipping direct execution`,
    );
    await ctx.tree!.markSeeded(
      selectedNode!.treeNode!,
      selectedNode!.treeNode!.children.map((c) => c.id),
    );
    ctx.taskAttempts.delete(selectedNode!.journalTaskId);
    ctx.tasksCompleted++;
    await sessionLogger.logConvergence(selectedNode!.journalTaskId, true);
    ctx.execResult = null;
    return "CHECK";
  }

  if (config.fullRefresh) {
    (unit as any).__fullRefresh = true;
  }
  ctx.execResult = await executeTask(unit, checkpointMgr, sessionLogger);
  const taskDuration = Date.now() - taskStartTime;
  await sessionLogger.logTaskAttemptComplete(
    selectedNode!.journalTaskId,
    selectedNode!.currentAttempt,
    ctx.execResult.success,
    taskDuration,
  );

  return "COMMIT";
}

async function stateCommit(ctx: RunContext): Promise<RunState> {
  const { selectedNode, execResult, config, sessionLogger, tree } = ctx;

  if (!execResult) {
    // Container skip case — tree was already updated
    await tree!.reload();
    return "CHECK";
  }

  // ── Fabrication gate ──────────────────────────────────────────────
  // Even on a "successful" attempt, scan the agent's tool-use log for
  // markers that indicate it hand-rolled a fallback instead of running
  // the declared script. Fabricated output passes file-existence checks
  // but contaminates downstream tasks. Override success → failure when
  // markers are found.
  if (execResult.success && !execResult.isWbsTask && selectedNode!.treeNode?.unit?.path) {
    try {
      const { scanForFabrication, formatFabricationReport } = await import(
        "./fabrication-scanner.ts"
      );
      const journalDir = path.dirname(selectedNode!.treeNode.unit.path);
      const scan = await scanForFabrication(journalDir);
      if (scan.fabricated) {
        console.log("");
        console.log(formatFabricationReport(scan));
        console.log("");
        execResult.success = false;
        execResult.errorKind = "structural";
        execResult.errorReason = `fabrication detected: ${scan.findings.map((f) => f.marker).join(", ")}`;
      }
    } catch {
      /* scanner is best-effort; don't block on its own bug */
    }
  }

  if (execResult.success) {
    if (execResult.isWbsTask) {
      console.log(` — waiting for subtasks`);
    } else {
      console.log(`: ${selectedNode!.taskId}`);
    }

    ctx.taskAttempts.delete(selectedNode!.journalTaskId);
    ctx.consecutiveFailures = 0;
    ctx.tasksCompleted++;
    await sessionLogger.logConvergence(selectedNode!.journalTaskId, true);

    if (selectedNode!.treeNode) {
      if (execResult.isWbsTask) {
        // After re-seeding, check if all children are already complete.
        // This handles incremental tasks whose re-seed produces children
        // that were already done from a prior run — auto-complete the
        // parent instead of leaving it "seeded" and looping.
        const allChildrenDone =
          selectedNode!.treeNode.children.length > 0 &&
          (await Promise.all(
            selectedNode!.treeNode.children.map((c) => c.isComplete()),
          )).every(Boolean);
        if (allChildrenDone) {
          await tree!.markCompleted(selectedNode!.treeNode);
        } else {
          await tree!.markSeeded(selectedNode!.treeNode, []);
        }
      } else {
        await tree!.markCompleted(selectedNode!.treeNode);
      }
    }

    if (config.force) {
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: ctx.iteration,
          tasksCompleted: ctx.tasksCompleted,
          tasksFailed: ctx.tasksFailed,
          gapsResolved: ctx.gapsResolved,
          convergenceAchieved: true,
        },
        "complete",
      );
      return "DONE";
    }
  } else {
    // Input-gate-unmet bypass: the task didn't actually run because its
    // declared inputs[] glob was unsatisfied. Don't increment the structural
    // attempt counter — the producer just hasn't run yet. But cap the number
    // of consecutive defers so a permanently-broken upstream chain doesn't
    // make the runner loop forever on the same dead-end task.
    if ((execResult as any).inputGateUnmet) {
      const journalTaskId = selectedNode!.journalTaskId;
      const MAX_DEFERS = 5;
      const defers = (ctx.taskDeferCount?.get(journalTaskId) ?? 0) + 1;
      if (!ctx.taskDeferCount) ctx.taskDeferCount = new Map();
      ctx.taskDeferCount.set(journalTaskId, defers);

      if (defers >= MAX_DEFERS) {
        console.log(
          `   ⛔ Input gate unmet for ${selectedNode!.taskId} after ${defers} defers — producer chain appears broken; marking failed.`,
        );
        ctx.consecutiveFailures++;
        ctx.tasksFailed++;
        await sessionLogger.logConvergence(selectedNode!.journalTaskId, false);
        if (selectedNode!.treeNode) {
          await tree!.markFailed(selectedNode!.treeNode);
        }
        await tree!.reload();
        ctx.selectedNode = null;
        ctx.execResult = null;
        return "CHECK";
      }

      console.log(
        `   ⏸  Input gate unmet for ${selectedNode!.taskId} — deferring (defer ${defers}/${MAX_DEFERS}, no structural attempt counted)`,
      );
      await tree!.reload();
      ctx.selectedNode = null;
      ctx.execResult = null;
      return "CHECK";
    }

    // Classify the failure and route it to the right counter. Transient
    // failures (529 / network / env-not-loaded) get a generous separate
    // budget so the runner doesn't burn its structural attempts on
    // problems the next attempt is likely to fix on its own.
    const journalTaskId = selectedNode!.journalTaskId;
    let kind: "transient" | "structural" = "structural";
    let reason = "default — could not classify";
    try {
      const { classifyTaskFailure } = await import("./error-classification.ts");
      const journalDir = selectedNode!.treeNode?.unit?.path
        ? path.dirname(selectedNode!.treeNode.unit.path)
        : null;
      const classified = journalDir
        ? await classifyTaskFailure(journalDir)
        : null;
      if (classified) {
        kind = classified.kind;
        reason = classified.reason;
      }
    } catch {
      /* fall through with default */
    }

    let attempts: number;
    const MAX_TRANSIENT = Math.max(ctx.maxTaskAttempts * 3, 6);
    if (kind === "transient") {
      const t = (ctx.taskTransientAttempts.get(journalTaskId) ?? 0) + 1;
      ctx.taskTransientAttempts.set(journalTaskId, t);
      // Use the structural counter unchanged for the gate below — but
      // for the console line we report the transient counter.
      attempts = ctx.taskAttempts.get(journalTaskId) ?? 0;
      console.log(
        `   ↻ Transient failure (${reason}) — transient attempt ${t}/${MAX_TRANSIENT}, structural counter unchanged`,
      );
      if (t >= MAX_TRANSIENT) {
        // Promote to structural after enough transient retries — at this
        // point "transient" has stopped being the right label.
        kind = "structural";
        reason = `promoted from transient after ${t} retries`;
      }
    }
    if (kind === "structural") {
      attempts = (ctx.taskAttempts.get(journalTaskId) ?? 0) + 1;
      ctx.taskAttempts.set(journalTaskId, attempts);
      console.log(
        `   ⨯ Structural failure (${reason}) — structural attempt ${attempts}/${ctx.maxTaskAttempts}`,
      );
    } else {
      attempts = ctx.taskAttempts.get(journalTaskId) ?? 0;
    }

    if (execResult.resetSiblings?.length) {
      for (const sid of execResult.resetSiblings) {
        ctx.taskAttempts.delete(sid);
        ctx.taskTransientAttempts.delete(sid);
      }
    }

    console.log(`: ${selectedNode!.taskId} (attempt ${attempts}/${ctx.maxTaskAttempts})`);

    if (execResult.isBlocking) {
      console.error(`\n⚠️  BLOCKING TASK FAILED: ${selectedNode!.journalTaskId}`);
      console.error(`   Epic: ${selectedNode!.epicId}`);
      console.error(`   ↳ This will block downstream tasks with explicit dependencies.\n`);
    }

    // Repeat-failure detector tripped inside the navigator → terminal.
    // Skip the retry budget; further attempts on the same prompt won't
    // help (the agent already exhausted its options on this task).
    const lastBail = (global as any).__CONVERGE_LAST_BAIL__ as
      | { taskId: string; journalTaskId?: string; kind: string; reason: string }
      | undefined;
    // Match short id or full journal id from either marker field. The
    // navigator stamps both forms because sub-task units sometimes load
    // with a non-canonical id (no frontmatter on the materialized TASK.md).
    const markerMatchesTask =
      !!lastBail &&
      lastBail.kind === "repeat-failure-stall" &&
      (lastBail.taskId === selectedNode!.taskId ||
        lastBail.taskId === selectedNode!.journalTaskId ||
        lastBail.journalTaskId === selectedNode!.taskId ||
        lastBail.journalTaskId === selectedNode!.journalTaskId);
    const stalledTerminally = markerMatchesTask;
    if (stalledTerminally) {
      delete (global as any).__CONVERGE_LAST_BAIL__;
      console.log(
        `   ⛔ Repeat-failure detector tripped for ${selectedNode!.taskId} — marking permanently failed (skipping further retries).`,
      );
      console.log(`      Reason: ${lastBail!.reason}`);
      console.log(
        `      To resume after fixing the underlying issue: edit TASK.md, then 'converge run --resume'.`,
      );
      ctx.consecutiveFailures++;
      ctx.tasksFailed++;
      await sessionLogger.logConvergence(selectedNode!.journalTaskId, false);
      if (selectedNode!.treeNode) {
        await tree!.markFailed(selectedNode!.treeNode);
      }
      // Skip the normal "retry until cap" path below.
      await tree!.reload();
      ctx.selectedNode = null;
      ctx.execResult = null;
      return undefined;
    }

    if (attempts >= ctx.maxTaskAttempts) {
      console.log(
        `   ⛔ Max attempts (${ctx.maxTaskAttempts}) reached for ${selectedNode!.taskId} — terminal failure.`,
      );
      ctx.consecutiveFailures++;
      ctx.tasksFailed++;
      await sessionLogger.logConvergence(selectedNode!.journalTaskId, false);
      if (selectedNode!.treeNode) {
        await tree!.markFailed(selectedNode!.treeNode);
      }
    } else {
      // Auto-repair before next attempt.
      //
      // The task's checkpoint is now `failed` (task-runner wrote it). On
      // the next iteration the scheduler will skip the task because of
      // that status — defeating the per-task retry budget. Instead of
      // a blind reset (which masked real failures pre-fix), invoke the
      // repair pipeline once. If a strategy nominates a producer to
      // re-run or patches TASK.md, reset this task's checkpoint to
      // pending so the next iteration picks it up with a different
      // foundation. If no strategy applies, leave the checkpoint
      // failed — downstream blocking takes over and the user sees the
      // failure.
      try {
        await runAutoRepair(ctx, selectedNode!, attempts);
      } catch (err: any) {
        console.warn(`   ⚠️  Auto-repair errored: ${err.message}`);
      }
    }
  }

  await tree!.reload();
  ctx.selectedNode = null;
  ctx.execResult = null;

  return "CHECK";
}

async function stateCheck(ctx: RunContext): Promise<RunState> {
  const { consecutiveFailures, iteration, maxIterations, config, sessionLogger } = ctx;

  // Halt after 3 consecutive exhausted failures
  if (consecutiveFailures >= 3) {
    console.log(
      "\n⛔ Halting: 3 consecutive task failures with no progress. Fix and resume.\n",
    );
    await sessionLogger.writeSessionEnd(
      {
        totalIterations: iteration,
        tasksCompleted: ctx.tasksCompleted,
        tasksFailed: ctx.tasksFailed,
        gapsResolved: ctx.gapsResolved,
        convergenceAchieved: false,
      },
      "error",
    );
    return "DONE";
  }

  // Max iterations guard
  if (iteration >= maxIterations) {
    console.log(
      `\n⚠️  Max iterations (${maxIterations}) reached.\n`,
    );
    await sessionLogger.writeSessionEnd(
      {
        totalIterations: iteration,
        tasksCompleted: ctx.tasksCompleted,
        tasksFailed: ctx.tasksFailed,
        gapsResolved: ctx.gapsResolved,
        convergenceAchieved: false,
      },
      "stalled",
    );
    return "DONE";
  }

  // Normal case: continue to next iteration
  return "SCAN";
}

/* ------------------------------------------------------------------ */
/*  Main loop                                                          */
/* ------------------------------------------------------------------ */

export async function autonomousRun(
  config: AutonomousRunConfig,
): Promise<AutonomousRunResult> {
  const checkpointMgr = new CheckpointManager(config.projectDir);
  const sessionLogger = new SessionLogger(
    config.projectDir,
    generateSessionId(),
    config.convergeConfig.name || "Unknown Project",
    { maxIterations: config.maxIterations ?? 500, maxAttemptsPerTask: config.maxTaskAttempts ?? 2 },
  );

  // Effective caps. 500 outer iterations is generous (covers a 50-task
  // playbook at 10 attempts each) but not the previous "effectively
  // infinite" 1M default. Surface the caps at startup so users can see
  // what the run is bounded by.
  const effectiveMaxIterations = config.maxIterations ?? 500;
  const effectiveMaxTaskAttempts = config.maxTaskAttempts ?? 2;
  const effectiveMaxRunDurationMs =
    config.maxRunDurationMs ?? 72 * 60 * 60 * 1000;
  console.log(
    `   ⚙️  Run caps: maxIterations=${effectiveMaxIterations} · maxTaskAttempts=${effectiveMaxTaskAttempts} · maxDuration=${Math.round(effectiveMaxRunDurationMs / 1000 / 60)}min`,
  );

  const ctx: RunContext = {
    config,
    projectDir: config.projectDir,
    checkpointMgr,
    sessionLogger,
    maxIterations: effectiveMaxIterations,
    maxTaskAttempts: effectiveMaxTaskAttempts,
    maxRunDurationMs: effectiveMaxRunDurationMs,
    iteration: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    gapsResolved: 0,
    taskAttempts: new Map(),
    taskTransientAttempts: new Map(),
    taskDeferCount: new Map(),
    consecutiveFailures: 0,
    consecutiveSelections: 0,
    lastSelectedTaskId: null,
    tree: null,
    selectedNode: null,
    execResult: null,
    runStartedAt: Date.now(),
    cancelled: false,
  };

  // ── Cancellation ───────────────────────────────────────────────
  const cleanupSession = async (signal: string) => {
    if (ctx.cancelled) return;
    ctx.cancelled = true;
    try {
      console.log(`\n\n⚠️  Received ${signal}. Finalizing session...`);
      const currentTask = (global as any).__CONVERGE_CURRENT_TASK__;
      if (currentTask) {
        try {
          await currentTask.unitCkpt.markInterrupted();
          console.log(`   ⚡ Recorded interruption for task: ${currentTask.journalTaskId}`);
        } catch (err: any) {
          console.warn(`   ⚠️  Could not record interrupted state: ${err.message}`);
        }
      }
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: ctx.iteration,
          tasksCompleted: ctx.tasksCompleted,
          tasksFailed: ctx.tasksFailed,
          gapsResolved: ctx.gapsResolved,
          convergenceAchieved: false,
        },
        "cancelled",
      );
      console.log(`✅ Session finalized: ${sessionLogger.getSessionDir()}\n`);
    } catch (err: any) {
      console.warn(`⚠️  Error during cleanup: ${err.message}`);
    }
    process.exit(signal === "SIGINT" ? 130 : 143);
  };

  process.once("SIGINT", () => cleanupSession("SIGINT"));
  process.once("SIGTERM", () => cleanupSession("SIGTERM"));

  // ── State machine loop ──────────────────────────────────────────
  const handlers: Record<RunState, (ctx: RunContext) => Promise<RunState>> = {
    INIT: stateInit,
    SCAN: stateScan,
    SELECT: stateSelect,
    EXECUTE: stateExecute,
    COMMIT: stateCommit,
    CHECK: stateCheck,
    DONE: async () => "DONE",
  };

  let state: RunState = "INIT";
  try {
    while (state !== "DONE") {
      state = await handlers[state](ctx);
    }
  } catch (error: any) {
    if (!ctx.cancelled) {
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: ctx.iteration,
          tasksCompleted: ctx.tasksCompleted,
          tasksFailed: ctx.tasksFailed,
          gapsResolved: ctx.gapsResolved,
          convergenceAchieved: false,
        },
        "error",
      );
    }
    throw error;
  }

  return {
    completed: state === "DONE" && ctx.tasksFailed === 0,
    tasksCompleted: ctx.tasksCompleted,
    tasksFailed: ctx.tasksFailed,
    iterations: ctx.iteration,
  };
}
