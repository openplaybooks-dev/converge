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

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";


import { runDag } from "./dag/dag-runner.js";
import type { DagNode } from "./dag/dag-node.js";
import type { NodeResult } from "./dag/dag-runner.js";
import { TaskDag } from "./dag/task-dag.js";
import type { TaskDefinition } from "./config/task-definition.js";
import { executeTask } from "./run/execute-task.js";
import { Unit } from "./task/unit/unit.js";
import {
  RunStateManager,
  writeJournalManifest,
} from "./manifest/index.js";
import { buildDagFromPlaybookObject, injectRootNodes, splitContainerNodes } from "./manifest/build-dag.js";
import { discoverStaticChildren } from "./task/discovery/static-children.js";
import { ExecutionLogger } from "./journal/execution-logger.js";
import { getTargetDir } from "./journal/structure.js";
import { TaskStateManager } from "./checkpoint/state.js";
import type {
  CompletionData,
  CheckResultItem,
} from "./manifest/types.js";

import type { Playbook } from "./playbook.js";
import type { LoaderError } from "./config/declarative-loader.js";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export type RunEvent =
  | { kind: "run-start"; playbook: string; runId: string; projectDir: string }
  | { kind: "compile-start" }
  | { kind: "compile-complete"; nodeCount: number; cachedCount: number }
  | { kind: "compile-error"; errors: { type: string; message: string }[] }
  | { kind: "select-applied"; selected: number; skipped: number; expression: string }
  | { kind: "dry-run"; pending: string[]; cached: string[]; skipped: string[] }
  | { kind: "task-start"; taskId: string; attempt: number }
  | { kind: "task-cached"; taskId: string }
  | { kind: "task-skipped"; taskId: string; reason: string }
  | { kind: "task-complete"; taskId: string; durationMs: number }
  | { kind: "task-failed"; taskId: string; error: string; durationMs: number }
  | {
      kind: "children-spawned";
      parentId: string;
      children: { id: string; title?: string }[];
    }
  | { kind: "log"; level: "info" | "warn" | "error"; message: string }
  | {
      kind: "run-complete";
      completed: number;
      failed: number;
      durationMs: number;
    }
  | { kind: "run-aborted"; reason: string };

export interface Reporter {
  emit(event: RunEvent): void;
}

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
  /** Force re-run all tasks, skip fingerprint comparison. */
  fullRefresh?: boolean;
  /** Compile + emit `dry-run` event, don't execute. */
  dry?: boolean;
  /** Stop after the static DAG completes — don't execute spawned children. */
  seedOnly?: boolean;
  /** Concurrency within a topological layer. Default 1 (sequential). */
  concurrency?: number;
  /** Per-task attempt cap before giving up. */
  maxTaskAttempts?: number;
  /** Structured event sink. Drop events when omitted. */
  reporter?: Reporter;
  /** Cancel mid-run. Throws AbortError. */
  signal?: AbortSignal;
}

