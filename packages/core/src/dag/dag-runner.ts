import { join, dirname } from 'path';
import type { DagNode } from './dag-node';
import type { TaskDefinition } from '../config/task-definition';
import { TaskDag } from './task-dag';
import type { RunStateManager } from '../manifest/run-state-manager';
import type { CompletionData, RunStateCheck } from '../manifest/types';

export interface SpawnedChild {
  id: string;
  taskDef: TaskDefinition;
  path?: string;
}

export interface DagRunnerOpts {
  projectDir: string;
  spawnChildren?: (node: DagNode, projectDir: string) => Promise<SpawnedChild[]>;
  runResults?: RunStateManager;
  /**
   * Safety cap on the outer scheduler loop. If `getReady()` returns
   * non-empty more than this many times without the DAG making progress
   * (i.e. without any node transitioning to a terminal state), the
   * runner aborts with a stuck-runner error. Default 10_000 — high
   * enough that legitimate seed-spawn fan-out never trips it, low
   * enough that a logic bug doesn't loop forever.
   */
  maxIterations?: number;
  /**
   * Wall-clock deadline (ms since epoch). If reached, the runner stops
   * mid-pass and throws a RunDurationExceededError. Pair with the
   * playbook's `run.maxDuration` setting.
   */
  deadlineMs?: number;
}

export class StuckRunnerError extends Error {
  constructor(public readonly iterations: number, public readonly readyIds: string[]) {
    super(
      `DAG runner stuck: ${iterations} consecutive iterations without DAG ` +
        `progress (${readyIds.length} node(s) ready but none completing). ` +
        `Inspect: ${readyIds.slice(0, 5).join(", ")}${readyIds.length > 5 ? "..." : ""}`,
    );
    this.name = "StuckRunnerError";
  }
}

export class RunDurationExceededError extends Error {
  constructor(public readonly deadlineMs: number) {
    super(
      `DAG runner exceeded wall-clock deadline (${new Date(deadlineMs).toISOString()}). ` +
        `Set a higher \`run.maxDuration\` in playbook.yml if this is expected.`,
    );
    this.name = "RunDurationExceededError";
  }
}

const DEFAULT_MAX_ITERATIONS = 10_000;

/** Return type for the executeNode callback. */
export interface NodeResult {
  success: boolean;
  completionData?: CompletionData;
  /** Children spawned by this task's seed executor — registered directly in runstate. */
  spawnedTasks?: Array<{ id: string; writeToPath: string }>;
}

function normalizeChecks(checks: unknown): RunStateCheck[] {
  if (!checks) return [];
  if (!Array.isArray(checks)) return [];
  return checks.map((c: any) => {
    if (typeof c === "string") return { id: c };
    return {
      id: c.id ?? "",
      description: c.description,
      cmd: c.cmd,
      type: c.type,
      check: c.check,
      name: c.name,
      args: c.args,
    };
  });
}

