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

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";


import { runDag } from "./dag/dag-runner.js";
import type { DagNode } from "./dag/dag-node.js";
import type { NodeResult } from "./dag/dag-runner.js";
import { TaskDag } from "./dag/task-dag.js";
import type { TaskDefinition } from "./config/task-definition.js";
import { executeTask } from "./task/lifecycle/task-runner.js";
import { Unit } from "./task/unit/unit.js";
import {
  RunStateManager,
  writeJournalManifest,
} from "./manifest/index.js";
import {
  ExecutionLogger,
  generateExecutionId,
} from "./journal/execution-logger.js";
import {
  setExecutionScope,
  clearExecutionScope,
  getExecutionDir,
  getExecutionsDir,
} from "./journal/structure.js";
import { TaskStateManager } from "./checkpoint/state.js";
import type {
  CompletionData,
  CheckResultItem,
} from "./manifest/types.js";

import type { Playbook } from "./playbook.js";

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
  const maxTaskAttempts = opts.maxTaskAttempts ?? playbook.def.run?.maxTaskAttempts ?? 3;

  const runStart = Date.now();

  // ── 1. Build DAG ───────────────────────────────────────────────
  reporter?.emit({ kind: "compile-start" });
  checkAborted(opts.signal);

  // Two construction paths:
  //   - Folder-based: read compiled target/manifest.json (compile phase
  //     already discovered the full DAG). No filesystem scanning.
  //   - Code-defined: a `definePlaybook(...)` call hands us the in-
  //     memory tasks directly; materialize DAG from `playbook.tasks`.
  // Both produce the same `TaskDag` shape; downstream code can't tell.
  const hasPlaybookYml = existsSync(join(playbookDir, "playbook.yml"));
  const hasInMemoryTasks = playbook.tasks.size > 0;
  let dag: TaskDag;
  let errors: LoaderError[] = [];
  let playbookHash: string;

  if (hasPlaybookYml) {
    const journalDir = join(projectDir, ".converge", "journal", playbookName);
    const manifestPath = join(journalDir, "manifest.json");
    if (!existsSync(manifestPath)) {
      throw new Error(
        `No compiled manifest found at ${manifestPath}. Run "converge compile" first.`,
      );
    }
    const manifestRaw = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestRaw);
    const { buildDagFromManifest } = await import("./manifest/build-dag.js");
    const result = buildDagFromManifest(manifest);
    dag = result.dag;
    errors = result.errors;
    playbookHash = manifest.metadata?.playbook_hash ?? hashPlaybook(playbookDir);
  } else if (hasInMemoryTasks) {
    const result = buildDagFromPlaybookObject(playbook);
    dag = result.dag;
    errors = result.errors;
    playbookHash = hashPlaybook(playbookDir);
  } else {
    dag = new TaskDag();
    playbookHash = hashPlaybook(playbookDir);
  }

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

  // ── 2. Execution setup ─────────────────────────────────────────
  const execsDir = getExecutionsDir(projectDir);
  mkdirSync(execsDir, { recursive: true });

  let executionId: string;
  let executionDir: string;

  if (opts.resume) {
    const existing = readdirSync(execsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse();

    if (existing.length > 0) {
      const latestDir = join(execsDir, existing[0]);
      if (existsSync(join(latestDir, "runstate.json"))) {
        executionId = existing[0];
        executionDir = latestDir;
      } else {
        executionId = generateExecutionId();
        executionDir = getExecutionDir(projectDir, executionId);
      }
    } else {
      executionId = generateExecutionId();
      executionDir = getExecutionDir(projectDir, executionId);
    }
  } else {
    executionId = generateExecutionId();
    executionDir = getExecutionDir(projectDir, executionId);
  }

  setExecutionScope(executionId);
  mkdirSync(executionDir, { recursive: true });

  // Seed execution runstate from the compile-time runstate so the
  // RunStateManager picks up all nodes discovered during compile.
  const journalDir = join(projectDir, ".converge", "journal", playbookName);
  const journalRunstatePath = join(journalDir, "runstate.json");
  if (existsSync(journalRunstatePath)) {
    copyFileSync(journalRunstatePath, join(executionDir, "runstate.json"));
  }

  reporter?.emit({
    kind: "run-start",
    playbook: playbookName,
    runId: executionId,
    projectDir,
  });

  const resultsMgr = new RunStateManager(
    executionDir,
    dag,
    playbookHash,
    projectDir,
  );

  if (opts.resume) {
    const state = await resultsMgr.getStateSnapshot();
    for (const [id, rsNode] of Object.entries(state.dag.nodes)) {
      if (!dag.nodes.has(id)) {
        dag.nodes.set(id, {
          id,
          parents: rsNode.from_seed ? [rsNode.from_seed] : [],
          children: [],
          depends_on: rsNode.depends_on,
          depended_on_by: rsNode.depended_on_by,
          taskDef: {
            id,
            title: rsNode.title,
            description: rsNode.description,
            inputs: rsNode.inputs,
            outputs: rsNode.outputs,
            checks: rsNode.checks as any,
          },
          path: rsNode.source_path ?? "",
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
  }

  await writeJournalManifest(executionDir, resultsMgr.toManifest());

  const checkpointMgr = new TaskStateManager(projectDir);

  const executionLogger = new ExecutionLogger(
    projectDir,
    executionId,
    playbookName,
    {
      maxIterations: 0,
      maxAttemptsPerTask: maxTaskAttempts,
    },
  );

  // ── 2.5 Change detection ───────────────────────────────────────
  let cachedCount = 0;

  if (!opts.resume && !opts.fullRefresh) {
    const fingerprints = new Map<string, string>();
    for (const [id, node] of dag.nodes) {
      const fp = computeFingerprint(node);
      fingerprints.set(id, fp);
      resultsMgr.setNodeFingerprint(id, fp);
    }

    const priorExec = findLatestExecution(execsDir, executionId);
    const priorState = priorExec ? RunStateManager.loadPriorRunState(priorExec) : null;

    if (priorState) {
      const changed = new Set<string>();
      const layers = dag.topologicalOrder();

      for (const layer of layers) {
        for (const node of layer) {
          const priorNode = priorState.dag?.nodes?.[node.id];
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
    const walkQueue = [...resolved.ids];
    while (walkQueue.length > 0) {
      const id = walkQueue.pop()!;
      for (const dep of dag.nodes.get(id)?.depends_on ?? []) {
        if (!selected.has(dep)) {
          selected.add(dep);
          walkQueue.push(dep);
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
      if (st?.status === "pending") pending.push(id);
      else if (st?.status === "pass") cached.push(id);
      else if (st?.status === "skipped") skipped.push(id);
    }
    reporter?.emit({ kind: "dry-run", pending, cached, skipped });
    clearExecutionScope();
    return {
      runId: executionId,
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
  try {
    while (true) {
      checkAborted(opts.signal);

      const pending = [...dag.nodes.values()].filter(
        (n) => n.status === "pending",
      );
      if (pending.length === 0) break;

      if (opts.seedOnly && pass > 0) {
        const spawned = pending.map((n) => n.id);
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

      // Re-queue incremental seed / queue tasks for the next pass
      for (const [id, dagNode] of dag.nodes) {
        if ((dagNode as any)._incrementalSeedNotDone || (dagNode as any)._queueNotConverged) {
          dagNode.status = 'pending';
          dag.resetToPending(id);
          delete (dagNode as any)._incrementalSeedNotDone;
          delete (dagNode as any)._queueNotConverged;
        }
      }

      totalCompleted += completed;
      totalFailed += failed;
      pass++;
    }
  } catch (err) {
    if (err instanceof AbortedError || (err as any)?.name === "AbortError") {
      reporter?.emit({ kind: "run-aborted", reason: "aborted" });
      clearExecutionScope();
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

  clearExecutionScope();

  return {
    runId: executionId,
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
    reporter?.emit({ kind: "task-cached", taskId });
    return { success: true };
  }

  reporter?.emit({ kind: "task-start", taskId, attempt: 1 });

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

  // ── Folder-based path (TASK.md → Unit → executeTask) ───────────
  const absPath = isVirtualPath
    ? node.path
    : node.path && existsSync(node.path)
      ? node.path
      : join(playbookDir, "tasks", taskId, "TASK.md");

  let unit: Unit;
  if (!isVirtualPath && existsSync(absPath)) {
    unit = await Unit.fromPath(absPath);
  } else if (node.taskDef.prompt) {
    unit = Unit.fromDefinition(node.taskDef as any, null as any, absPath);
  } else {
    reporter?.emit({
      kind: "task-skipped",
      taskId,
      reason: "no TASK.md and no inline prompt — skipping",
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

    // Discover any spawned children (from pre-seed or after-seed).
    // Path-based — reads the spawned/ directory, returns early if empty.
    await discoverSpawnedChildren({
      taskId,
      taskPath: node.path,
      projectDir,
      resultsMgr,
      dag,
      reporter,
    });

    // Transition seeded parents to complete when all children are done
    for (const [nid, n] of dag.nodes) {
      if (n.status !== 'seeded') continue;
      const childIds = n.children;
      if (childIds.length === 0) continue;
      const allDone = childIds.every(cid => {
        const child = dag.nodes.get(cid);
        return child && (child.status === 'pass' || child.status === 'complete');
      });
      if (allDone) {
        await resultsMgr.markComplete(nid, Date.now() - taskStart);
        n.status = 'pass';
      }
    }

    if (result.success) {
      if (result.isWbsTask) {
        // Seed parent: mark as seeded — stays blocked until children complete
        await resultsMgr.markSeeded(taskId);
      } else {
        await resultsMgr.markComplete(
          taskId,
          Date.now() - taskStart,
          completionData,
        );
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

interface DiscoverSpawnedChildrenArgs {
  taskId: string;
  /** Absolute or relative path to the task's TASK.md — used to locate seed.json for spawned children. */
  taskPath?: string;
  projectDir: string;
  resultsMgr: RunStateManager;
  dag: TaskDag;
  reporter?: Reporter;
}

/** Derive the hierarchical journal task id from a playbook TASK.md path. */
function extractJournalTaskIdFromPlaybookPath(
  taskPath: string,
  fallback: string,
): string {
  // taskPath looks like:
  //   .../playbooks/{name}/tasks/01-crawl/tasks/002-crawl-epochs/TASK.md
  // We want: "01-crawl/002-crawl-epochs"
  const normalized = taskPath.replace(/\\/g, "/");
  const idx = normalized.indexOf("/playbooks/");
  if (idx === -1) return fallback;
  const afterPlaybooks = normalized.slice(idx + "/playbooks/".length);
  const segments = afterPlaybooks.split("/");
  // Skip playbook name (segments[0]) and "tasks" marker
  const taskSegments: string[] = [];
  let foundTasks = false;
  for (const seg of segments) {
    if (seg === "tasks") { foundTasks = true; continue; }
    if (!foundTasks) continue;
    if (seg.endsWith(".md") || seg.endsWith(".ts")) break;
    taskSegments.push(seg);
  }
  return taskSegments.length > 0 ? taskSegments.join("/") : fallback;
}

async function discoverSpawnedChildren(
  args: DiscoverSpawnedChildrenArgs,
): Promise<void> {
  const { taskId, taskPath, projectDir, resultsMgr, dag, reporter } = args;
  // Read seed.json for structured spawn info (order, ids, paths, deps).
  // No filesystem directory walk — runstate.json is the source of truth.
  const isSpawned = taskPath?.includes("spawned");
  // Derive the journal task path from the playbook path.  The DAG node id
  // (taskId) is flat (e.g. "002-crawl-epochs") but seed.json lives under
  // the full hierarchical journal path (e.g. "01-crawl/002-crawl-epochs").
  const journalTaskId = isSpawned
    ? taskId
    : extractJournalTaskIdFromPlaybookPath(taskPath ?? "", taskId);
  const journalTaskDir = isSpawned
    ? dirname(taskPath!)
    : join(resultsMgr.executionDir, "tasks", journalTaskId);
  const seedJsonPath = join(journalTaskDir, "seed.json");
  if (!existsSync(seedJsonPath)) return;

  let seedData: any;
  try { seedData = JSON.parse(readFileSync(seedJsonPath, "utf-8")); } catch { return; }
  const subtasks: Array<{ id: string; writeToPath: string }> = seedData.subtasks ?? [];
  if (subtasks.length === 0) return;

  const spawnedDir = join(journalTaskDir, "spawned");

  const spawnedIds: string[] = [];
  const spawnedSummaries: { id: string; title?: string }[] = [];
  for (const subtask of subtasks) {
    const childId = subtask.id;
    const childTaskMd = join(projectDir, subtask.writeToPath);
    if (!existsSync(childTaskMd)) continue;

    try {
      const childRaw = readFileSync(childTaskMd, "utf-8");
      const { parseTaskMdString } = await import(
        "./config/task-md-definition.js"
      );
      const childParsed = parseTaskMdString(childRaw);
      const childDef = {
        id: childId,
        title: childParsed.title ?? childId,
        description: childParsed.description,
        prompt: childParsed.body ?? childParsed.prompt,
        inputs: childParsed.inputs,
        outputs: childParsed.outputs,
        checks: childParsed.checks as any,
        skill: childParsed.skills,
        tags: childParsed.tags,
        vars: childParsed.vars,
        depends_on: childParsed.depends_on,
        from_seed: taskId,
      };
      const childUnit = Unit.fromDefinition(
        childDef as any,
        null as any,
        childTaskMd,
      );
      // Merge parent dependency with child's own declared deps
      const childDeps = childDef.depends_on ?? [];
      const mergedDeps = [...new Set([taskId, ...childDeps])];
      const childNode: DagNode = {
        id: childId,
        parents: [taskId],
        children: [],
        depends_on: mergedDeps,
        depended_on_by: [],
        taskDef: childUnit as any,
        path: childTaskMd,
        status: "pending",
        virtual: false,
      };
      dag.addNode(childNode);

      await resultsMgr.addSpawnedChildNode(childId, taskId, mergedDeps, {
        title: childUnit.title,
        description: childUnit.description,
        agent: childUnit.agent,
        skill: childUnit.skill,
        inputs: childUnit.inputs,
        outputs: childUnit.outputs,
        checks: (Array.isArray(childUnit.checks) ? childUnit.checks : []).map(
          (c: any) => ({
            id: c.id ?? "",
            description: c.description,
            cmd: c.cmd,
            type: c.type,
          }),
        ),
        tags: childUnit.tags,
        vars: childUnit.vars,
      });

      spawnedIds.push(childId);
      spawnedSummaries.push({ id: childId, title: childUnit.title });
    } catch (err: any) {
      reporter?.emit({
        kind: "log",
        level: "warn",
        message: `[seed] failed to load child ${childId} from ${childTaskMd}: ${err.message}`,
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build a `TaskDag` from an in-memory `Playbook` (no filesystem scan).
 *
 * Mirrors what `buildDagFromPlaybook` does for folder-based playbooks:
 * one `DagNode` per declared task, edges from `depends_on`, then
 * `dag.computeDepended()` populates the reverse edges. The TaskDef on
 * each node is the in-memory definition, so the runtime's executor
 * path (`Unit.fromDefinition` → `executeTask`) finds the JS function
 * via `taskDef.executorFn`.
 */
function buildDagFromPlaybookObject(playbook: Playbook): {
  dag: TaskDag;
  errors: { type: string; message: string }[];
} {
  const dag = new TaskDag();
  dag.playbookName = playbook.def.name;
  const errors: { type: string; message: string }[] = [];

  for (const entry of playbook.def.tasks) {
    if (!entry.path) continue;
    const taskId = entry.path.includes("/") ? entry.path.split("/").pop()! : entry.path;
    const taskDef = playbook.tasks.get(taskId);
    if (!taskDef) {
      errors.push({
        type: "missing-task",
        message: `Task entry "${entry.path}" has no in-memory TaskDefinition.`,
      });
      continue;
    }
    const node: DagNode = {
      id: taskId,
      parents: [],
      children: [],
      depends_on: taskDef.depends_on ?? [],
      depended_on_by: [],
      taskDef: taskDef as TaskDefinition,
      // Synthetic path so the runtime can build a per-task journal dir
      // without a real TASK.md on disk. Unit.fromDefinition is what
      // actually runs; this string is only used for journal scoping.
      path: `<virtual:${playbook.def.name}/${entry.path}>`,
      status: "pending",
      virtual: false,
    };
    dag.addNode(node);
  }

  // Populate `depended_on_by` from `depends_on` so layer ordering works.
  for (const node of dag.nodes.values()) {
    for (const dep of node.depends_on) {
      const upstream = dag.nodes.get(dep);
      if (!upstream) {
        errors.push({
          type: "missing-dep",
          message: `Task "${node.id}" depends on unknown task "${dep}".`,
        });
        continue;
      }
      if (!upstream.depended_on_by.includes(node.id)) {
        upstream.depended_on_by.push(node.id);
      }
    }
  }

  return { dag, errors };
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

async function computeOutputHashes(
  projectDir: string,
  outputs: string[],
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const outputPath of outputs) {
    const absPath = join(projectDir, outputPath);
    if (!existsSync(absPath)) continue;
    try {
      const content = await readFile(absPath);
      hashes[outputPath] =
        `sha256:${createHash("sha256").update(content).digest("hex")}`;
    } catch {
      // skip unreadable files
    }
  }
  return hashes;
}

function readCheckResults(wipDir: string): CheckResultItem[] | undefined {
  const checkResultsPath = join(wipDir, "data", "check-results.json");
  if (!existsSync(checkResultsPath)) return undefined;
  try {
    return JSON.parse(readFileSync(checkResultsPath, "utf-8"));
  } catch {
    return undefined;
  }
}

async function gatherAttemptData(
  unit: Unit,
  projectDir: string,
  attemptNumber: number,
  outputs?: string[],
): Promise<{
  check_results?: CheckResultItem[];
  output_hashes?: Record<string, string>;
}> {
  const data: {
    check_results?: CheckResultItem[];
    output_hashes?: Record<string, string>;
  } = {};

  if (unit.context?.journalPath) {
    const attemptDirName = String(attemptNumber).padStart(2, "0");
    const attemptDir = join(
      unit.context.journalPath,
      "attempts",
      attemptDirName,
    );
    data.check_results = readCheckResults(attemptDir);
  }

  if (outputs && outputs.length > 0) {
    data.output_hashes = await computeOutputHashes(projectDir, outputs);
  }

  return data;
}

function computeFingerprint(node: DagNode): string {
  const hash = createHash("sha256");

  const taskPath = node.path;
  if (taskPath && existsSync(taskPath)) {
    hash.update(readFileSync(taskPath, "utf-8"));
  } else {
    const prompt = node.taskDef.prompt;
    hash.update(typeof prompt === "string" ? prompt : "");
    hash.update(node.taskDef.description ?? "");
    hash.update(
      node.taskDef.skill
        ? Array.isArray(node.taskDef.skill)
          ? node.taskDef.skill.join(",")
          : node.taskDef.skill
        : "",
    );
  }

  hash.update(JSON.stringify(node.taskDef.checks ?? []));
  hash.update(JSON.stringify(node.taskDef.inputs ?? []));

  return `sha256:${hash.digest("hex")}`;
}

function findLatestExecution(
  execsDir: string,
  skipId: string,
): string | null {
  const dirs = readdirSync(execsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== skipId)
    .map((e) => e.name)
    .sort()
    .reverse();

  for (const dir of dirs) {
    const runstatePath = join(execsDir, dir, "runstate.json");
    if (!existsSync(runstatePath)) continue;
    return join(execsDir, dir);
  }
  return null;
}

function collectNodeStates(
  dag: TaskDag,
  resultsMgr: RunStateManager,
): RunResult["nodes"] {
  const nodes: RunResult["nodes"] = [];
  for (const [id, node] of dag.nodes) {
    let status: RunResult["nodes"][number]["status"];
    if (node.status === "complete") status = "completed";
    else if (node.status === "failed") status = "failed";
    else status = "skipped";
    nodes.push({
      id,
      status,
      outputs: node.taskDef?.outputs ?? [],
    });
  }
  return nodes;
}