export interface RunResult {
  runId: string;
  completed: number;
  failed: number;
  durationMs: number;
  nodes: Array<{
    id: string;
    status: "completed" | "failed" | "skipped" | "cached";
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
          for (const err of e.errors) console.error(`  [${err.type}] ${err.message}`);
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
          if (e.cached.length > 0) console.error(`  Cached (skip): ${e.cached.join(", ")}`);
          if (e.pending.length > 0) console.error(`  Will run:      ${e.pending.join(", ")}`);
          if (e.skipped.length > 0) console.error(`  Skipped:       ${e.skipped.join(", ")}`);
          if (e.pending.length === 0 && e.cached.length === 0 && e.skipped.length === 0) {
            console.error("  (all tasks pending — nothing cached or skipped)");
          }
          console.error(`\n  Dry run — ${e.pending.length} task(s) would execute.`);
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
        ? join(resultsMgr.executionDir, fromRunstate.replace(/^\.converge\/journal\/[^/]+\//, ""))
        : join(resultsMgr.executionDir, fromRunstate),
    );
  }

  if (taskPath) {
    const normalized = taskPath.replace(/\\/g, "/");
    if (normalized.includes("/.converge/journal/")) {
      const direct = normalized.endsWith("/TASK.md") ? dirname(normalized) : normalized;
      push(direct);
      // SeedExecutor journals spawned task IDs as parent/id, while the
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

function statusCounts(dag: TaskDag): { pending: number; failed: number; complete: number } {
  let pending = 0;
  let failed = 0;
  let complete = 0;
  for (const node of dag.nodes.values()) {
    if (node.status === "pending" || node.status === "ready" || node.status === "running" || node.status === "seeded") pending++;
    else if (node.status === "failed") failed++;
    else if (node.status === "complete" || node.status === "pass") complete++;
  }
  return { pending, failed, complete };
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
  const reporter = opts.reporter;
  const projectDir = opts.projectDir;
  const playbookName = playbook.def.name;
  const playbookDir = opts.playbookDir ?? playbook.dir ?? projectDir;
  const runConfig = playbook.def.run;
  const maxTaskAttempts = opts.maxTaskAttempts ?? runConfig?.maxTaskAttempts ?? 3;
  const maxIterations = runConfig?.maxIterations ?? 1_000_000;
  const maxDagPasses = Math.max(maxIterations * 20, maxIterations);
  const maxDurationMs = runConfig?.maxDuration;
  const stallMaxConsecutive = runConfig?.stall?.maxConsecutive ?? 2;
  const stallBackoffMs = runConfig?.stall?.backoffMs ?? 30_000;

  const runStart = Date.now();

  // ── 1. Compile ──────────────────────────────────────────────────
  reporter?.emit({ kind: "compile-start" });
  checkAborted(opts.signal);

  const targetDir = getTargetDir(projectDir, playbookName);
  mkdirSync(targetDir, { recursive: true });

  const { dag, errors, playbookHash } = await compilePlaybook(
    playbook, playbookDir, playbookName, targetDir, projectDir,
  );

  if (errors.length > 0) {
    reporter?.emit({
      kind: "compile-error",
      errors: errors.map((e) => ({ type: e.type, message: e.message })),
    });
    if (errors.some((e) => e.type === "cycle")) {
      throw new Error("DAG has dependency cycles — cannot execute.");
    }
  }
  dag.playbookName = playbookName;

  reporter?.emit({
    kind: "run-start",
    playbook: playbookName,
    runId: "latest",
    projectDir,
  });

  const resultsMgr = new RunStateManager(
    targetDir,
    dag,
    playbookHash,
    projectDir,
  );

  if (opts.resume) {
    const state = await resultsMgr.getStateSnapshot();
    for (const [id, rsNode] of Object.entries(state.dag.nodes)) {
      const existingNode = dag.nodes.get(id);
      if (existingNode) {
        existingNode.spawned_children = rsNode.spawned_children ?? existingNode.spawned_children ?? [];
        existingNode.depended_on_by = rsNode.depended_on_by ?? existingNode.depended_on_by;
        existingNode.status =
          rsNode.status === "pass"
            ? "complete"
            : rsNode.status === "error"
              ? "failed"
              : rsNode.status === "running"
                ? "pending"
                : rsNode.status === "skipped"
                  ? "complete"
                  : rsNode.status === "seeded"
                    ? "seeded"
                    : "pending";
        continue;
      }
      if (!dag.nodes.has(id)) {
        // Reconstruct the TASK.md path from runstate data.
        // Spawned children: {playbookDir}/tasks/{parentId}/spawned/{childId}/TASK.md
        let taskMdPath = rsNode.source_path ?? "";
        if (!taskMdPath && rsNode.journal_path) {
          const rel = rsNode.journal_path.replace(/^\.converge\/journal\/[^/]+\//, "");
          taskMdPath = join(targetDir, rel, "TASK.md");
        }
        if (!taskMdPath && rsNode.from_seed) {
          taskMdPath = join(targetDir, "tasks", rsNode.from_seed, "spawned", id, "TASK.md");
        }
        // Load full taskDef from the TASK.md to get seeds, inputs, outputs, checks
        let taskDef: TaskDefinition = {
          id,
          title: rsNode.title,
          description: rsNode.description,
          inputs: rsNode.inputs ?? [],
          outputs: rsNode.outputs ?? [],
          checks: rsNode.checks as any,
        };
        if (taskMdPath && existsSync(taskMdPath)) {
          const raw = readFileSync(taskMdPath, "utf-8");
          const { parseTaskMdString, mapTaskMdToTaskDefinition } = await import("./config/task-md-definition.js");
          const parsed = parseTaskMdString(raw);
          const mapped = mapTaskMdToTaskDefinition(parsed, parsed.body ?? "", id, dirname(taskMdPath));
          taskDef = {
            ...mapped,
            id,
            title: mapped.title ?? rsNode.title ?? id,
            description: mapped.description ?? rsNode.description,
            depends_on: mapped.depends_on ?? rsNode.depends_on ?? [],
            blocking: true,
          };
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
          status:
            rsNode.status === "pass"
              ? "complete"
              : rsNode.status === "error"
                ? "failed"
                : "pending",
          virtual: false,
        });
      }
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
        if (cnode.type === "converge" && (parentNode.spawned_children ?? []).includes(id)) {
          if (!cnode.depends_on.includes(id)) {
            cnode.depends_on.push(id);
          }
        }
      }
    }
  }

  await writeJournalManifest(targetDir, resultsMgr.toManifest());

  const checkpointMgr = new TaskStateManager(projectDir);

  const executionLogger = new ExecutionLogger(
    projectDir,
    playbookName,
    { maxIterations: 0, maxAttemptsPerTask: maxTaskAttempts },
    playbookName,
  );

  // ── 2.5 Change detection — compare against previous runstate ─────
  let cachedCount = 0;

  if (!opts.resume && !opts.fullRefresh) {
    const fingerprints = new Map<string, string>();
    for (const [id, node] of dag.nodes) {
      const fp = computeFingerprint(node);
      fingerprints.set(id, fp);
      resultsMgr.setNodeFingerprint(id, fp);
    }

    // Load previous runstate from target directory (prev run)
    const prevState = resultsMgr.loadPrevRunState();

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
            const upstreamChanged = node.depends_on.some((dep) =>
              changed.has(dep),
            );
            if (!upstreamChanged) {
              await resultsMgr.markCached(node.id, fp, priorNode);
              cachedCount++;
              continue;
            }
          }
          changed.add(node.id);
        }
      }
    }

