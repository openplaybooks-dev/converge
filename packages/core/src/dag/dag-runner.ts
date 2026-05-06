import { join, dirname } from 'path';
import type { DagNode } from './dag-node.js';
import type { TaskDefinition } from '../config/task-definition.js';
import { TaskDag } from './task-dag.js';
import type { RunStateManager } from '../manifest/run-state-manager.js';
import type { CompletionData, RunStateCheck } from '../manifest/types.js';

export interface SpawnedChild {
  id: string;
  taskDef: TaskDefinition;
  path?: string;
}

export interface DagRunnerOpts {
  projectDir: string;
  spawnChildren?: (node: DagNode, projectDir: string) => Promise<SpawnedChild[]>;
  runResults?: RunStateManager;
}

/** Return type for the executeNode callback. */
export interface NodeResult {
  success: boolean;
  completionData?: CompletionData;
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
  while (true) {
    const ready = dag.getReady();
    if (ready.length === 0) break;

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

        // Queue tasks: if not converged, reset to pending for next iteration
        if ((node as any)._queueNotConverged) {
          node.status = 'pending';
          dag.resetToPending(node.id);
        }

        if (node.taskDef?.from_seed && opts.spawnChildren) {
          const spawned = await opts.spawnChildren(node, opts.projectDir);
          node.virtual = false;
          for (const child of spawned) {
            const childNode: DagNode = {
              id: child.id,
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
  opts?: { concurrency?: number; runResults?: RunStateManager },
): Promise<{ completed: number; failed: number }> {
  const concurrency = opts?.concurrency ?? 1;
  let completed = 0;
  let failed = 0;

  const layers = dag.topologicalOrder();

  for (const layer of layers) {
    const ready = layer.filter((n) => n.status === "pending");

    if (concurrency === 1) {
      // Sequential — one at a time
      for (const node of ready) {
        await opts?.runResults?.markRunning(node.id);
        const result = await executeNode(node);
        if (result.success) {
          dag.markComplete(node.id);
          completed++;
        } else {
          dag.markFailed(node.id);
          failed++;
        }
      }
    } else {
      // Parallel within layer (limited by concurrency)
      const chunks: DagNode[][] = [];
      for (let i = 0; i < ready.length; i += concurrency) {
        chunks.push(ready.slice(i, i + concurrency));
      }
      for (const chunk of chunks) {
        const results = await Promise.all(
          chunk.map(async (node) => {
            await opts?.runResults?.markRunning(node.id);
            const result = await executeNode(node);
            return { node, result };
          }),
        );
        for (const { node, result } of results) {
          if (result.success) {
            dag.markComplete(node.id);
            completed++;
          } else {
            dag.markFailed(node.id);
            failed++;
          }
        }
      }
    }
  }

  return { completed, failed };
}
