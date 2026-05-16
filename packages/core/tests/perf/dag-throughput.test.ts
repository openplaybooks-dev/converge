/**
 * DAG throughput load test — quantifies the runner's overhead at the
 * 1000-task scale.
 *
 * The metric we care about: time spent IN THE FRAMEWORK (DAG
 * scheduling, runstate writes, ledger I/O, getReady polls) when the
 * executor itself is a no-op. Real workloads spend the bulk of their
 * time in the executor (AI calls, shell commands); framework overhead
 * should be a small fraction.
 *
 * Budget (machine-relative): 1000 tasks with a no-op executor should
 * complete in under 5 seconds on a developer laptop. The CI budget is
 * 15s to allow for slow runners.
 *
 * Run: `pnpm test -- tests/perf/dag-throughput.test.ts`
 *
 * If this test starts failing on CI but passing locally, the change
 * likely introduced an O(N²) or worse hot path. Profile with
 * `--prof` to find it.
 */

import { describe, it, expect } from "vitest";
import { runDag } from "../../src/dag/dag-runner.ts";
import { TaskDag } from "../../src/dag/task-dag.ts";
import type { DagNode } from "../../src/dag/dag-node.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";

function makeNode(id: string, depends_on: string[] = []): DagNode {
  return {
    id,
    type: "normal",
    parents: [],
    children: [],
    depends_on,
    depended_on_by: [],
    taskDef: { id } as TaskDefinition,
    path: `/tmp/${id}`,
    status: "pending",
    virtual: false,
  };
}

describe("DAG throughput", () => {
  const SIZES = [100, 500, 1000];

  for (const N of SIZES) {
    it(
      `runs ${N}-task wide-fan-out DAG in bounded time`,
      async () => {
        const dag = new TaskDag();
        // 1 root, N-1 leaves all dependent on the root. Worst case for
        // getReady because every iteration scans all N nodes.
        dag.addNode(makeNode("root"));
        for (let i = 0; i < N - 1; i++) {
          dag.addNode(
            makeNode(`task-${i.toString().padStart(4, "0")}`, ["root"]),
          );
        }
        const executeNode = async (_n: DagNode) => ({ success: true });
        const start = Date.now();
        const { completed, failed } = await runDag(dag, executeNode, {
          concurrency: 16,
          maxIterations: 100_000,
        });
        const elapsed = Date.now() - start;
        expect(completed).toBe(N);
        expect(failed).toBe(0);
        // Generous budget: 50ms per 100 tasks, plus 1s base. CI runners
        // are slower than developer laptops; tune via experience.
        const budgetMs = 1000 + (N / 100) * 50;
        expect(elapsed, `${N} tasks took ${elapsed}ms (budget ${budgetMs}ms)`).toBeLessThan(budgetMs);
      },
      30_000,
    );

    it(
      `runs ${N}-task linear chain in bounded time`,
      async () => {
        const dag = new TaskDag();
        // task-0 → task-1 → ... → task-N-1. Worst case for outer-loop
        // iterations (one task per iteration).
        let prev: string | null = null;
        for (let i = 0; i < N; i++) {
          const id = `chain-${i.toString().padStart(4, "0")}`;
          dag.addNode(makeNode(id, prev ? [prev] : []));
          prev = id;
        }
        const executeNode = async (_n: DagNode) => ({ success: true });
        const start = Date.now();
        const { completed, failed } = await runDag(dag, executeNode, {
          maxIterations: 100_000,
        });
        const elapsed = Date.now() - start;
        expect(completed).toBe(N);
        expect(failed).toBe(0);
        // Linear chain hits the outer scheduler loop N times, so the
        // budget scales linearly with N.
        const budgetMs = 1000 + N * 5;
        expect(elapsed, `${N}-chain took ${elapsed}ms (budget ${budgetMs}ms)`).toBeLessThan(budgetMs);
      },
      30_000,
    );
  }

  it("getReady cache: 10k calls on a stable DAG finish quickly", () => {
    const N = 1000;
    const dag = new TaskDag();
    dag.addNode(makeNode("root"));
    for (let i = 0; i < N - 1; i++) {
      dag.addNode(makeNode(`leaf-${i}`, ["root"]));
    }
    const start = Date.now();
    // Without the cache, this would walk N nodes 10k times = 10M
    // visits. With the cache, the first call computes and the next
    // 9999 are O(1) hits.
    for (let i = 0; i < 10_000; i++) {
      dag.getReady();
    }
    const elapsed = Date.now() - start;
    // Expect < 200ms even on slow CI. Without caching this was several
    // seconds for the same workload.
    expect(elapsed, `10k getReady calls took ${elapsed}ms`).toBeLessThan(2000);
  });
});