    await resultsMgr.persist();
  } else if (opts.resume) {
    cachedCount = await resultsMgr.getCompletedCount();
  }

  reporter?.emit({
    kind: "compile-complete",
    nodeCount: dag.nodes.size,
    cachedCount,
  });

  // ── 2.6 Selection (--select) ───────────────────────────────────
  if (opts.select) {
    const { parseSelector } = await import("./select/index.js");
    const { resolveSelector } = await import("./select/resolver.js");

    const manifest = resultsMgr.toManifest();

    for (const [id, node] of dag.nodes) {
      manifest.parent_map[id] = [...node.depends_on];
      manifest.child_map[id] = [...node.depended_on_by];
    }
    for (const n of Object.values(manifest.nodes)) {
      (n as any).state = "concrete";
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
      for (const dep of node?.depends_on ?? []) {
        if (!selected.has(dep)) {
          selected.add(dep);
          if (wasPreviouslySkipped.has(dep)) await resultsMgr.markPending(dep);
          walkQueue.push(dep);
        }
      }
      // Selecting a Seed/container parent also selects its materialized spawned
      // descendants. Without this, resume runs with `--select parent` skip
      // pending children that were spawned in a prior pass.
      for (const child of node?.spawned_children ?? []) {
        if (!selected.has(child)) {
          selected.add(child);
          if (wasPreviouslySkipped.has(child)) await resultsMgr.markPending(child);
          walkQueue.push(child);
        }
      }
    }

    let skippedCount = 0;
    for (const id of dag.nodes.keys()) {
      if (!selected.has(id)) {
        const st = await resultsMgr.getNodeStatus(id);
        if (st?.status !== "pass") {
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
  if (opts.dry) {
    const pending: string[] = [];
    const cached: string[] = [];
    const skipped: string[] = [];
    for (const id of dag.nodes.keys()) {
      const st = await resultsMgr.getNodeStatus(id);
      if (st?.status === "pass") cached.push(id);
      else if (st?.status === "skipped") skipped.push(id);
      else if (st?.status !== "error") pending.push(id);
    }
    reporter?.emit({ kind: "dry-run", pending, cached, skipped });
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

  let pass = 0;
  let loopContinuations = 0;
  let consecutiveStalls = 0;
  try {
    while (true) {
      checkAborted(opts.signal);

      if (maxDurationMs !== undefined && Number.isFinite(maxDurationMs) && Date.now() - runStart >= maxDurationMs) {
        reporter?.emit({ kind: "log", level: "warn", message: `Stopping: maxDuration reached (${maxDurationMs}ms)` });
        break;
      }

      if (pass >= maxDagPasses) {
        reporter?.emit({ kind: "log", level: "warn", message: `Stopping: DAG pass safety limit reached (${maxDagPasses})` });
        break;
      }

      const before = statusCounts(dag);
      if (before.pending === 0) break;

      if (opts.seedOnly && pass > 0) {
        const spawned = [...dag.nodes.values()].filter((n) => n.status === "pending").map((n) => n.id);
        reporter?.emit({
          kind: "log",
          level: "info",
          message: `--seed: stopping before spawned children (${spawned.length} pending): ${spawned.join(", ")}`,
        });
        break;
      }

      const { completed, failed } = await runDag(
        dag,
        async (node) => {
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
          });
        },
        { concurrency: opts.concurrency ?? 1, runResults: resultsMgr },
      );

      // Re-queue tasks that explicitly requested another pass.
      //
      // Incremental Seed parents are loop drivers: ctx.loop.continue() means
      // "run my newly spawned children, then execute this seed again in this
      // same invocation while maxIterations/maxDuration allow it." Previously the
      // parent stayed seeded/pass after its children completed, so autonomous
      // loops stopped after one epoch and required an external rerun.
      for (const [id, dagNode] of dag.nodes) {
        if ((dagNode as any)._queueNotConverged) {
          dagNode.status = 'pending';
          dag.resetToPending(id);
          await resultsMgr.markPending(id);
        }

        if ((dagNode as any)._incrementalSeedNotDone) {
          const childIds = dagNode.spawned_children ?? [];
          const allSpawnedDone = childIds.length === 0 || childIds.every((childId: string) => {
            const child = dag.nodes.get(childId);
            return child && (child.status === 'complete' || child.status === 'pass');
          });

          if (allSpawnedDone) {
            loopContinuations++;
            if (loopContinuations < maxIterations) {
              dagNode.status = 'pending';
              dag.resetToPending(id);
              await resultsMgr.markPending(id);
            } else {
              delete (dagNode as any)._incrementalSeedNotDone;
              if (dagNode.status === 'pending' || dagNode.status === 'seeded') {
                dagNode.status = 'complete';
                await resultsMgr.markComplete(id, 0);
              }
              reporter?.emit({ kind: "log", level: "info", message: `Stopping: maxIterations reached (${maxIterations})` });
            }
          }
        }

        delete (dagNode as any)._queueNotConverged;
      }

      totalCompleted += completed;
      totalFailed += failed;
      pass++;


      const after = statusCounts(dag);
      const stalled = completed === 0 && failed === 0 && after.pending === before.pending;
      if (stalled) {
        consecutiveStalls++;
        reporter?.emit({ kind: "log", level: "warn", message: `No DAG progress in pass ${pass} (stall ${consecutiveStalls})` });
        if (stallMaxConsecutive > 0 && consecutiveStalls >= stallMaxConsecutive) break;
        if (stallBackoffMs > 0) await sleep(stallBackoffMs);
      } else {
        consecutiveStalls = 0;
      }
    }
  } catch (err) {
    if (err instanceof AbortedError || (err as any)?.name === "AbortError") {
      reporter?.emit({ kind: "run-aborted", reason: "aborted" });
        throw err;
    }
    throw err;
  }

  // ── 4. Report ──────────────────────────────────────────────────
  const elapsed = Date.now() - runStart;
  reporter?.emit({
    kind: "run-complete",
    completed: totalCompleted,
    failed: totalFailed,
    durationMs: elapsed,
  });

  await resultsMgr.setRunStatus(totalFailed > 0 ? "error" : "complete");

  await executionLogger.writeExecutionEnd(
    {
      totalIterations: 0,
      tasksCompleted: totalCompleted,
      tasksFailed: totalFailed,
      gapsResolved: 0,
      convergenceAchieved: totalFailed === 0,
    },
    totalFailed > 0 ? "error" : "complete",
  );

  return {
    runId: "latest",
    completed: totalCompleted,
    failed: totalFailed,
    durationMs: elapsed,
    nodes: collectNodeStates(dag, resultsMgr),
  };
}

/* ------------------------------------------------------------------ */
/*  Per-task execution                                                 */
/* ------------------------------------------------------------------ */

interface RunTaskArgs {
  node: DagNode;
  projectDir: string;
  playbookDir: string;
  maxTaskAttempts: number;
  resultsMgr: RunStateManager;
  checkpointMgr: TaskStateManager;
  executionLogger: ExecutionLogger;
  dag: TaskDag;
  reporter?: Reporter;
}

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
  } = args;
  const taskId = node.id;

  if (await resultsMgr.isComplete(taskId)) {
    const outputs = node.taskDef.outputs ?? [];
    const outputsExist = outputs.length === 0 || outputs.every((out) => existsSync(join(projectDir, out)));
    if (outputsExist) {
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
            reporter?.emit({ kind: "log", level: "info", message: `[${taskId}] ${msg}` }),
          warn: (msg: string) =>
            reporter?.emit({ kind: "log", level: "warn", message: `[${taskId}] ${msg}` }),
          error: (msg: string) =>
            reporter?.emit({ kind: "log", level: "error", message: `[${taskId}] ${msg}` }),
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
  // Fall back to filesystem TASK.md only when task_def is unavailable.
  const absPath = isVirtualPath
    ? node.path
    : node.path && existsSync(node.path)
      ? node.path
      : join(playbookDir, "tasks", taskId, "TASK.md");

  const tdPrompt = node.taskDef.prompt;
  const tdBody = (node.taskDef as any).body;

  let unit: Unit;
  if (tdPrompt || tdBody) {
    unit = Unit.fromDefinition(node.taskDef as any, null as any, absPath);
  } else if (!isVirtualPath && existsSync(absPath)) {
    unit = await Unit.fromPath(absPath);
  } else {
    reporter?.emit({
      kind: "task-skipped",
      taskId,
      reason: "no task content and no TASK.md — skipping",
    });
    await resultsMgr.markSkipped(taskId);
    return { success: true };
  }

  const taskDef = node.taskDef;
  const taskStart = Date.now();

  try {
    const result = await executeTask(unit, checkpointMgr, executionLogger);

    // Propagate re-queue flags to the DAG node so the outer loop can reset
    // tasks that need another pass (incremental seed, queue materialization).
    const shouldKeepIncrementalSeedPending =
      result.isWbsTask && result._incrementalSeedNotDone === true;
    (node as any)._incrementalSeedNotDone = result._incrementalSeedNotDone;
    (node as any)._queueNotConverged = result._queueNotConverged;

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
      from_seed: taskDef.from_seed,
      check_results: attemptData.check_results,
      output_hashes: attemptData.output_hashes,
    };

    // Register spawned children in runstate from seed.json.
    // The seed executor writes seed.json with spawned child metadata —
    // we read it and register children directly. No filesystem scanning.
    await registerSpawnedChildren({ taskId, taskPath: node.path, resultsMgr, dag, reporter });

    // Transition seeded parents to complete when all children are done.
    for (const [nid, n] of dag.nodes) {
      if (n.status !== 'seeded') continue;
      const childIds = n.spawned_children ?? [];
      if (childIds.length === 0) continue;
      const allDone = childIds.every(cid => {
        const child = dag.nodes.get(cid);
        return child && (child.status === 'pass' || child.status === 'complete');
      });
      if (!allDone) continue;

      await resultsMgr.markComplete(nid, Date.now() - taskStart);
      n.status = 'pass';
    }

    if (result.success) {
      if (result.isWbsTask) {
        await registerSpawnedChildren({ taskId, taskPath: node.path, resultsMgr, dag, reporter });
        const hasSpawnedChildren = (node.spawned_children ?? []).length > 0;
        if (hasSpawnedChildren) {
          // Seed parent: mark as seeded — stays blocked until children complete
          await resultsMgr.markSeeded(taskId);
          node.status = "seeded";
        } else {
          // Explicit zero-spawn stop for incremental seeds.
          await resultsMgr.markComplete(taskId, Date.now() - taskStart, completionData);
        }
      } else {
        await resultsMgr.markComplete(
          taskId,
          Date.now() - taskStart,
          completionData,
        );
      }
      if (shouldKeepIncrementalSeedPending) {
        (node as any)._incrementalSeedNotDone = true;
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
  }
}
/**
 * Register spawned children from seed.json into runstate.
 * The seed executor writes seed.json with subtask metadata.
 * No filesystem scanning — runstate is the single source of truth.
 */
async function registerSpawnedChildren(args: {
  taskId: string;
  taskPath?: string;
  resultsMgr: RunStateManager;
  dag: TaskDag;
  reporter?: Reporter;
}): Promise<void> {
  const { taskId, taskPath, resultsMgr, dag, reporter } = args;
  // seed.json lives in the journal. Seeded descendants can have a materialized
  // TASK.md under parent/spawned/id while SeedExecutor writes state under
  // parent/id, so try all deterministic journal candidates.
  let seedJsonPath = "";
  for (const candidate of journalTaskDirCandidatesForNode(resultsMgr, taskId, taskPath)) {
    const p = join(candidate, "seed.json");
    if (existsSync(p)) {
      seedJsonPath = p;
      break;
    }
  }
  if (!seedJsonPath) return;

  let seedData: any;
  try { seedData = JSON.parse(readFileSync(seedJsonPath, "utf-8")); } catch { return; }
  const subtasks: Array<{ id: string; writeToPath: string }> = seedData.subtasks ?? [];
  if (subtasks.length === 0) return;

  const spawnedIds: string[] = [];
  const spawnedSummaries: { id: string; title?: string }[] = [];

  for (const subtask of subtasks) {
    const childId = subtask.id;
    const childTaskMd = join(resultsMgr.executionDir, subtask.writeToPath.replace(/^\.converge\/journal\/[^/]+\//, ""));
    if (!existsSync(childTaskMd)) continue;

    try {
      const childRaw = readFileSync(childTaskMd, "utf-8");
      const { parseTaskMdString, mapTaskMdToTaskDefinition } = await import("./config/task-md-definition.js");
      const childParsed = parseTaskMdString(childRaw);
      const mappedTaskDef = mapTaskMdToTaskDefinition(childParsed, childParsed.body ?? "", childId, dirname(childTaskMd));
      const explicitDeps = mappedTaskDef.depends_on ?? [];
      mappedTaskDef.depends_on = explicitDeps.length > 0
        ? explicitDeps
        : [taskId];

      const childNode: DagNode = {
        id: childId,
        type: "normal",
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
      if (dag.nodes.has(childId)) continue;
      dag.addNode(childNode);

      await resultsMgr.addSpawnedChildNode(childId, taskId, mappedTaskDef.depends_on ?? [taskId], {
        title: mappedTaskDef.title ?? childId,
        description: mappedTaskDef.description,
        inputs: mappedTaskDef.inputs ?? [],
        outputs: mappedTaskDef.outputs ?? [],
        checks: (Array.isArray(mappedTaskDef.checks) ? mappedTaskDef.checks : []).map((c: any) => ({ id: c.id ?? "", description: c.description ?? "", cmd: c.cmd ?? "" })),
        tags: mappedTaskDef.tags,
        vars: mappedTaskDef.vars,
        sourcePath: childTaskMd,
      });

      spawnedIds.push(childId);
      spawnedSummaries.push({ id: childId, title: mappedTaskDef.title });
    } catch (err: any) {
      reporter?.emit({ kind: "log", level: "warn", message: "[seed] failed to register " + childId + ": " + err.message });
    }
  }

  if (spawnedIds.length > 0) {
    await resultsMgr.addSpawnedChildren(taskId, spawnedIds);
    reporter?.emit({ kind: "children-spawned", parentId: taskId, children: spawnedSummaries });
  }
}
/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
/**
 * Compile a playbook into a DAG.
 *
 * Three paths:
 * 1. Pre-built manifest (from `converge compile`) → build from manifest.
 * 2. Folder-based playbook without manifest → auto-compile from source:
 *    empty DAG + injectRootNodes from root TASK.md. Spawned children are
 *    tracked in runstate.json, not discovered from the filesystem.
 * 3. In-memory playbook → build from playbook object.
 */
async function compilePlaybook(
  playbook: Playbook,
  playbookDir: string,
  playbookName: string,
  targetDir: string,
  projectDir: string,
): Promise<{ dag: TaskDag; errors: LoaderError[]; playbookHash: string }> {
  const hasPlaybookYml = existsSync(join(playbookDir, "playbook.yml"));
  const hasInMemoryTasks = playbook.tasks.size > 0;

  if (hasPlaybookYml) {
    // Try target dir first, fall back to journal dir
    let manifestPath = join(targetDir, "manifest.json");
    if (!existsSync(manifestPath)) {
      const journalPath = join(projectDir, ".converge", "journal", playbookName, "manifest.json");
      if (existsSync(journalPath)) {
        manifestPath = journalPath;
      }
    }

    if (existsSync(manifestPath)) {
      const manifestRaw = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestRaw);
      const currentHash = hashPlaybook(playbookDir);
      const manifestHash = manifest.metadata?.playbook_hash;
      if (manifestHash && manifestHash === currentHash) {
        const { buildDagFromManifest } = await import("./manifest/build-dag.js");
        const result = buildDagFromManifest(manifest);
        await expandHooksFromPlaybook(playbook, result.dag);
        return {
          dag: result.dag,
          errors: result.errors,
          playbookHash: manifestHash,
        };
      }
      // Stale manifest: ignore it and rebuild from source. This prevents old
      // DAGs from hiding newly-added TASK.md/playbook.yml entries.
    }

    // Auto-compile: use the same full compile logic that `converge compile` uses.
    // This ensures static children, seeds, and all TASK.md discovery run consistently.
    const { buildDagFromPlaybook } = await import("./config/declarative-loader.js");
    const { dag, errors } = buildDagFromPlaybook(playbookDir);

    const idToPath = new Map<string, string>();
    discoverStaticChildren(dag, idToPath);
    splitContainerNodes(dag);
    injectRootNodes(dag, playbookName, playbookDir);
    await expandHooksFromPlaybook(playbook, dag);
    return { dag, errors, playbookHash: hashPlaybook(playbookDir) };
  }

  if (hasInMemoryTasks) {
    const result = buildDagFromPlaybookObject(playbook);
    await expandHooksFromPlaybook(playbook, result.dag);
    return {
      dag: result.dag,
      errors: result.errors,
      playbookHash: hashPlaybook(playbookDir),
    };
  }

  return {
    dag: new TaskDag(),
    errors: [],
    playbookHash: hashPlaybook(playbookDir),
  };
}

/**
 * Expand hook definitions from a playbook into companion DAG nodes.
 * Only does work when the playbook has hook definitions.
 */
async function expandHooksFromPlaybook(
  playbook: Playbook,
  dag: TaskDag,
): Promise<void> {
  const hooks = playbook.def.hooks;
  if (!hooks || hooks.length === 0) return;

  await ensureBuiltinsLoaded();

  // Resolve __builtin references in hooks (from YAML parsing)
  for (const hook of hooks) {
    const builtinName = (hook.config as any)?.__builtin as string | undefined;
    if (builtinName) {
      // Only resolve if fn is still the placeholder
      const resolved = resolveBuiltinHook(builtinName, hook.config);
      if (resolved) {
        (hook as any).fn = resolved;
      }
    }
  }

  const { expandHooks } = await import("./dag/hook-nodes.js");
  expandHooks(hooks, dag);
}

/** Registry of builtin hook factory names → factory functions. */
const _builtinHookFactories: Record<
  string,
  (config?: Record<string, unknown>) => any
> = {};

let _builtinsLoaded = false;

async function ensureBuiltinsLoaded(): Promise<void> {
  if (_builtinsLoaded) return;
  _builtinsLoaded = true;
  try {
    const { gitCommitHook, prCreateHook } = await import(
      "./hooks/builtins/git.js"
    );
    _builtinHookFactories["git-commit"] = (cfg) => gitCommitHook(cfg as any);
    _builtinHookFactories["pr-create"] = (cfg) => prCreateHook(cfg as any);
  } catch {
    // builtins are optional — don't crash if they can't be loaded
  }
}

function resolveBuiltinHook(
  name: string,
  config?: Record<string, unknown>,
): any | null {
  const factory = _builtinHookFactories[name];
  if (!factory) {
    console.warn(`[hooks] Unknown builtin hook: "${name}". Skipping.`);
    return null;
  }
  return factory(config);
}


function hashPlaybook(playbookDir: string): string {
  const hash = createHash("sha256");
  const ymlPath = join(playbookDir, "playbook.yml");
  if (existsSync(ymlPath)) {
    hash.update(readFileSync(ymlPath, "utf-8"));
  }
  const tasksDir = join(playbookDir, "tasks");
  if (existsSync(tasksDir)) {
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === "TASK.md") hash.update(readFileSync(full, "utf-8"));
      }
    };
    walk(tasksDir);
  }
  return `sha256:${hash.digest("hex")}`;
}

// Helper utilities also available as imports from "./run/helpers.js".
// Kept inline in run.ts to avoid changing all call sites.
import {
  computeOutputHashes,
  readCheckResults,
  gatherAttemptData,
  computeFingerprint,
  collectNodeStates,
} from "./run/helpers.js";
