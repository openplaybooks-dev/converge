/**
 * Programmatic playbook execution.
 *
 * `run(playbook, opts)` is the only execution entry into core. It compiles
 * the in-memory playbook shape into a DAG, walks it via the existing
 * `runDag` + `executeTask` pipeline, and emits structured `RunEvent`s
 * through an optional `Reporter`. The CLI and the studio are equal-status
 * consumers.
 *
 * Playbooks loaded from a folder (`loadPlaybookFromFolder`) and playbooks
 * built in code (`definePlaybook`) produce the same `Playbook` shape, so
 * the runtime can't tell them apart.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { cacheOutputs } from "../config/task-md-definition.js";
/**
 * Internal debug log. Gated behind `CONVERGE_DEBUG` so it's silent in
 * production. When enabled, writes to `$CONVERGE_DEBUG_LOG` if set,
 * otherwise to `<projectDir>/.converge/debug.log`. The previous
 * unconditional `/tmp/converge-debug.log` write was a development
 * artifact that polluted the filesystem on every run, failed silently
 * on systems without `/tmp` (Windows), and could leak progress info
 * on multi-user systems.
 */
function _dbg(msg: string) {
  if (!process.env.CONVERGE_DEBUG) return;
  const target =
    process.env.CONVERGE_DEBUG_LOG ??
    (process.env.CONVERGE_WORKSPACE
      ? join(process.env.CONVERGE_WORKSPACE, ".converge", "debug.log")
      : null);
  if (!target) return;
  try {
    mkdirSync(dirname(target), { recursive: true });
    appendFileSync(target, `[${Date.now()}] ${msg}\n`);
  } catch {
    /* debug logging is best-effort */
  }
}

import type { DagNode } from "../dag/dag-node.js";
import { HookRegistry } from "../hooks/registry.js";
import { InterceptorRegistry } from "../hooks/interceptor-registry.js";
import {
  clearIncrementalSeedNotDone,
  clearQueueNotConverged,
  isIncrementalSeedNotDone,
  isQueueNotConverged,
  setIncrementalSeedNotDone,
  setQueueNotConverged,
} from "../dag/node-metadata.js";
import type { NodeResult } from "../dag/dag-runner.js";
import { TaskDag } from "../dag/task-dag.js";
import type { TaskDefinition } from "../config/task-definition.js";
import { executeTask } from "./execute-task.js";

/**
 * Mark spawner-parent nodes complete once every child has finished.
 *
 * Replaces the deleted `convergeSeededParents` module — same job, narrower
 * footprint. The DAG runner still uses the node status `seeded` to mean
 * "parent that spawned children and is waiting for them" so the rename is
 * purely cosmetic for a future cleanup.
 */
async function convergeSpawnerParents(
  dag: TaskDag,
  opts: { onConverge?: (nodeId: string) => Promise<void> | void },
): Promise<void> {
  for (const [nodeId, node] of dag.nodes) {
    if (node.status !== "seeded") continue;
    const childIds = node.spawned_children ?? [];
    if (childIds.length === 0) continue;
    const allDone = childIds.every((cid) => {
      const child = dag.nodes.get(cid);
      return (
        child?.status === "complete" ||
        child?.status === "pass" ||
        child?.status === "failed"
      );
    });
    if (!allDone) continue;
    if (opts.onConverge) await opts.onConverge(nodeId);
  }
}
import { Unit } from "../task/unit/unit.js";
import { RunStateManager, writeJournalManifest } from "../manifest/index.js";
import { ExecutionLogger } from "../journal/execution-logger.js";
import { getTargetDir } from "../journal/structure.js";
import { TaskStateManager } from "../checkpoint/state.js";
import {
  appendTaskUpsert,
  appendTaskStatus,
  ensureRuntimeLedger,
  readRuntimeLedgerState,
} from "../task/goal/runtime-ledger.js";
import type { CompletionData, CheckResultItem } from "../manifest/types.js";

import type { Playbook } from "../playbook.js";
import type { LoaderError } from "../config/declarative-loader-unified.js";
import { syncLedgerToDag } from "./ledger-sync.js";
import {
  compilePlaybook,
  expandHooksFromPlaybook,
  hashPlaybook,
} from "./playbook-compile.js";

/* ------------------------------------------------------------------ */
/*  Public types (re-exported from ./types.ts)                         */
/* ------------------------------------------------------------------ */

export type { RunEvent, Reporter } from "./types.js";
import type { RunEvent, Reporter } from "./types.js";

export interface RunOptions {
  /** Absolute project directory (where `.converge/` lives). */
  projectDir: string;
  /**
   * Playbook directory on disk. If the playbook came from a folder, pass
   * its path here so the existing DAG builder can read TASK.md files;
   * if the playbook was built in code, omit this and the runtime will
   * synthesize a DAG from the in-memory tasks.
   */
  playbookDir?: string;
  /** Inputs (vars) the playbook declared. */
  inputs?: Record<string, string>;
  /** Selector expression — same DSL as `converge run --select`. */
  select?: string;
  /** Resume the latest execution rather than starting fresh. */
  resume?: boolean;
  /** Compile + emit `dry-run` event, don't execute. */
  dry?: boolean;
  /** Skip env-var and outputs-exist pre-flight checks. */
  skipPreflight?: boolean;
  /** RFC 0021: run stub.cmd for tasks with stub: blocks instead of real executors. */
  stubMode?: boolean;
  /** Stop after the static DAG completes — don't execute spawned children. */
  seedOnly?: boolean;
  /**
   * dbt-style cross-state task reuse. Path to a prior run's
   * `manifest.json` (e.g. `.converge/journal/<pb>/manifest.json` from
   * a known-good run, or an artifact preserved from CI). When set
   * AND `defer` is true, tasks whose definition hash matches the
   * prior manifest and were "complete" there are pre-marked complete
   * in the current run — they don't re-execute. Use case:
   * incremental rebuilds where most upstream tasks haven't changed
   * but you've added one new leaf. The runner only touches the
   * changed subset.
   */
  state?: string;
  /**
   * Activate deferred-execution mode (requires `state`). Without
   * `defer`, the `state` path is read but only used for selector
   * expressions like `state:modified+`. With `defer`, unchanged
   * complete tasks from the prior run are reused.
   *
   * IMPORTANT: defer is a *same-workspace* optimization. Tasks are
   * skipped only when their declared `outputs:` are still present on
   * disk. If a deferred task's outputs are missing (e.g. the operator
   * points `--state` at a manifest from a different workspace, or the
   * outputs were cleaned), the runner re-executes the task and emits
   * a warning rather than silently leaving downstream tasks with
   * dangling inputs. To force a clean re-run, omit `--defer` or run
   * `converge clean --select '*'` before `converge run`.
   */
  defer?: boolean;
  /** Deprecated alias for `workers`. */
  concurrency?: number;
  /** Number of worker slots the coordinator may dispatch to. Default 1. */
  workers?: number;
  /** Per-task attempt cap before giving up. */
  maxTaskAttempts?: number;
  /** Structured event sink. Drop events when omitted. */
  reporter?: Reporter;
  /** Cancel mid-run. Throws AbortError. */
  signal?: AbortSignal;
  /** Hook registry for lifecycle events. Plugin hooks are bridged in via CLI. */
  hookRegistry?: HookRegistry;
  /** Interceptor registry for middleware chains. Plugin interceptors are bridged in via CLI. */
  interceptorRegistry?: InterceptorRegistry;
}

export interface RunResult {
  runId: string;
  completed: number;
  failed: number;
  durationMs: number;
  blocked?: boolean;
  blockedTaskId?: string;
  nodes: Array<{
    id: string;
    status: "completed" | "failed" | "skipped" | "cached" | "blocked";
    outputs: string[];
  }>;
}

/* ------------------------------------------------------------------ */
/*  Convenience reporters                                              */
/* ------------------------------------------------------------------ */

/**
 * Reporter that prints events to stderr in roughly the format the CLI
 * used before this module replaced `dagAutonomousRun`. Lets the CLI
 * preserve its existing UX without owning the orchestration loop.
 */
export function consoleReporter(): Reporter {
  return {
    emit(e: RunEvent): void {
      switch (e.kind) {
        case "compile-error":
          for (const err of e.errors)
            console.error(`  [${err.type}] ${err.message}`);
          break;
        case "compile-complete":
          console.error(
            `DAG: ${e.nodeCount} nodes` +
              (e.cachedCount > 0 ? ` (${e.cachedCount} cached)` : ""),
          );
          break;
        case "select-applied":
          console.error(
            `  --select "${e.expression}": ${e.selected} selected, ${e.skipped} skipped`,
          );
          break;
        case "dry-run":
          if (e.cached.length > 0)
            console.error(`  Cached (skip): ${e.cached.join(", ")}`);
          if (e.pending.length > 0)
            console.error(`  Will run:      ${e.pending.join(", ")}`);
          if (e.skipped.length > 0)
            console.error(`  Skipped:       ${e.skipped.join(", ")}`);
          if (
            e.pending.length === 0 &&
            e.cached.length === 0 &&
            e.skipped.length === 0
          ) {
            console.error("  (all tasks pending — nothing cached or skipped)");
          }
          console.error(
            `\n  Dry run — ${e.pending.length} task(s) would execute.`,
          );
          break;
        case "task-start":
          console.error(`  ▶ ${e.taskId}`);
          break;
        case "task-cached":
          console.error(`  ✓ ${e.taskId} (cached)`);
          break;
        case "task-skipped":
          console.error(`  ⚠ ${e.taskId}: ${e.reason}`);
          break;
        case "task-failed":
          console.error(`  ✗ ${e.taskId}: ${e.error}`);
          break;
        case "children-spawned":
          console.error(
            `   [seed] spawned ${e.children.length} children: ${e.children.map((c) => c.id).join(", ")}`,
          );
          break;
        case "log":
          if (e.level === "error") console.error(e.message);
          else console.error(e.message);
          break;
        case "run-complete":
          console.error(
            `\nDone: ${e.completed} ok, ${e.failed} failed (${(e.durationMs / 1000).toFixed(1)}s)`,
          );
          break;
        case "run-aborted":
          console.error(`\nAborted: ${e.reason}`);
          break;
        case "run-paused":
          console.error(`\nPaused: ${e.reason}`);
          break;
        default:
          break;
      }
    },
  };
}

/** Reporter that buffers events into an array. Used by tests. */
export function captureReporter(): Reporter & { events: RunEvent[] } {
  const events: RunEvent[] = [];
  return {
    events,
    emit(e: RunEvent): void {
      events.push(e);
    },
  };
}

/* ------------------------------------------------------------------ */
/*  run()                                                              */
/* ------------------------------------------------------------------ */

class AbortedError extends Error {
  name = "AbortError";
}

function checkAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new AbortedError("aborted");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWorkerCount(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return 1;
  return Math.max(1, Math.floor(raw));
}

function buildWorkerIds(workerCount: number): string[] {
  return Array.from(
    { length: workerCount },
    (_, index) => `local-${index + 1}`,
  );
}