export async function executeDag(
  dag: TaskDag,
  runNode: (node: DagNode) => Promise<void>,
  opts: DagRunnerOpts,
): Promise<void> {
  // Guard: track iterations and detect "stuck" cycles where getReady()
  // keeps returning nodes but none of them transition. This catches
  // logic bugs (a node whose runNode resolves but doesn't change
  // status, an infinite seed-spawn loop, etc.) that would otherwise
  // hang the runner indefinitely. The deadline catches the wall-clock
  // version of the same hazard.
  const maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  let iter = 0;
  let lastReadySignature = "";
  let noProgressStreak = 0;
  while (true) {
    if (opts.deadlineMs && Date.now() >= opts.deadlineMs) {
      throw new RunDurationExceededError(opts.deadlineMs);
    }
    const ready = dag.getReady();
    if (ready.length === 0) break;
    iter++;
    // Detect stuck-runner: same ready set as last iteration, no completed
    // nodes between them. We compare by sorted-id signature so order
    // changes alone don't reset the streak.
    const signature = ready.map((n) => n.id).sort().join("|");
    if (signature === lastReadySignature) {
      noProgressStreak++;
      if (noProgressStreak >= 3) {
        throw new StuckRunnerError(
          iter,
          ready.map((n) => n.id),
        );
      }
    } else {
      noProgressStreak = 0;
      lastReadySignature = signature;
    }
    if (iter > maxIterations) {
      throw new StuckRunnerError(iter, ready.map((n) => n.id));
    }

    await Promise.all(
      ready.map(async (node) => {
        const startTime = Date.now();
        await opts.runResults?.markRunning(node.id);
        try {
          await runNode(node);
        } catch (err) {
          node.status = 'failed';
          dag.markFailed(node.id);
          const durationMs = Date.now() - startTime;
          await opts.runResults?.markFailed(
            node.id,
            err instanceof Error ? err.message : String(err),
            durationMs,
          );
          throw err;
        }
        dag.markComplete(node.id);
        const durationMs = Date.now() - startTime;
        await opts.runResults?.markComplete(node.id, durationMs);

        if (node.taskDef?.from_seed && opts.spawnChildren) {
          const spawned = await opts.spawnChildren(node, opts.projectDir);
          node.virtual = false;
          for (const child of spawned) {
            const childNode: DagNode = {
              id: child.id,
              type: "normal",
              parents: [node.id],
              children: [],
              depends_on: [node.id],
              depended_on_by: [],
              taskDef: child.taskDef,
              path:
                child.path ??
                join(dirname(node.path), 'tasks', child.id, 'TASK.md'),
              status: 'pending',
              virtual: false,
            };
            if (!node.children.includes(child.id)) {
              node.children.push(child.id);
            }
            dag.addNode(childNode);

            // Register the spawned child in RunState
            if (opts.runResults) {
              const td = child.taskDef;
              await opts.runResults.addSpawnedChildNode(
                child.id,
                node.id,
                [node.id],
                {
                  title: td.title,
                  description: td.description,
                  agent: td.agent,
                  skill: td.skill,
                  inputs: td.inputs,
                  outputs: td.outputs,
                  checks: normalizeChecks(td.checks),
                  tags: td.tags,
                  vars: td.vars,
                },
              );
            }
          }

          // Register parent → children relationship
          if (opts.runResults && spawned.length > 0) {
            await opts.runResults.addSpawnedChildren(
              node.id,
              spawned.map((c) => c.id),
            );
          }

          // Wire converge node: diverge nodes spawn children; find the
          // matching converge node and wire them into its depends_on.
          if (node.type === "diverge") {
            for (const [, cn] of dag.nodes) {
              if (cn.type === "converge" && node.children.some((ch: string) => cn.depends_on.includes(ch))) {
                for (const child of spawned) {
                  if (!cn.depends_on.includes(child.id)) {
                    cn.depends_on.push(child.id);
                  }
                }
              }
            }
          }
        }
      }),
    );
  }
}

/**
 * Run a DAG sequentially, one node at a time, in topological order.
 *
 * This is the dbt-style execution model: within each topological layer,
 * nodes are independent (no ordering between them). Between layers,
 * all nodes in layer N must complete before layer N+1 starts.
 *
 * Returns completion stats so callers can evaluate playbook-level
 * checks and decide whether to continue.
 */
export async function runDag(
  dag: TaskDag,
  executeNode: (node: DagNode) => Promise<NodeResult>,
  opts?: {
    concurrency?: number;
    runResults?: RunStateManager;
    maxIterations?: number;
    deadlineMs?: number;
  },
): Promise<{ completed: number; failed: number }> {
  const concurrency = opts?.concurrency ?? 1;
  const maxIterations = opts?.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  let completed = 0;
  let failed = 0;
  let iter = 0;
  let lastReadySignature = "";
  let noProgressStreak = 0;

  while (true) {
    if (opts?.deadlineMs && Date.now() >= opts.deadlineMs) {
      throw new RunDurationExceededError(opts.deadlineMs);
    }
    const ready = dag.getReady();
    if (ready.length === 0) break;
    iter++;
    const signature = ready.map((n) => n.id).sort().join("|");
    if (signature === lastReadySignature) {
      noProgressStreak++;
      if (noProgressStreak >= 3) {
        throw new StuckRunnerError(iter, ready.map((n) => n.id));
      }
    } else {
      noProgressStreak = 0;
      lastReadySignature = signature;
    }
    if (iter > maxIterations) {
      throw new StuckRunnerError(iter, ready.map((n) => n.id));
    }

    if (concurrency === 1) {
      // Sequential — one at a time. Recompute readiness after each node so
      // seed-spawned children registered during execution can run in the same pass.
      const node = ready[0];
      await opts?.runResults?.markRunning(node.id);
      const result = await executeNode(node);
      if (result.success) {
        if (node.status !== "seeded" && node.status !== "pass" && node.status !== "complete") {
          dag.markComplete(node.id);
        }
        completed++;
      } else {
        dag.markFailed(node.id);
        failed++;
      }
    } else {
      // Parallel within the currently-ready set (limited by concurrency).
      const chunk = ready.slice(0, concurrency);
      const results = await Promise.all(
        chunk.map(async (node) => {
          await opts?.runResults?.markRunning(node.id);
          const result = await executeNode(node);
          return { node, result };
        }),
      );
      for (const { node, result } of results) {
        if (result.success) {
          if (node.status !== "seeded" && node.status !== "pass" && node.status !== "complete") {
            dag.markComplete(node.id);
          }
          completed++;
        } else {
          dag.markFailed(node.id);
          failed++;
        }
      }
    }
  }

  return { completed, failed };
}