function journalTaskDirCandidatesForNode(
  resultsMgr: RunStateManager,
  taskId: string,
  taskPath?: string,
): string[] {
  const candidates: string[] = [];
  const push = (dir: string | undefined) => {
    if (dir && !candidates.includes(dir)) candidates.push(dir);
  };

  const fromRunstate = resultsMgr.getNodeJournalPath(taskId);
  if (fromRunstate) {
    push(
      fromRunstate.startsWith(".converge/")
        ? join(
            resultsMgr.executionDir,
            fromRunstate.replace(/^\.converge\/journal\/[^/]+\//, ""),
          )
        : join(resultsMgr.executionDir, fromRunstate),
    );
  }

  if (taskPath) {
    const normalized = taskPath.replace(/\\/g, "/");
    if (normalized.includes("/.converge/journal/")) {
      const direct = normalized.endsWith("/TASK.md")
        ? dirname(normalized)
        : normalized;
      push(direct);
      // Spawner parents journal child task IDs as parent/id, while the
      // materialized TASK.md lives under parent/spawned/id. Check both.
      push(direct.replace(/\/spawned\//g, "/"));
    }
    const marker = "/.converge/playbooks/";
    const idx = normalized.indexOf(marker);
    if (idx >= 0) {
      const after = normalized.slice(idx + marker.length);
      const parts = after.split("/");
      parts.shift();
      const rel = parts.join("/").replace(/\/TASK\.md$/, "");
      push(join(resultsMgr.executionDir, rel));
    }
  }

  push(join(resultsMgr.executionDir, "tasks", taskId));
  return candidates;
}

function statusCounts(dag: TaskDag): {
  pending: number;
  failed: number;
  complete: number;
} {
  let pending = 0;
  let failed = 0;
  let complete = 0;
  for (const node of dag.nodes.values()) {
    if (
      node.status === "pending" ||
      node.status === "ready" ||
      node.status === "running" ||
      node.status === "seeded"
    )
      pending++;
    else if (node.status === "failed") failed++;
    else if (node.status === "complete" || node.status === "pass") complete++;
  }
  return { pending, failed, complete };
}

interface WorkerLease {
  workerId: string;
  leaseId: string;
}

async function reviewBlocksNode(
  node: DagNode,
  projectDir: string,
  playbookName: string,
): Promise<boolean> {
  const review = (node.taskDef as any)?.handoff;
  if (!review) return false;
  const { loadLatestHumanReview } = await import("../task/review.js");
  const latest = await loadLatestHumanReview(projectDir, playbookName, node.id);
  return !latest || latest.decision !== "approve";
}

function mirrorTaskStatus(
  projectDir: string,
  playbookName: string,
  taskId: string,
  status: "doing" | "awaiting-review" | "done" | "blocked" | "dropped",
): void {
  try {
    appendTaskStatus(projectDir, playbookName, taskId, status);
  } catch {
    // inventory mirroring is best effort
  }
}

async function executeDagWithWorkers(
  dag: TaskDag,
  workerIds: string[],
  resultsMgr: RunStateManager,
  executeNode: (node: DagNode, lease: WorkerLease) => Promise<NodeResult>,
  projectDir: string,
  playbookName: string,
): Promise<{
  completed: number;
  failed: number;
  blocked?: boolean;
  blockedTaskId?: string;
}> {
  const workerCount = Math.max(1, workerIds.length);
  let completed = 0;
  let failed = 0;
  let leaseCounter = 0;
  let blockedTaskId: string | undefined;

  while (true) {
    const ready = dag.getReady();
    if (ready.length === 0) break;

    if (workerCount === 1) {
      const node = ready[0];
      const lease = {
        workerId: workerIds[0],
        leaseId: `${node.id}-lease-${++leaseCounter}`,
      };
      await resultsMgr.markRunning(node.id, {
        workerId: lease.workerId,
        leaseId: lease.leaseId,
      });
      mirrorTaskStatus(projectDir, playbookName, node.id, "doing");
      const result = await executeNode(node, lease);
      // Honor `review:` / `handoff:` on any task: even when execution itself
      // succeeded, hold the node as blocked until a human verdict is
      // recorded. Gateway tasks (no body) reach this with success=true;
      // leaf tasks that bailed at the review gate in verify.ts reach
      // this with success=false. Either way, a node carrying `review:`
      // or `handoff:`
      // without an `approve` verdict is awaiting-review, not done.
      const reviewBlock = await reviewBlocksNode(
        node,
        projectDir,
        playbookName,
      );
      const nodeState = await resultsMgr.getNodeStatus(node.id);
      const humanReviewBlock =
        reviewBlock || nodeState?.error_message === "Awaiting human review";
      const blocked = result.blocked || reviewBlock;
      if (blocked) {
        if (humanReviewBlock) {
          mirrorTaskStatus(
            projectDir,
            playbookName,
            node.id,
            "awaiting-review",
          );
        } else {
          mirrorTaskStatus(projectDir, playbookName, node.id, "blocked");
        }
        dag.markBlocked(node.id);
        blockedTaskId = node.id;
        continue;
      }
      if (result.success) {
        if (
          node.status !== "seeded" &&
          node.status !== "pass" &&
          node.status !== "complete"
        ) {
          dag.markComplete(node.id);
        }
        mirrorTaskStatus(projectDir, playbookName, node.id, "done");
        completed++;
      } else {
        dag.markFailed(node.id);
        mirrorTaskStatus(projectDir, playbookName, node.id, "dropped");
        failed++;
      }
      continue;
    }

    const chunk = ready.slice(0, workerCount);
    const leasedNodes = chunk.map((node, index) => ({
      node,
      lease: {
        workerId: workerIds[index],
        leaseId: `${node.id}-lease-${++leaseCounter}`,
      },
    }));

    await Promise.all(
      leasedNodes.map(({ node, lease }) =>
        resultsMgr.markRunning(node.id, {
          workerId: lease.workerId,
          leaseId: lease.leaseId,
        }),
      ),
    );
    for (const { node } of leasedNodes) {
      mirrorTaskStatus(projectDir, playbookName, node.id, "doing");
    }

    const results = await Promise.all(
      leasedNodes.map(async ({ node, lease }) => ({
        node,
        result: await executeNode(node, lease),
      })),
    );

    for (const { node, result } of results) {
      const reviewBlock = await reviewBlocksNode(
        node,
        projectDir,
        playbookName,
      );
      const nodeState = await resultsMgr.getNodeStatus(node.id);
      const humanReviewBlock =
        reviewBlock || nodeState?.error_message === "Awaiting human review";
      const blocked = result.blocked || reviewBlock;
      if (blocked) {
        if (humanReviewBlock) {
          mirrorTaskStatus(
            projectDir,
            playbookName,
            node.id,
            "awaiting-review",
          );
        } else {
          mirrorTaskStatus(projectDir, playbookName, node.id, "blocked");
        }
        dag.markBlocked(node.id);
        blockedTaskId = node.id;
        continue;
      }
      if (result.success) {
        if (
          node.status !== "seeded" &&
          node.status !== "pass" &&
          node.status !== "complete"
        ) {
          dag.markComplete(node.id);
        }
        mirrorTaskStatus(projectDir, playbookName, node.id, "done");
        completed++;
      } else {
        dag.markFailed(node.id);
        mirrorTaskStatus(projectDir, playbookName, node.id, "dropped");
        failed++;
      }
    }

    // If every ready node was blocked, break so the outer loop can re-scan
    // after producers have a chance to generate outputs.
    if (completed === 0 && failed === 0 && ready.length > 0) {
      break;
    }
  }

  return { completed, failed, blocked: blockedTaskId != null, blockedTaskId };
}

/**
 * Execute a playbook.
 *
 * The playbook can come from any source — `definePlaybook(...)` in code,
 * `loadPlaybookFromFolder(...)` from disk, or `definePlannerPlaybook(...)`
 * for the planner. Behavior is identical: build DAG, walk topologically,
 * stream events, write the journal, return a `RunResult`.
 */
export async function run(
  playbook: Playbook,
  opts: RunOptions,
): Promise<RunResult> {
  _dbg("run:start dry=" + opts.dry);
  const reporter = opts.reporter;
  const projectDir = opts.projectDir;
  const playbookName = playbook.def.name;
  const playbookDir = opts.playbookDir ?? playbook.dir ?? projectDir;
  const runConfig = playbook.def.run;
  const maxTaskAttempts =
    opts.maxTaskAttempts ?? runConfig?.maxTaskAttempts ?? 3;
  const workerCount = normalizeWorkerCount(
    opts.workers ?? runConfig?.workers ?? opts.concurrency,
  );
  const workerIds = buildWorkerIds(workerCount);
  const maxDagPasses = 1_000_000;
  const maxDurationMs = runConfig?.maxDuration;
  const stallMaxConsecutive = runConfig?.stall?.maxConsecutive ?? 2;
  const stallBackoffMs = runConfig?.stall?.backoffMs ?? 30_000;

  const runStart = Date.now();

  // ── 1. Compile ──────────────────────────────────────────────────
  reporter?.emit({ kind: "compile-start" });
  checkAborted(opts.signal);

  const targetDir = getTargetDir(projectDir, playbookName);
  mkdirSync(targetDir, { recursive: true });

  _dbg("run:before compilePlaybook");
  const { dag, errors, playbookHash } = await compilePlaybook(
    playbook,
    playbookDir,
    playbookName,
    targetDir,
    projectDir,
  );
  _dbg("run:after compilePlaybook nodes=" + dag.nodes.size);
  // compilePlaybook already emitted a count via the reporter; no extra log needed.

  if (errors.length > 0) {
    reporter?.emit({
      kind: "compile-error",
      errors: errors.map((e) => ({ type: e.type, message: e.message })),
    });
    if (errors.some((e) => e.type === "cycle")) {
      throw new Error("DAG has dependency cycles — cannot execute.");
    }
    // Missing user-defined tasks must not silently pass: with only the
    // synthetic root sentinels left in the DAG, the run would otherwise
    // report PASS while the actual playbook never executed.
    const missing = errors.filter(
      (e) => e.type === "missing_task" || e.type === "missing_template",
    );
    if (missing.length > 0) {
      const detail = missing.map((e) => `  - ${e.message}`).join("\n");
      throw new Error(
        `Cannot execute playbook: ${missing.length} task definition(s) missing.\n${detail}\n` +
          `Hint: the inventory may reference paths from another checkout. ` +
          `Run \`converge clean --playbook ${playbookName}\` to rebuild from the playbook source.`,
      );
    }
  }
  dag.playbookName = playbookName;

  reporter?.emit({
    kind: "run-start",
    playbook: playbookName,
    runId: "latest",
    projectDir,
  });
  reporter?.emit({
    kind: "log",
    level: "info",
    message: `Coordinator starting with ${workerCount} worker${workerCount === 1 ? "" : "s"}`,
  });

  _dbg(
    "run:before RunStateManager targetDir=" +
      targetDir +
      " exists=" +
      existsSync(targetDir),
  );
  const resultsMgr = new RunStateManager(
    targetDir,
    dag,
    playbookHash,
    projectDir,
  );
  _dbg("run:after RunStateManager");

  if (opts.resume) {
    const state = await resultsMgr.getStateSnapshot();
    // Count journal entries whose rendered TASK.md uses a frontmatter shape
    // the current CLI no longer parses (e.g. legacy `seed: { mode: cli }` after
    // RFCs 0021/0022). Such entries are recoverable: the parent's spawn
    // manifest will re-render them from the current template on the next wave.
    // We log one summary line at end-of-resume; this prevents one stale child
    // from killing access to N already-completed siblings.
    const staleSchemaNodes: {
      id: string;
      sourceTemplate: string;
      detail: string;
    }[] = [];

    // RFC 0036: Track fresh DAG nodes to ensure they're preserved during merge
    const freshDagNodeIds = new Set(dag.nodes.keys());

    for (const [id, rsNode] of Object.entries(state.dag.nodes)) {
      const existingNode = dag.nodes.get(id);
      if (existingNode) {
        // RFC 0036: Update existing nodes with runstate data, preserving fresh DAG nodes
        existingNode.spawned_children =
          rsNode.spawned_children ?? existingNode.spawned_children ?? [];
        existingNode.depended_on_by =
          rsNode.depended_on_by ?? existingNode.depended_on_by;
        existingNode.status =
          rsNode.status === "pass"
            ? "complete"
            : rsNode.status === "blocked"
              ? "pending"
              : rsNode.status === "error"
                ? "failed"
                : rsNode.status === "running"
                  ? "pending"
                  : rsNode.status === "skipped"
                    ? "complete"
                    : rsNode.status === "seeded"
                      ? "seeded"
                      : "pending";
        if (rsNode.status === "blocked") {
          await resultsMgr.markPending(id);
        }
        continue;
      }
      if (!dag.nodes.has(id)) {
        // Reconstruct the TASK.md path from runstate data.
        // Spawned children: {playbookDir}/tasks/{parentId}/spawned/{childId}/TASK.md
        let taskMdPath = rsNode.source_path ?? "";
        if (!taskMdPath && rsNode.journal_path) {
          const rel = rsNode.journal_path.replace(
            /^\.converge\/journal\/[^/]+\//,
            "",
          );
          taskMdPath = join(targetDir, rel, "TASK.md");
        }
        if (!taskMdPath && rsNode.from_seed) {
          taskMdPath = join(
            targetDir,
            "tasks",
            rsNode.from_seed,
            "spawned",
            id,
            "TASK.md",
          );
        }
        // RFC 0036: For spawned tasks, prefer ledger taskPath over reconstructed
        // journal path. The journal_path reconstruction often points to a stale
        // location; the ledger has the authoritative instance file path.
        if (!taskMdPath || !existsSync(taskMdPath)) {
          try {
            const ledgerState = readRuntimeLedgerState(
              projectDir,
              playbookName,
            );
            for (const row of ledgerState.tasks) {
              if (row.source === "spawned" && row.id === id && row.taskPath) {
                const ledgerAbsPath = join(projectDir, row.taskPath);
                if (existsSync(ledgerAbsPath)) {
                  taskMdPath = ledgerAbsPath;
                  break;
                }
              }
            }
          } catch {
            /* ledger unreadable — skip fallback */
          }
        }
        // Load full taskDef from the TASK.md to get seeds, inputs, outputs, checks, vars.
        let taskDef: TaskDefinition = {
          id,
          title: rsNode.title,
          description: rsNode.description,
          inputs: rsNode.inputs ?? [],
          outputs: rsNode.outputs ?? [],
          checks: rsNode.checks as any,
          vars: rsNode.vars ?? {},
        };
        let staleSchema = false;
        if (taskMdPath && existsSync(taskMdPath)) {
          const raw = readFileSync(taskMdPath, "utf-8");
          const { parseTaskMdString, mapTaskMdToTaskDefinition } =
            await import("../config/task-md-definition.js");
          try {
            const parsed = parseTaskMdString(raw);
            const mapped = mapTaskMdToTaskDefinition(
              parsed,
              parsed.body ?? "",
              id,
              dirname(taskMdPath),
            );
            taskDef = {
              ...mapped,
              id,
              title: mapped.title ?? rsNode.title ?? id,
              description: mapped.description ?? rsNode.description,
              depends_on: mapped.depends_on ?? rsNode.depends_on ?? [],
              blocking: true,
              // RFC 0036: Preserve vars from TASK.md frontmatter so that
              // {{placeholder}} resolution works for spawned tasks.
              vars: mapped.vars ?? rsNode.vars,
              // RFC 0031: Preserve runstate-interpolated outputs when the
              // template file has raw {{key}} placeholders. The runstate was
              // already resolved with params — don't let the raw template override.
              outputs: rsNode.outputs ?? mapped.outputs ?? [],
            };
          } catch (e) {
            // Schema-removed errors are recoverable: the parent will re-render
            // from the current template. Anything else is a real parse bug —
            // re-throw so we don't silently swallow malformed YAML.
            const errorCode = (e as Error & { errorCode?: string }).errorCode;
            if (errorCode === "schema-removed") {
              staleSchema = true;
              staleSchemaNodes.push({
                id,
                sourceTemplate: rsNode.source_path ?? "(unknown)",
                detail: (e as Error).message,
              });
            } else {
              throw e;
            }
          }
        }

        dag.nodes.set(id, {
          id,
          type: rsNode.dag_type ?? "normal",
          convergePassthrough: rsNode.converge_passthrough,
          parents: rsNode.from_seed ? [rsNode.from_seed] : [],
          children: [],
          spawned_children: rsNode.spawned_children ?? [],
          depends_on: rsNode.depends_on,
          depended_on_by: rsNode.depended_on_by,
          taskDef,
          path: taskMdPath,
          // Force pending for stale-schema entries so the parent re-spawns
          // them from the current template, even if runstate says "pass".
          status: staleSchema
            ? "pending"
            : rsNode.status === "pass"
              ? "complete"
              : rsNode.status === "blocked"
                ? "pending"
                : rsNode.status === "error"
                  ? "failed"
                  : "pending",
          virtual: false,
        });
        if (rsNode.status === "blocked") {
          await resultsMgr.markPending(id);
        }
      }
    }
    if (staleSchemaNodes.length > 0) {
      reporter?.emit({
        kind: "log",
        level: "warn",
        message:
          `resume: marked ${staleSchemaNodes.length} journal entries as stale-schema; ` +
          `they will be re-spawned from current templates. ` +
          `Affected nodes: ${staleSchemaNodes
            .slice(0, 5)
            .map((n) => n.id)
            .join(", ")}` +
          (staleSchemaNodes.length > 5
            ? `, …(+${staleSchemaNodes.length - 5} more)`
            : ""),
      });
    }

    // RFC 0036: Verify fresh DAG nodes are preserved after merge
    const finalDagNodeIds = new Set(dag.nodes.keys());
    const lostNodes = [...freshDagNodeIds].filter(
      (id) => !finalDagNodeIds.has(id),
    );
    if (lostNodes.length > 0) {
      reporter?.emit({
        kind: "log",
        level: "warn",
        message: `resume: ${lostNodes.length} fresh DAG nodes were lost during merge: ${lostNodes.slice(0, 5).join(", ")}${lostNodes.length > 5 ? `, …(+${lostNodes.length - 5} more)` : ""}`,
      });
    }

    // Wire converge nodes: for each restored spawned child whose parent
    // is a diverge node, add the child to the matching
    // converge node's depends_on so it waits for the child on resume.
    for (const [id, rsNode] of Object.entries(state.dag.nodes)) {
      if (!rsNode.from_seed) continue;
      const parentId = rsNode.from_seed;
      const parentNode = dag.nodes.get(parentId);
      if (!parentNode || parentNode.type !== "diverge") continue;

      for (const [cid, cnode] of dag.nodes) {
        if (cnode.type === "converge" && cnode.depends_on.includes(id)) {
          break;
        }
        if (
          cnode.type === "converge" &&
          (parentNode.spawned_children ?? []).includes(id)
        ) {
          if (!cnode.depends_on.includes(id)) {
            cnode.depends_on.push(id);
          }
        }
      }
    }
  }

  _dbg("run:before writeJournalManifest");
  await writeJournalManifest(targetDir, resultsMgr.toManifest());
  _dbg("run:after writeJournalManifest");

  const checkpointMgr = new TaskStateManager(projectDir);

  const executionLogger = new ExecutionLogger(
    projectDir,
    playbookName,
    { maxIterations: 0, maxAttemptsPerTask: maxTaskAttempts },
    playbookName,
  );

  // ── 2.5 Change detection — compare against previous runstate ─────
  let cachedCount = 0;
  let reconciledFromInventory = false;
  let resetEditedCount = 0;
  let resetMissingOutputCount = 0;
  let newCount = 0;

  // RFC 0025: hydrated-from-inventory state always needs validation
  // (fingerprint match + outputs-on-disk) regardless of opts.resume.
  // Without this, a peer-machine resume blindly trusts the inventory:
  // any TASK.md edit or deleted output between machines goes undetected
  // and the runner skips work that needs to be redone.
  const needsHydratedReconcile = resultsMgr.hasInventoryHydratedPriorState();
  _dbg(
    "run:before changeDetection resume=" +
      opts.resume +
      " hydratedReconcile=" +
      needsHydratedReconcile,
  );
  if (!opts.resume || needsHydratedReconcile) {
    const fingerprints = new Map<string, string>();
    for (const [id, node] of dag.nodes) {
      const fp = computeFingerprint(node);
      fingerprints.set(id, fp);
      resultsMgr.setNodeFingerprint(id, fp);
    }

    // Load previous runstate from target directory (prev run).
    // RFC 0025: when no runstate.json exists but the inventory ledger
    // hydrated prior-pass nodes into memory, use that hydrated state
    // as the "previous run" — same change-detection algorithm, fed
    // from a portable source instead of a machine-local journal.
    let prevState = resultsMgr.loadPrevRunState();
    if (!prevState && resultsMgr.hasInventoryHydratedPriorState()) {
      prevState = resultsMgr.inventoryHydratedAsPrevState();
      reconciledFromInventory = true;
    }

    if (prevState) {
      const changed = new Set<string>();
      const layers = dag.topologicalOrder();

      for (const layer of layers) {
        for (const node of layer) {
          const priorNode = prevState.dag?.nodes?.[node.id];
          const fp = fingerprints.get(node.id);

          if (
            priorNode &&
            priorNode.status === "pass" &&
            fp &&
            fp === priorNode.fingerprint
          ) {
            const upstreamChanged = node.depends_on.some((dep: string) =>
              changed.has(dep),
            );
            const outputsExist = cacheOutputs(node.taskDef).every(
              (output: string) => existsSync(join(projectDir, output)),
            );
            if (!upstreamChanged && outputsExist) {
              await resultsMgr.markCached(node.id, fp, priorNode);
              cachedCount++;
              continue;
            }
            // Hydrated but invalidated — bucket which predicate failed
            // so the reconcile summary line can explain it.
            if (reconciledFromInventory) {
              if (!outputsExist) resetMissingOutputCount++;
              else if (upstreamChanged) resetEditedCount++;
            }
          } else if (reconciledFromInventory) {
            if (
              priorNode &&
              priorNode.status === "pass" &&
              fp !== priorNode.fingerprint
            ) {
              resetEditedCount++;
            } else if (!priorNode) {
              newCount++;
            }
          }
          if (node.status === "complete" || node.status === "pass") {
            dag.resetToPending(node.id);
            await resultsMgr.markPending(node.id);
          }
          changed.add(node.id);
        }
      }
    }

    _dbg("run:before persist in changeDetection");
    await resultsMgr.persist();
    _dbg("run:after persist in changeDetection");
  } else if (opts.resume) {
    cachedCount = await resultsMgr.getCompletedCount();
  }
  _dbg("run:after changeDetection block");

  // RFC 0024: emit a single reconcile summary line when prior state
  // came from the inventory rather than runstate.json. This is the
  // first signal a peer-machine operator sees that their clone
  // recovered from a teammate's run.
  if (reconciledFromInventory) {
    reporter?.emit({
      kind: "log",
      level: "info",
      message:
        `reconciled (${playbookName}): ${cachedCount} cached` +
        ` · ${resetEditedCount} reset (TASK.md changed)` +
        ` · ${resetMissingOutputCount} reset (output missing)` +
        ` · ${newCount} new`,
    });
  }

  // ── Defer (dbt-style cross-state task reuse) ────────────────────────
  // When `state` + `defer` are both set, load the prior manifest and
  // pre-mark tasks as complete if their definition hashes match AND
  // they were "complete" in the prior run. The runner skips them in
  // the current pass; downstream tasks unblock as if they had
  // re-executed.
  //
  // Use case: large playbook, one leaf added, don't want to re-run
  // every upstream task. This is the workflow dbt enables with
  // `--defer --state path/to/last-good-run`.
  if (opts.state && opts.defer) {
    try {
      const statePath = opts.state.endsWith(".json")
        ? opts.state
        : join(opts.state, "manifest.json");
      if (!existsSync(statePath)) {
        reporter?.emit({
          kind: "log",
          level: "warn",
          message: `--defer: state manifest not found at ${statePath}; falling back to non-deferred run`,
        });
      } else {
        const priorManifest = JSON.parse(readFileSync(statePath, "utf-8"));
        let deferredCount = 0;
        const deferredWithMissingOutputs: Array<{
          id: string;
          missing: string[];
        }> = [];
        for (const [id, currNode] of dag.nodes) {
          if (currNode.status !== "pending") continue;
          const prior = priorManifest?.nodes?.[id];
          if (!prior) continue;
          // Match: same definition hash AND prior status was complete.
          // Use upstream_hash (which includes the node's own hashes
          // plus all its dependencies') so a change anywhere upstream
          // forces re-execution.
          const currHash =
            (currNode.taskDef as { upstream_hash?: string })?.upstream_hash ??
            (currNode as { upstream_hash?: string }).upstream_hash;
          if (
            prior.upstream_hash &&
            currHash &&
            prior.upstream_hash === currHash &&
            (prior.state === "complete" || prior.state === "pass")
          ) {
            // Output rehydration check: defer relies on the prior
            // run's output artifacts being present at their declared
            // paths. The standard case is same-workspace defer (the
            // outputs were left in place from the prior run), in
            // which case existsSync passes and we proceed.
            //
            // If outputs are MISSING, the operator's --state likely
            // points at a stale manifest whose artifacts have since
            // been deleted (or come from a different workspace).
            // Skipping execution would leave downstream tasks unable
            // to read their inputs. We DON'T defer in that case and
            // record the diagnostic for surfacing.
            const declaredOutputs =
              currNode.taskDef?.outputs ?? prior.outputs ?? [];
            const missing: string[] = [];
            for (const o of declaredOutputs) {
              if (typeof o !== "string") continue;
              const absOut = o.startsWith("/") ? o : join(projectDir, o);
              if (!existsSync(absOut)) missing.push(o);
            }
            if (missing.length > 0) {
              deferredWithMissingOutputs.push({ id, missing });
              continue; // leave pending — will re-execute
            }
            dag.markComplete(id);
            deferredCount++;
          }
        }
        reporter?.emit({
          kind: "log",
          level: "info",
          message: `--defer: reused ${deferredCount} unchanged task(s) from ${statePath}`,
        });
        if (deferredWithMissingOutputs.length > 0) {
          reporter?.emit({
            kind: "log",
            level: "warn",
            message:
              `--defer: ${deferredWithMissingOutputs.length} task(s) had matching hashes ` +
              `but missing outputs — re-executing them. ` +
              `(--state may be stale or from a different workspace. ` +
              `Sample: ${deferredWithMissingOutputs
                .slice(0, 3)
                .map((d) => `${d.id} missing ${d.missing[0]}`)
                .join(", ")})`,
          });
        }
        cachedCount += deferredCount;
      }
    } catch (err) {
      // Defer is a performance optimization; failure to load the
      // prior manifest shouldn't crash the run. Log and proceed.
      reporter?.emit({
        kind: "log",
        level: "warn",
        message: `--defer: failed to load prior state: ${(err as Error).message}`,
      });
    }
  } else if (opts.defer && !opts.state) {
    reporter?.emit({
      kind: "log",
      level: "warn",
      message: "--defer requires --state PATH; ignored",
    });
  }

  reporter?.emit({
    kind: "compile-complete",
    nodeCount: dag.nodes.size,
    cachedCount,
  });

  // Sync static DAG task inventory into tasks.jsonl (append-only upserts).
  //
  // RFC 0030 footnote: skip nodes whose tasks.jsonl row already records
  // them as `source: "spawned"` (or whose `taskDef.from_seed` is set —
  // both indicate the node was created by applyManifest, not by the
  // static playbook compile). Re-filing a spawned row as `source: "static"`
  // with a synthesized `<journalDir>/tasks/<id>` taskPath blows away the
  // canonical EXPANDED.md taskPath applyManifest wrote, leaves the row
  // with metadata `{fromPath, dagType}` instead of `{template,
  // renderedHash}`, and trips the duplicate-id check the next time
  // applyManifest sees the same id with different rendered content.
  try {
    const playbookName = playbook.def.name;
    ensureRuntimeLedger(projectDir, playbookName, playbook.def.goals);
    const { readRuntimeLedgerState: readLedger } =
      await import("../task/goal/runtime-ledger.js");
    const ledger = readLedger(projectDir, playbookName);
    const spawnedIds = new Set(
      ledger.tasks.filter((t) => t.source === "spawned").map((t) => t.id),
    );
    for (const node of dag.nodes.values()) {
      if (node.id.startsWith("root-")) continue;
      // RFC 0030 footnote: don't touch spawned rows — they're owned by
      // applyManifest and carry `{template, renderedHash}` metadata
      // that this sync would clobber with `{fromPath, dagType}`,
      // making subsequent applyManifest calls hit duplicate-id errors.
      if (spawnedIds.has(node.id)) continue;
      // Skip nodes with no path or whose path points to journal/spawned.
      // These are materialized spawned children discovered via discoverSpawnedChildren
      // or syncLedgerToDag, not static declarations. Writing them as static
      // would break their canonical TASK.md location tracking.
      if (!node.path) continue;
      const normalizedPath = node.path.replace(/\\/g, "/");
      if (normalizedPath.includes("/spawned/")) continue;
      appendTaskUpsert(projectDir, playbookName, {
        taskPath: `.converge/journal/${playbookName}/tasks/${node.id}`,
        id: node.id,
        goalId: "inventory",
        summary: node.taskDef.title ?? node.id,
        status: opts?.resume ? undefined : "todo",
        source: "static",
        playbook: playbookName,
        metadata: {
          fromPath: node.path,
          dagType: node.type,
        },
      });
    }
  } catch {
    // Inventory sync must not block execution.
  }

  // Pull previously-CLI-spawned tasks from tasks.jsonl into the DAG so resumed
  // runs see them. Mid-run spawns are picked up after each task completes
  // (see the syncLedgerToDag call inside runTask).
  try {
    await syncLedgerToDag({
      projectDir,
      playbookName: playbook.def.name,
      dag,
      resultsMgr,
      reporter,
    });
  } catch (err: any) {
    reporter?.emit({
      kind: "log",
      level: "warn",
      message: `[ledger-sync] failed to sync spawned tasks: ${err.message}`,
    });
  }

  // After ledger sync, the DAG may have more nodes than resultsMgr was
  // initialized with. Register any DAG-only nodes into resultsMgr so that
  // the select/skip loop can operate on them correctly.
  for (const [id, dagNode] of dag.nodes) {
    const existingStatus = await resultsMgr.getNodeStatus(id);
    if (!existingStatus) {
      let parentId = dagNode.depends_on.find((depId) =>
        resultsMgr.getNodeStatus(depId),
      );
      if (!parentId) {
        const roots = Array.from(dag.nodes.values()).filter(
          (n) => n.depends_on.length === 0,
        );
        parentId = roots[0]?.id;
      }
      if (parentId) {
        const td = dagNode.taskDef;
        await resultsMgr.addSpawnedChildNode(id, parentId, dagNode.depends_on, {
          title: td?.title,
          description: td?.description,
          agent: (td as any)?.agent,
          skill: (td as any)?.skill,
          inputs: td?.inputs,
          outputs: td?.outputs,
          checks: Array.isArray(td?.checks)
            ? td.checks.map((c: any) => ({
                id: c.id,
                cmd: c.cmd,
                description: c.description,
                type: c.type ?? "cmd",
              }))
            : [],
          tags: (td as any)?.tags,
          vars: (td as any)?.vars,
          convergePassthrough: (dagNode as any).convergePassthrough,
          passthrough: (td as any)?.passthrough,
          sourcePath: dagNode.path,
        });
      }
    }
  }

  // Gap-surface dedup set, shared across all surface*Gaps() calls within
  // this run() invocation. Persists across ticks so the same artifact
  // (same mtime) is only logged once. Keys are namespaced (e.g.
  // "definition:..." vs "health-repair:...") so a single Set serves all
  // surface functions.
  const definitionGapsSeen = new Set<string>();
  try {
    await surfaceDefinitionGaps({
      projectDir,
      playbookName: playbook.def.name,
      reporter,
      seen: definitionGapsSeen,
    });
  } catch {
    // Definition-gap surfacing must not block execution.
  }
  try {
    await surfaceHealthRepairGaps({
      projectDir,
      playbookName: playbook.def.name,
      reporter,
      seen: definitionGapsSeen,
    });
  } catch {
    // Health-repair surfacing must not block execution.
  }

  // ── 2.6 Selection (--select) ───────────────────────────────────
  if (opts.select) {
    const { parseSelector } = await import("../select/index.js");
    const { resolveSelector } = await import("../select/resolver.js");

    const manifest = resultsMgr.toManifest();

    // Ensure all DAG nodes are in manifest.nodes so the selector can
    // match them. Nodes not yet executed exist only in the DAG.
    const manifestNodes = manifest.nodes as Record<string, any>;
    for (const [id, node] of dag.nodes) {
      if (!manifestNodes[id]) {
        manifestNodes[id] = {
          id,
          state: "concrete",
          depends_on: [...node.depends_on],
          depended_on_by: [...((node as any).depended_on_by ?? [])],
          seed: null,
          tags: (node.taskDef as any)?.tags,
        };
      }
      manifest.parent_map[id] = [...node.depends_on];
      manifest.child_map[id] = [...((node as any).depended_on_by ?? [])];
    }

    const selector = parseSelector(opts.select);
    const resolved = resolveSelector(selector, manifest as any);

    const selected = new Set(resolved.ids);
    const wasPreviouslySkipped = new Set(resultsMgr.getSkippedTaskIds());

    for (const id of resolved.ids) {
      if (wasPreviouslySkipped.has(id)) await resultsMgr.markPending(id);
    }
    const walkQueue = [...resolved.ids];
    while (walkQueue.length > 0) {
      const id = walkQueue.pop()!;
      const node = dag.nodes.get(id);
      if (!node) continue;
      for (const dep of node.depends_on) {
        if (!selected.has(dep)) {
          selected.add(dep);
          walkQueue.push(dep);
        }
      }
    }

    for (const id of [...selected]) {
      if (!dag.nodes.has(id)) selected.delete(id);
    }

    let skippedCount = 0;
    for (const id of dag.nodes.keys()) {
      if (!selected.has(id)) {
        const st = await resultsMgr.getNodeStatus(id);
        if (!st) continue;
        const safeToSkip =
          !st.status || st.status === "pending" || st.status === "skipped";
        if (safeToSkip) {
          await resultsMgr.markSkipped(id);
          dag.markComplete(id);
          skippedCount++;
        }
      }
    }

    reporter?.emit({
      kind: "select-applied",
      selected: selected.size,
      skipped: skippedCount,
      expression: opts.select,
    });
  }

  // ── 2.7 Dry run ────────────────────────────────────────────────
  _dbg("run:before dryRun check dry=" + opts.dry);
  if (opts.dry) {
    _dbg("run:entering dryRun");
    const pending: string[] = [];
    const cached: string[] = [];
    const skipped: string[] = [];
    for (const id of dag.nodes.keys()) {
      const st = await resultsMgr.getNodeStatus(id);
      const node = dag.nodes.get(id);
      const outputsExist = cacheOutputs(node?.taskDef ?? {}).every(
        (output: string) => existsSync(join(projectDir, output)),
      );
      if (st?.status === "pass" && outputsExist) cached.push(id);
      else if (st?.status === "skipped") skipped.push(id);
      else if (st?.status !== "error") pending.push(id);
    }
    reporter?.emit({ kind: "dry-run", pending, cached, skipped });
    _dbg("run:dryRun returning");
    return {
      runId: "latest",
      completed: 0,
      failed: 0,
      durationMs: Date.now() - runStart,
      nodes: collectNodeStates(dag, resultsMgr),
    };
  }

  // ── 3. Execute ─────────────────────────────────────────────────
  await executionLogger.writeExecutionStart();
  let totalCompleted = 0;
  let totalFailed = 0;
  let blockedTaskId: string | undefined;

  let pass = 0;
  let loopContinuations = 0;
  let consecutiveStalls = 0;
  try {
    while (true) {
      checkAborted(opts.signal);

      if (
        maxDurationMs !== undefined &&
        Number.isFinite(maxDurationMs) &&
        Date.now() - runStart >= maxDurationMs
      ) {
        reporter?.emit({
          kind: "log",
          level: "warn",
          message: `Stopping: maxDuration reached (${maxDurationMs}ms)`,
        });
        break;
      }

      if (pass >= maxDagPasses) {
        reporter?.emit({
          kind: "log",
          level: "warn",
          message: `Stopping: DAG pass safety limit reached (${maxDagPasses})`,
        });
        break;
      }

      const before = statusCounts(dag);
      if (before.pending === 0) break;
      if (blockedTaskId) break;

      // Seed parents can be restored from runstate or become eligible for
      // completion after their spawned descendants finish. Sweep before
      // scheduling so stale `seeded` parents do not leave pending converge
      // nodes permanently blocked.
      let preCompletedSeedParent = true;
      while (preCompletedSeedParent) {
        preCompletedSeedParent = false;
        for (const [seedId, seedNode] of dag.nodes) {
          if (seedNode.status !== "seeded") continue;
          if (isIncrementalSeedNotDone(seedNode)) continue;
          const childIds = seedNode.spawned_children ?? [];
          if (childIds.length === 0) continue;
          const terminalStates = new Set([
            "complete",
            "pass",
            "failed",
            "error",
            "skipped",
          ]);
          const allChildrenDone = childIds.every((childId: string) => {
            const child = dag.nodes.get(childId);
            return child && terminalStates.has(child.status);
          });
          if (!allChildrenDone) continue;

          await resultsMgr.markComplete(seedId, 0);
          dag.markComplete(seedId);
          preCompletedSeedParent = true;
        }
      }

      // A resumed/materialized incremental seed may have its root-converge
      // terminal node marked skipped or complete while the seed parent is
      // re-queued for another cycle. Treat converge passthrough nodes as
      // bookkeeping only; if they are the only thing blocking a pending seed,
      // reset them so the scheduler can reach the seed again instead of
      // reporting a false no-progress stall.
      for (const node of dag.nodes.values()) {
        if (node.type !== "converge" || !node.convergePassthrough) continue;
        const hasPendingDependency = node.depends_on.some((depId: string) => {
          const dep = dag.nodes.get(depId);
          return (
            dep &&
            (dep.status === "pending" ||
              dep.status === "ready" ||
              dep.status === "running" ||
              dep.status === "seeded")
          );
        });
        if (hasPendingDependency && node.status !== "pending") {
          node.status = "pending";
          await resultsMgr.markPending(node.id);
        }
      }

      if (opts.seedOnly && pass > 0) {
        const spawned = [...dag.nodes.values()]
          .filter((n) => n.status === "pending")
          .map((n) => n.id);
        reporter?.emit({
          kind: "log",
          level: "info",
          message: `--seed: stopping before spawned children (${spawned.length} pending): ${spawned.join(", ")}`,
        });
        break;
      }

      const {
        completed,
        failed,
        blocked,
        blockedTaskId: blockedNodeId,
      } = await executeDagWithWorkers(
        dag,
        workerIds,
        resultsMgr,
        async (node, lease) => {
          checkAborted(opts.signal);
          return runTask({
            node,
            projectDir,
            playbookDir,
            maxTaskAttempts,
            resultsMgr,
            checkpointMgr,
            executionLogger,
            dag,
            reporter,
            definitionGapsSeen,
            workerId: lease.workerId,
            leaseId: lease.leaseId,
            stubMode: opts.stubMode,
            skipPreflight: opts.skipPreflight,
            hookRegistry: opts.hookRegistry,
            interceptorRegistry: opts.interceptorRegistry,
          });
        },
        projectDir,
        playbookName,
      );

      // Never break on blocked tasks — they are waiting for inputs that
      // producers will generate. If no human-review tasks are blocked,
      // keep looping so producers can run and satisfy the inputs.
      if (blocked && blockedNodeId) {
        const blockedNode = await resultsMgr.getNodeStatus(blockedNodeId);
        if (blockedNode?.error_message === "Awaiting human review") {
          blockedTaskId = blockedNodeId;
        }
      }

      // A seed/container can become eligible for completion only after a later
      // sibling/child task finishes. Do a parent-completion sweep after each DAG
      // pass so nested seed parents do not remain `seeded` forever and block an
      // outer incremental seed from continuing to the next cycle.
      let completedSeedParent = true;
      while (completedSeedParent) {
        completedSeedParent = false;
        for (const [seedId, seedNode] of dag.nodes) {
          if (seedNode.status !== "seeded") continue;
          if (isIncrementalSeedNotDone(seedNode)) continue;
          const childIds = seedNode.spawned_children ?? [];
          if (childIds.length === 0) continue;
          const terminalStates = new Set([
            "complete",
            "pass",
            "failed",
            "error",
            "skipped",
          ]);
          const allChildrenDone = childIds.every((childId: string) => {
            const child = dag.nodes.get(childId);
            return child && terminalStates.has(child.status);
          });
          if (!allChildrenDone) continue;

          await resultsMgr.markComplete(seedId, 0);
          dag.markComplete(seedId);
          completedSeedParent = true;
        }
      }

      // Re-queue tasks that explicitly requested another pass.
      //
      // Incremental Seed parents are loop drivers: ctx.loop.continue() means
      // "run my newly spawned children, then execute this seed again in this
      // same invocation while maxIterations/maxDuration allow it." Previously the
      // parent stayed seeded/pass after its children completed, so autonomous
      // loops stopped after one epoch and required an external rerun.
      for (const [id, dagNode] of dag.nodes) {
        if (isQueueNotConverged(dagNode)) {
          dagNode.status = "pending";
          dag.resetToPending(id);
          await resultsMgr.markPending(id);
        }

        if (isIncrementalSeedNotDone(dagNode)) {
          const childIds = dagNode.spawned_children ?? [];
          const terminalStates = new Set([
            "complete",
            "pass",
            "failed",
            "error",
            "skipped",
          ]);
          const allSpawnedDone =
            childIds.length === 0 ||
            childIds.every((childId: string) => {
              const child = dag.nodes.get(childId);
              return child && terminalStates.has(child.status);
            });

          if (allSpawnedDone) {
            loopContinuations++;
            if (loopContinuations < 1_000_000) {
              const fp = computeFingerprint(dagNode);
              resultsMgr.setNodeFingerprint(id, fp);
              dagNode.status = "pending";
              dag.resetToPending(id);
              await resultsMgr.markPending(id);
            } else {
              clearIncrementalSeedNotDone(dagNode);
              if (dagNode.status === "pending" || dagNode.status === "seeded") {
                dagNode.status = "complete";
                await resultsMgr.markComplete(id, 0);
              }
              reporter?.emit({
                kind: "log",
                level: "info",
                message: `Stopping: max loop continuations reached (1_000_000)`,
              });
            }
          }
        }

        clearQueueNotConverged(dagNode);
      }

      totalCompleted += completed;
      totalFailed += failed;
      pass++;

      const after = statusCounts(dag);
      const stalled =
        completed === 0 && failed === 0 && after.pending === before.pending;
      if (stalled) {
        consecutiveStalls++;
        reporter?.emit({
          kind: "log",
          level: "warn",
          message: `No DAG progress in pass ${pass} (stall ${consecutiveStalls})`,
        });
        // A human-review block is a deliberate pause, not a transient stall:
        // nothing else can progress until a verdict arrives, and the caller
        // (CLI / Studio) polls the verdict file on a fast cadence. Break out
        // now and hand off — sleeping the stall backoff here would add up to
        // `stallBackoffMs` of latency before the verdict is even checked.
        if (blockedTaskId) break;
        if (stallMaxConsecutive > 0 && consecutiveStalls >= stallMaxConsecutive)
          break;
        if (stallBackoffMs > 0) await sleep(stallBackoffMs);
      } else {
        consecutiveStalls = 0;
      }
    }
  } catch (err) {
    const errName = err instanceof Error ? err.name : "";
    if (err instanceof AbortedError || errName === "AbortError") {
      reporter?.emit({ kind: "run-aborted", reason: "aborted" });
      throw err;
    }
    // DAG runaway guards (StuckRunnerError, RunDurationExceededError)
    // throw clear, named errors. Emit a structured run-aborted event
    // so observers (CI, the doctor command, downstream tooling) see a
    // first-class abort rather than an opaque uncaught exception, then
    // re-throw so the CLI still exits non-zero.
    if (
      errName === "StuckRunnerError" ||
      errName === "RunDurationExceededError"
    ) {
      const message = err instanceof Error ? err.message : String(err);
      reporter?.emit({
        kind: "run-aborted",
        reason: errName === "StuckRunnerError" ? "stuck" : "duration-exceeded",
        message,
      });
      // Best-effort: persist the abort reason so `converge doctor`
      // can show it later without re-deriving from the exception.
      try {
        await resultsMgr.setRunStatus("error");
      } catch {
        /* status update is best-effort here */
      }
      throw err;
    }
    throw err;
  }

  // ── 4. Report ──────────────────────────────────────────────────
  const elapsed = Date.now() - runStart;
  if (blockedTaskId) {
    const message = `Human review required${blockedTaskId ? ` for ${blockedTaskId}` : ""}`;
    reporter?.emit({
      kind: "run-paused",
      reason: "human-review",
      message,
    });
    return {
      runId: "latest",
      completed: totalCompleted,
      failed: totalFailed,
      durationMs: elapsed,
      blocked: true,
      blockedTaskId,
      nodes: collectNodeStates(dag, resultsMgr),
    };
  }

  reporter?.emit({
    kind: "run-complete",
    completed: totalCompleted,
    failed: totalFailed,
    durationMs: elapsed,
  });

  // Derive end-of-run totals from the DAG so the report reflects the
  // full playbook state (executed + cached) rather than only this-run
  // deltas. A fully-cached run otherwise looks identical to a partial
  // failure ("Tasks Completed: 2") even when every task is satisfied.
  const final = statusCounts(dag);
  const tasksTotal = dag.nodes.size;
  const tasksSatisfied = final.complete;
  const tasksCached = Math.max(0, tasksSatisfied - totalCompleted);

  await resultsMgr.setRunStatus(final.failed > 0 ? "error" : "complete");

  await executionLogger.writeExecutionEnd(
    {
      totalIterations: 0,
      tasksCompleted: tasksSatisfied,
      tasksFailed: final.failed,
      gapsResolved: 0,
      convergenceAchieved: final.failed === 0,
      tasksTotal,
      tasksCached,
      tasksExecuted: totalCompleted,
    },
    final.failed > 0 ? "error" : "complete",
  );

  const runResult: RunResult = {
    runId: "latest",
    completed: totalCompleted,
    failed: totalFailed,
    durationMs: elapsed,
    nodes: collectNodeStates(dag, resultsMgr),
  };

  // Fire project lifecycle hooks
  if (opts.hookRegistry) {
    const ctx = { projectDir, playbookName, projectName: playbookName } as any;
    if (totalFailed === 0) {
      await opts.hookRegistry.fire("project:complete", {
        ctx,
        result: runResult,
      } as any);
    } else {
      await opts.hookRegistry.fire("project:fail", {
        ctx,
        error: new Error(`${totalFailed} task(s) failed`),
      } as any);
    }
  }

  return runResult;
}

/* ------------------------------------------------------------------ */
/*  Per-task execution                                                 */
/* ------------------------------------------------------------------ */

export interface RunTaskArgs {
  node: DagNode;
  projectDir: string;
  playbookDir: string;
  maxTaskAttempts: number;
  resultsMgr: RunStateManager;
  checkpointMgr: TaskStateManager;
  executionLogger: ExecutionLogger;
  dag: TaskDag;
  reporter?: Reporter;
  /** Shared dedup set for definition-gap surfacing (see surfaceDefinitionGaps). */
  definitionGapsSeen?: Set<string>;
  workerId?: string;
  leaseId?: string;
  /** RFC 0021: run stub.cmd instead of AI convergence */
  stubMode?: boolean;
  /** Skip pre-flight action nodes (check-outputs-exist, detect-gaps). */
  skipPreflight?: boolean;
  /** Hook registry for lifecycle events. */
  hookRegistry?: HookRegistry;
  /** Interceptor registry for middleware chains. */
  interceptorRegistry?: InterceptorRegistry;
}

/**
 * RFC 0050 — execute ONE node with the full DAG executor machinery (Unit
 * construction, env/exec-dir, `executeTask`, attempts/retries, checks, hooks,
 * status marking, reporter events), outside the worker loop. The code-first
 * flow runtime calls this per step with a synthetic single-node `dag` and a
 * shared `RunStateManager`, so flow steps run identically to DAG tasks and
 * project into `runstate.json`. The DAG-coupled bits (`syncSpawnedToDag`,
 * spawner convergence) are harmless no-ops for a childless single node.
 */
export async function executeSingleNode(args: RunTaskArgs): Promise<NodeResult> {
  return runTask(args);
}

export type { NodeResult } from "../dag/dag-runner.js";

async function runTask(args: RunTaskArgs): Promise<NodeResult> {
  const {
    node,
    projectDir,
    playbookDir,
    resultsMgr,
    checkpointMgr,
    executionLogger,
    dag,
    reporter,
    definitionGapsSeen,
    workerId,
    leaseId,
    stubMode,
    skipPreflight,
    hookRegistry,
    interceptorRegistry,
  } = args;
  const taskId = node.id;

  if (await resultsMgr.isComplete(taskId)) {
    const outputs: string[] = node.taskDef
      ? cacheOutputs(node.taskDef)
      : ((node as any).outputs ?? []);
    const outputsExist =
      outputs.length === 0 ||
      outputs.every((out: string) => existsSync(join(projectDir, out)));
    if (outputsExist) {
      dag.markComplete(taskId);
      await resultsMgr.markComplete(taskId, 0);
      reporter?.emit({ kind: "task-cached", taskId });
      return { success: true };
    }
    reporter?.emit({
      kind: "log",
      level: "warn",
      message: `Cache invalidated for ${taskId}: one or more declared outputs are missing`,
    });
  }

  reporter?.emit({ kind: "task-start", taskId, attempt: 1 });
  if (workerId) {
    reporter?.emit({
      kind: "log",
      level: "info",
      message: `[worker:${workerId}] leased ${taskId}${leaseId ? ` (${leaseId})` : ""}`,
    });
  }

  // ── Passthrough converge node: no body → complete immediately ────
  if (node.convergePassthrough) {
    await resultsMgr.markComplete(taskId, 0);
    reporter?.emit({ kind: "task-complete", taskId, durationMs: 0 });
    return { success: true };
  }

  // ── Code-defined fast path ─────────────────────────────────────
  // Tasks built via `taskDef().executor(fn).build()` carry the JS
  // function on `taskDef.executorFn`. For these tasks (which have no
  // on-disk TASK.md and don't need an LLM agent), invoke the function
  // directly — the full Unit/executeTask pipeline expects filesystem
  // context (epicId, journalTaskId, parent chain) that doesn't apply
  // to a pure JS function.
  //
  // The synthesized context is a superset of the minimum needed:
  //   - `spawn(child)` — emit a single drafted child summary the
  //     studio renders in its review surface (and the runtime
  //     records as a spawned child). Used by the planner-playbook's
  //     parse-plan task.
  //   - `report(event)` — escape hatch to emit a `RunEvent` directly
  //     through the reporter. Lets executors push structured progress
  //     beyond the built-in lifecycle events.
  //   - `vars` — the playbook's `inputs` resolved to strings.
  const isVirtualPath =
    typeof node.path === "string" && node.path.startsWith("<virtual:");
  const executorFn = (node.taskDef as any).executorFn;
  if (isVirtualPath && typeof executorFn === "function") {
    const fastStart = Date.now();
    const spawnedChildren: { id: string; title?: string }[] = [];
    try {
      const fakeCtx: any = {
        projectDir,
        task: { id: taskId, title: node.taskDef.title, iteration: 0 },
        vars: node.taskDef.vars ?? {},
        log: {
          info: (msg: string) =>
            reporter?.emit({
              kind: "log",
              level: "info",
              message: `[${taskId}] ${msg}`,
            }),
          warn: (msg: string) =>
            reporter?.emit({
              kind: "log",
              level: "warn",
              message: `[${taskId}] ${msg}`,
            }),
          error: (msg: string) =>
            reporter?.emit({
              kind: "log",
              level: "error",
              message: `[${taskId}] ${msg}`,
            }),
        },
        /**
         * Record a drafted child task. Triggers a `children-spawned`
         * event when the executor returns. The studio's review UI
         * reads these to populate its task list.
         */
        spawn(child: { id: string; title?: string }): void {
          if (!child || !child.id) return;
          spawnedChildren.push({ id: child.id, title: child.title });
        },
        /**
         * Emit a custom `RunEvent` through the active reporter. Use
         * sparingly — prefer the typed lifecycle events.
         */
        report(event: RunEvent): void {
          reporter?.emit(event);
        },
      };
      await executorFn(fakeCtx);
      if (spawnedChildren.length > 0) {
        reporter?.emit({
          kind: "children-spawned",
          parentId: taskId,
          children: spawnedChildren,
        });
      }
      const dur = Date.now() - fastStart;
      await resultsMgr.markComplete(taskId, dur, {
        title: node.taskDef.title,
        description: node.taskDef.description,
      });
      reporter?.emit({ kind: "task-complete", taskId, durationMs: dur });
      return { success: true };
    } catch (err: any) {
      const dur = Date.now() - fastStart;
      await resultsMgr.markFailed(taskId, err.message ?? String(err), dur);
      reporter?.emit({
        kind: "task-failed",
        taskId,
        error: err.message ?? String(err),
        durationMs: dur,
      });
      return { success: false };
    }
  }

  // ── Task unit construction ───────────────────────────────────────
  // Prefer task content from runstate.json (embedded at compile time).
  // Spawned tasks live at .converge/journal/<playbook>/tasks/<taskId>/TASK.md.
  // Check journal path first (spawned tasks), then playbook path (static tasks).
  const journalTaskPath = join(
    projectDir,
    ".converge",
    "journal",
    process.env.CONVERGE_PLAYBOOK ?? "",
    "tasks",
    taskId,
    "TASK.md",
  );
  const playbookTaskPath = join(playbookDir, "tasks", taskId, "TASK.md");
  const absPath = isVirtualPath
    ? node.path
    : node.path && existsSync(node.path)
      ? node.path
      : node.path && existsSync(join(projectDir, node.path))
        ? join(projectDir, node.path)
        : existsSync(journalTaskPath)
          ? journalTaskPath
          : playbookTaskPath;

  const tdPrompt = node.taskDef.prompt;
  const tdBody = (node.taskDef as any).body;
  const tdVars = node.taskDef.vars;

  let unit: Unit;
  if (tdPrompt || tdBody) {
    // Ensure passthrough from taskDef is carried through
    const taskDefWithPassthrough = {
      ...node.taskDef,
      passthrough: node.taskDef.passthrough,
    };
    unit = Unit.fromDefinition(
      taskDefWithPassthrough as any,
      null as any,
      absPath,
    );
  } else if (!isVirtualPath && existsSync(absPath)) {
    unit = await Unit.fromPath(absPath);
    // RFC 0031: For spawned template tasks, the node's taskDef has params
    // already merged into vars by syncLedgerToDag. Override the unit's
    // vars (which came from the template file with empty defaults).
    if (tdVars && typeof tdVars === "object" && unit.vars !== tdVars) {
      unit.vars = { ...unit.vars, ...tdVars };
    }
    // Also copy interpolated outputs from node if the template has raw placeholders
    // (e.g. {{screenId}}). The DAG node's top-level outputs have params applied
    // by the resume path (or syncLedgerRowToDag), while node.taskDef may be null.
    const resolvedOutputs = node.taskDef?.outputs ?? (node as any).outputs;
    if (resolvedOutputs && Array.isArray(resolvedOutputs)) {
      unit.outputs = resolvedOutputs;
    }
    // Also copy passthrough from node if it's set
    if ((node as any).passthrough !== undefined) {
      unit.passthrough = (node as any).passthrough;
    }
  } else {
    // RFC 0036: Structured skip events with actionable diagnostics
    const taskPath = node.path || absPath;
    let reason: string;
    let detail: string;
    let suggestion: string;

    // Determine the specific failure reason
    if (isVirtualPath) {
      reason = "hollow-node";
      detail = `Runstate node has no source_path or taskDef content`;
      suggestion = `Delete runstate and re-run: converge clean`;
    } else if (!tdPrompt && !tdBody && !existsSync(absPath)) {
      // Check if this is a template-based task
      const taskRef = (node as any).taskRef;
      if (taskRef?.kind === "template") {
        reason = "missing-instance-file";
        detail = `Expected TASK.md at ${absPath} but not found`;
        suggestion = `Run: converge task add ${taskId} --template ${taskRef.name}`;
      } else {
        reason = "missing-instance-file";
        detail = `Expected TASK.md at ${absPath} but not found`;
        suggestion = `Create TASK.md at ${absPath} or check task definition`;
      }
    } else {
      reason = "no-content";
      detail = `No task content (prompt/body) and no TASK.md found`;
      suggestion = `Add content to TASK.md or check task definition`;
    }

    reporter?.emit({
      kind: "task-skipped",
      taskId,
      taskPath,
      reason,
      detail,
      suggestion,
    } as any);
    if (hookRegistry) {
      await hookRegistry.fire("task:skip", {
        ctx: { taskId, taskTitle: taskId, projectDir },
        reason: `${reason}: ${detail}`,
      } as any);
    }
    await resultsMgr.markSkipped(taskId);
    return { success: true };
  }

  const taskDef = node.taskDef;
  const taskStart = Date.now();

  // Expose this task's journal directory to child processes (the AI runs and
  // any shell commands it executes) so `converge spawn` can record the
  // parent linkage when the body invokes it.
  const prevTaskPathEnv = process.env.CONVERGE_CURRENT_TASK_PATH;
  const prevWorkerIdEnv = process.env.CONVERGE_WORKER_ID;
  const prevTaskDirEnv = process.env.CONVERGE_TASK_DIR;
  process.env.CONVERGE_CURRENT_TASK_PATH = `.converge/journal/${
    process.env.CONVERGE_PLAYBOOK ?? "default"
  }/tasks/${taskId}`;
  if (workerId) process.env.CONVERGE_WORKER_ID = workerId;

  // RFC 0021 — per-task execution directory. Stable across attempts,
  // exists before the body runs, owned by this task. Spawn manifests,
  // retry context, EVIDENCE files, and arbitrary scratch all live here.
  {
    const { ensureExecDir } = await import("../task/spawn/exec-dir.ts");
    const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";
    try {
      const abs = await ensureExecDir(projectDir, playbookName, taskId);
      process.env.CONVERGE_TASK_DIR = abs;
    } catch {
      // Best-effort — if mkdir fails (rare: read-only mount), the body
      // can still resolve the path itself. Don't block task execution.
    }
  }

  try {
    // Closure capturing `dag` + `resultsMgr` so repair strategies (notably
    // TaskRunStrategy) can sync newly-spawned children into the live DAG
    // mid-strategy instead of waiting for the next outer iteration.
    // Closes the TODO at navigator/repair/strategies/task-run.ts:368.
    const syncSpawnedToDag = async (): Promise<void> => {
      await syncLedgerToDag({
        projectDir,
        playbookName: process.env.CONVERGE_PLAYBOOK ?? "default",
        dag,
        resultsMgr,
        reporter,
      });
    };
    // RFC 0031: Inject CONVERGE_VAR_* from the DagNode's taskDef.vars
    // (which has params merged in for spawned template tasks via
    // syncLedgerToDag) BEFORE the Unit's file-based var loading runs.
    if (taskDef.vars && typeof taskDef.vars === "object") {
      for (const k of Object.keys(process.env)) {
        if (k.startsWith("CONVERGE_VAR_")) delete process.env[k];
      }
      for (const [key, value] of Object.entries(taskDef.vars)) {
        if (value === undefined || value === null) continue;
        process.env[`CONVERGE_VAR_${key.toUpperCase()}`] = String(value);
      }
    }

    const result = await executeTask(unit, checkpointMgr, executionLogger, {
      syncSpawnedToDag,
      stubMode,
      skipPreflight,
      interceptorRegistry,
    });

    if (result.inputGateUnmet) {
      const blockedCompletionData: CompletionData = {
        title: taskDef.title,
        description: taskDef.description,
        agent: taskDef.agent,
        skill: taskDef.skill,
      };
      await resultsMgr.markBlocked(
        taskId,
        "Waiting for inputs",
        0,
        blockedCompletionData,
      );
      return {
        success: false,
        blocked: true,
        completionData: blockedCompletionData,
      };
    }

    if (result.blocked) {
      // Set by execute-task when the body produced its declared outputs
      // (and checks passed) but the human-review gate is holding the
      // task. Mark blocked — NOT failed — so the runner's outer loop
      // can wait for the verdict instead of recording a failure.
      const blockedCompletionData: CompletionData = {
        title: taskDef.title,
        description: taskDef.description,
        agent: taskDef.agent,
        skill: taskDef.skill,
      };
      await resultsMgr.markBlocked(
        taskId,
        "Awaiting human review",
        Date.now() - taskStart,
        blockedCompletionData,
      );
      return {
        success: false,
        blocked: true,
        completionData: blockedCompletionData,
      };
    }

    // Propagate re-queue flags to the DAG node so the outer loop can reset
    // tasks that need another pass (incremental seed, queue materialization).
    const shouldKeepIncrementalSeedPending =
      result.isWbsTask && result._incrementalSeedNotDone === true;
    setIncrementalSeedNotDone(node, result._incrementalSeedNotDone === true);
    setQueueNotConverged(node, result._queueNotConverged === true);

    const attemptData = await gatherAttemptData(
      unit,
      projectDir,
      result.attemptNumber,
      taskDef.outputs,
    );

    const completionData: CompletionData = {
      title: taskDef.title,
      description: taskDef.description,
      agent: taskDef.agent,
      skill: taskDef.skill,
      check_results: attemptData.check_results,
      output_hashes: attemptData.output_hashes,
    };

    // Register spawned children in runstate from seed.json.
    // The seed executor writes seed.json with spawned child metadata —
    // we read it and register children directly. No filesystem scanning.
    await registerSpawnedChildren({
      taskId,
      taskPath: node.path,
      resultsMgr,
      dag,
      reporter,
    });
    await syncLedgerToDag({
      projectDir,
      playbookName: process.env.CONVERGE_PLAYBOOK ?? "default",
      dag,
      resultsMgr,
      reporter,
    });
    if (definitionGapsSeen) {
      try {
        await surfaceDefinitionGaps({
          projectDir,
          playbookName: process.env.CONVERGE_PLAYBOOK ?? "default",
          reporter,
          seen: definitionGapsSeen,
        });
      } catch {
        // Surfacing must not block execution.
      }
      try {
        await surfaceHealthRepairGaps({
          projectDir,
          playbookName: process.env.CONVERGE_PLAYBOOK ?? "default",
          reporter,
          seen: definitionGapsSeen,
        });
      } catch {
        // Surfacing must not block execution.
      }
    }

    // Transition seeded parents whose children have all completed (RFC 0020).
    // Wrapped in own try/catch: errors here must not cascade to the
    // current task's success/failure status.
    try {
      await convergeSpawnerParents(dag, {
        onConverge: async (nid) => {
          await resultsMgr.markComplete(nid, 0);
          const childCount =
            (dag.nodes.get(nid)?.spawned_children?.length ?? 0) +
            (dag.nodes.get(nid)?.children?.length ?? 0);
          console.log(
            "   ✅ Container converged: " +
              nid +
              " (" +
              childCount +
              " children done)",
          );
        },
      });
    } catch (err: any) {
      reporter?.emit({
        kind: "log",
        level: "warn",
        message: `Seeded-parent convergence failed (non-fatal): ${err.message}`,
      });
    }

    if (result.success) {
      if (result.isWbsTask) {
        await registerSpawnedChildren({
          taskId,
          taskPath: node.path,
          resultsMgr,
          dag,
          reporter,
        });
        await syncLedgerToDag({
          projectDir,
          playbookName: process.env.CONVERGE_PLAYBOOK ?? "default",
          dag,
          resultsMgr,
          reporter,
        });
        if (definitionGapsSeen) {
          try {
            await surfaceDefinitionGaps({
              projectDir,
              playbookName: process.env.CONVERGE_PLAYBOOK ?? "default",
              reporter,
              seen: definitionGapsSeen,
            });
          } catch {
            // Surfacing must not block execution.
          }
          try {
            await surfaceHealthRepairGaps({
              projectDir,
              playbookName: process.env.CONVERGE_PLAYBOOK ?? "default",
              reporter,
              seen: definitionGapsSeen,
            });
          } catch {
            // Surfacing must not block execution.
          }
        }
        // Unified completion rule (RFC 0049): a parent with any
        // children — static-nested or runtime-spawned — goes `seeded`
        // and waits for them. A 0-child node completes immediately.
        const hasChildren =
          (node.spawned_children?.length ?? 0) > 0 ||
          dag.childrenOf(taskId).length > 0;
        if (hasChildren) {
          // Seed parent: mark as seeded — stays blocked until children complete
          await resultsMgr.markSeeded(taskId);
          node.status = "seeded";
        } else {
          // Explicit zero-spawn stop for incremental seeds.
          await resultsMgr.markComplete(
            taskId,
            Date.now() - taskStart,
            completionData,
          );
        }
      } else {
        await resultsMgr.markComplete(
          taskId,
          Date.now() - taskStart,
          completionData,
        );
      }
      if (shouldKeepIncrementalSeedPending) {
        setIncrementalSeedNotDone(node, true);
      }

      reporter?.emit({
        kind: "task-complete",
        taskId,
        durationMs: Date.now() - taskStart,
      });
    } else {
      const errorMessage =
        result.errorKind === "structural"
          ? `[structural] ${taskDef.title ?? taskId} failed`
          : (result.errorReason ?? "Task failed");
      await resultsMgr.markFailed(
        taskId,
        errorMessage,
        Date.now() - taskStart,
        completionData,
      );
      reporter?.emit({
        kind: "task-failed",
        taskId,
        error: errorMessage,
        durationMs: Date.now() - taskStart,
      });
    }
    return { success: result.success, completionData };
  } catch (err: any) {
    await resultsMgr.markFailed(taskId, err.message, Date.now() - taskStart);
    reporter?.emit({
      kind: "task-failed",
      taskId,
      error: err.message,
      durationMs: Date.now() - taskStart,
    });
    return { success: false };
  } finally {
    if (prevTaskPathEnv === undefined) {
      delete process.env.CONVERGE_CURRENT_TASK_PATH;
    } else {
      process.env.CONVERGE_CURRENT_TASK_PATH = prevTaskPathEnv;
    }
    if (prevWorkerIdEnv === undefined) {
      delete process.env.CONVERGE_WORKER_ID;
    } else {
      process.env.CONVERGE_WORKER_ID = prevWorkerIdEnv;
    }
    if (prevTaskDirEnv === undefined) {
      delete process.env.CONVERGE_TASK_DIR;
    } else {
      process.env.CONVERGE_TASK_DIR = prevTaskDirEnv;
    }
  }
}
/**
 * Legacy registration path that consumed `seed.json` written by the
 * deleted SeedExecutor. The seed system is gone (RFC 0021/0022) — child
 * registration now flows through `applyManifest()` and the runtime
 * ledger. This function early-returns when no `seed.json` exists, which
 * is always true on the new path; it is kept as a defensive no-op for
 * pre-existing `seed.json` files in older journal directories.
 */
async function registerSpawnedChildren(args: {
  taskId: string;
  taskPath?: string;
  resultsMgr: RunStateManager;
  dag: TaskDag;
  reporter?: Reporter;
}): Promise<void> {
  const { taskId, taskPath, resultsMgr, dag, reporter } = args;
  // Try deterministic journal candidates for a legacy seed.json file.
  // Returns early when none exists, which is the steady-state today.
  let seedJsonPath = "";
  for (const candidate of journalTaskDirCandidatesForNode(
    resultsMgr,
    taskId,
    taskPath,
  )) {
    const p = join(candidate, "seed.json");
    if (existsSync(p)) {
      seedJsonPath = p;
      break;
    }
  }
  if (!seedJsonPath) return;

  let seedData: any;
  try {
    seedData = JSON.parse(readFileSync(seedJsonPath, "utf-8"));
  } catch {
    return;
  }
  const subtasks: Array<{ id: string; writeToPath: string }> =
    seedData.subtasks ?? [];
  if (subtasks.length === 0) return;

  const spawnedIds: string[] = [];
  const spawnedSummaries: { id: string; title?: string }[] = [];

  for (const subtask of subtasks) {
    const childId = subtask.id;
    const childTaskMd = join(
      resultsMgr.executionDir,
      subtask.writeToPath.replace(/^\.converge\/journal\/[^/]+\//, ""),
    );
    if (!existsSync(childTaskMd)) continue;

    try {
      const childRaw = readFileSync(childTaskMd, "utf-8");
      const { parseTaskMdString, mapTaskMdToTaskDefinition } =
        await import("../config/task-md-definition.js");
      const childParsed = parseTaskMdString(childRaw);
      const mappedTaskDef = mapTaskMdToTaskDefinition(
        childParsed,
        childParsed.body ?? "",
        childId,
        dirname(childTaskMd),
      );
      const explicitDeps = mappedTaskDef.depends_on ?? [];
      mappedTaskDef.depends_on =
        explicitDeps.length > 0 ? explicitDeps : [taskId];

      const childNode: DagNode = {
        id: childId,
        type: "normal",
        // RFC 0049 Phase B: `parent` is the inventory hierarchy source. The
        // legacy `parents: string[]` is kept for the seed-spawn wiring in
        // addNode(), but `TaskDag.childrenOf(taskId)` and
        // `TaskDag.registerSpawnedChild` are now the single source of truth.
        parent: taskId,
        parents: mappedTaskDef.depends_on?.includes(taskId) ? [taskId] : [],
        children: [],
        spawned_children: [],
        depends_on: mappedTaskDef.depends_on ?? [taskId],
        depended_on_by: [],
        taskDef: mappedTaskDef,
        path: childTaskMd,
        status: "pending",
        virtual: false,
      };
      const existingChild = dag.nodes.get(childId);
      if (existingChild) {
        existingChild.taskDef = mappedTaskDef;
        existingChild.path = childTaskMd;
        existingChild.depends_on = childNode.depends_on;
        existingChild.parents = childNode.parents;
        existingChild.virtual = false;
      } else {
        dag.addNode(childNode);
        // Belt-and-braces: addNode already registered the child under its
        // parent, but if `parents` was empty (unusual for a runtime spawn
        // but possible for template-spawned children that don't depend on
        // the seed), this call still wires the hierarchy. Idempotent.
        dag.registerSpawnedChild(taskId, childId);
      }

      await resultsMgr.addSpawnedChildNode(
        childId,
        taskId,
        mappedTaskDef.depends_on ?? [taskId],
        {
          title: mappedTaskDef.title ?? childId,
          description: mappedTaskDef.description,
          inputs: mappedTaskDef.inputs ?? [],
          outputs: mappedTaskDef.outputs ?? [],
          checks: (Array.isArray(mappedTaskDef.checks)
            ? mappedTaskDef.checks
            : []
          ).map((c: any) => ({
            id: c.id ?? "",
            description: c.description ?? "",
            cmd: c.cmd ?? "",
          })),
          tags: mappedTaskDef.tags,
          vars: mappedTaskDef.vars,
          sourcePath: childTaskMd,
        },
      );

      spawnedIds.push(childId);
      spawnedSummaries.push({ id: childId, title: mappedTaskDef.title });
    } catch (err: any) {
      reporter?.emit({
        kind: "log",
        level: "warn",
        message: "[seed] failed to register " + childId + ": " + err.message,
      });
    }
  }

  if (spawnedIds.length > 0) {
    await resultsMgr.addSpawnedChildren(taskId, spawnedIds);
    reporter?.emit({
      kind: "children-spawned",
      parentId: taskId,
      children: spawnedSummaries,
    });
  }
}
/**
 * Workspace scan for `HEALTH_REPAIR.json` sidecars left by the
 * task-completion health-check hook (navigator/repair/health-checks.ts)
 * when the model flagged a just-completed task as needing repair.
 *
 * These sidecars used to be a dead-end: the hook wrote `HEALTH_CHECK_ISSUES`
 * journal events but had no way to reach the repair pipeline (no
 * `ctx.repairPipeline` exists in the hook context). Surfacing them as
 * `check-failed` gaps via this function closes that loop —
 * SkillBasedRepairStrategy claims them through its existing routing.
 *
 * Idempotent + mtime-keyed: same `seen` set as definition-gaps to keep
 * the diagnostic log tidy across ticks.
 */
async function surfaceHealthRepairGaps(args: {
  projectDir: string;
  playbookName: string;
  reporter?: Reporter;
  seen: Set<string>;
}): Promise<void> {
  const { projectDir, playbookName, reporter, seen } = args;
  if (!reporter) return;
  let findings: Awaited<
    ReturnType<
      typeof import("../task/gap/health-repair-gaps.js").findHealthRepairGaps
    >
  >;
  try {
    const mod = await import("../task/gap/health-repair-gaps.js");
    findings = await mod.findHealthRepairGaps(projectDir, playbookName);
  } catch {
    return;
  }
  for (const f of findings) {
    const dedupKey = `health-repair:${f.evidence.taskId}@${f.sidecarMtimeMs}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    reporter.emit({
      kind: "log",
      level: "warn",
      message:
        `health-repair: ${f.evidence.taskId} (${f.evidence.confidence}-confidence) — ` +
        `${f.evidence.issues.length} anomal${f.evidence.issues.length === 1 ? "y" : "ies"} flagged ` +
        `(top severity: ${f.gap.severity}). Repair via SkillBasedRepairStrategy.`,
    });
  }
}

/**
 * Workspace scan for `TASK.md.rejected` + `TASK.md.EVIDENCE.json` pairs
 * left by the spawn-time gate when a child's frontmatter failed to parse.
 *
 * These rejected files used to require a manual `converge doctor` run to
 * surface — meaning the navigator's self-repair flow could never trigger
 * on them automatically. Calling this on every tick closes that loop: each
 * fresh rejection is reported as a structured `definition-gap` event, the
 * navigator sees it (via the reporter sink that backs gap collection),
 * and the SkillBasedRepairStrategy claims it through its `definition`
 * gapKind entry.
 *
 * Idempotent + mtime-keyed: each rejected file is reported once per
 * mtime, tracked via the supplied `seen` set so repeated ticks don't
 * spam the same diagnostic. The set persists across ticks of a single
 * `run()` invocation.
 */
async function surfaceDefinitionGaps(args: {
  projectDir: string;
  playbookName: string;
  reporter?: Reporter;
  seen: Set<string>;
}): Promise<void> {
  const { projectDir, playbookName, reporter, seen } = args;
  if (!reporter) return;
  let findings: Awaited<
    ReturnType<
      typeof import("../task/gap/definition-gaps.js").findDefinitionGaps
    >
  >;
  try {
    const mod = await import("../task/gap/definition-gaps.js");
    findings = await mod.findDefinitionGaps(projectDir, playbookName);
  } catch {
    return;
  }
  for (const f of findings) {
    // mtime-keyed dedup: same file at same mtime = same diagnostic.
    const dedupKey = `${f.evidence.rejectedPath}@${f.rejectedMtimeMs}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    reporter.emit({
      kind: "log",
      level: "warn",
      message:
        `definition-gap: ${f.gap.metadata?.taskId ?? "unknown"} — ` +
        `TASK.md frontmatter unparseable (${f.evidence.parseError}). ` +
        `Evidence at ${f.evidence.rejectedPath}; repair via SkillBasedRepairStrategy.`,
    });
  }
}
import {
  computeOutputHashes,
  readCheckResults,
  gatherAttemptData,
  computeFingerprint,
  collectNodeStates,
} from "./helpers.js";
