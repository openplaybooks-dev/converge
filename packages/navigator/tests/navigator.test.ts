/**
 * Tests for Navigator convergence loop
 */

import { describe, it, expect } from "vitest";
import { NavigatorGraph } from "../src/graph.ts";
import { PredicateRegistry } from "../src/predicates.ts";
import { converge } from "../src/navigator.ts";
import type { BaseSnapshot, ActionHandler, WalkResult } from "../src/types.ts";

interface TestSnapshot extends BaseSnapshot {
  counter: number;
  done: boolean;
}

describe("Navigator", () => {
  it("executes single action and returns success", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "action1",
      handler: "action1",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });

    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      ["action1", async () => ({ action: "done", success: true })],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const result = await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
    });

    expect(result.success).toBe(true);
    expect(result.actionsExecuted).toBe(1);
  });

  it("executes multiple actions in sequence", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "action1",
      handler: "action1",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });
    graph.addNode({
      id: "action2",
      handler: "action2",
      status: "buffered",
      origin: "initial",
      data: { priority: 5 },
    });

    const executed: string[] = [];
    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      [
        "action1",
        async () => {
          executed.push("action1");
          return { action: "continue" };
        },
      ],
      [
        "action2",
        async () => {
          executed.push("action2");
          return { action: "done", success: true };
        },
      ],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const result = await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
    });

    expect(result.success).toBe(true);
    expect(executed).toEqual(["action1", "action2"]);
  });

  it("respects priority order", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "low",
      handler: "low",
      status: "buffered",
      origin: "initial",
      data: { priority: 5 },
    });
    graph.addNode({
      id: "high",
      handler: "high",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });

    const executed: string[] = [];
    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      [
        "low",
        async () => {
          executed.push("low");
          return { action: "continue" };
        },
      ],
      [
        "high",
        async () => {
          executed.push("high");
          return { action: "done", success: true };
        },
      ],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
    });

    expect(executed[0]).toBe("high");
  });

  it("applies predicates to filter applicable actions", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "conditional",
      handler: "conditional",
      status: "buffered",
      origin: "initial",
      data: { priority: 10, applicable: "isDone" },
    });
    graph.addNode({
      id: "always",
      handler: "always",
      status: "buffered",
      origin: "initial",
      data: { priority: 5 },
    });

    const executed: string[] = [];
    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      [
        "conditional",
        async () => {
          executed.push("conditional");
          return { action: "done", success: true };
        },
      ],
      [
        "always",
        async () => {
          executed.push("always");
          return { action: "done", success: true };
        },
      ],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    predicates.register("isDone", (snap) => snap.done);

    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
    });

    // conditional is not applicable (done=false), so always runs
    expect(executed).toEqual(["always"]);
  });

  it("stops at max actions", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "infinite",
      handler: "infinite",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });

    let count = 0;
    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      [
        "infinite",
        async (snap, g) => {
          count++;
          // Add another buffered node to continue
          g.addNode({
            id: `infinite-${count}`,
            handler: "infinite",
            status: "buffered",
            origin: "reactive",
            data: { priority: 10 },
          });
          return { action: "continue" };
        },
      ],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const result = await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 5,
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Max actions reached");
    expect(result.actionsExecuted).toBe(5);
  });

  it("checks termination conditions", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "increment",
      handler: "increment",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });

    let count = 0;
    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      [
        "increment",
        async (snap, g) => {
          count++;
          // Keep adding nodes until target is reached
          if (snap.counter + 1 < 3) {
            g.addNode({
              id: `increment-${count}`,
              handler: "increment",
              status: "buffered",
              origin: "reactive",
              data: { priority: 10 },
            });
          }
          return {
            action: "continue",
            state: { counter: snap.counter + 1 }
          };
        },
      ],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const result = await converge({
      graph,
      snapshot,
      registry,
      predicates,
      terminationConditions: [
        { name: "counterReached", check: (snap) => snap.counter >= 3 },
      ],
      maxActions: 10,
    });

    expect(result.success).toBe(true);
    expect(result.reason).toBe("All termination conditions satisfied");
  });

  it("handles unknown handler", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "unknown",
      handler: "unknown",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });

    const registry = new Map<string, ActionHandler<TestSnapshot>>();
    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const result = await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
    });

    expect(result.success).toBe(false);
    expect(result.reason).toContain("Unknown handler");
  });

  it("detects stall after repeated failures", async () => {
    const graph = new NavigatorGraph();

    // Pre-populate graph with failed nodes to simulate stall condition
    // Stall detection needs 3 consecutive failures or duplicate handler failures
    for (let i = 0; i < 3; i++) {
      const node = {
        id: `pre-fail-${i}`,
        handler: "fail",
        status: "failed" as const,
        origin: "initial" as const,
        result: {
          action: "bail" as const,
          reason: "failed",
          durationMs: 0,
        },
      };
      graph.addNode(node);
      graph.addEdge(i === 0 ? "_start" : `pre-fail-${i - 1}`, node.id);
    }

    // Add a node that returns continue (not bail) so stall detection runs
    graph.addNode({
      id: "trigger-stall",
      handler: "continue-handler",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });

    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      ["continue-handler", async () => ({ action: "continue" })],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const result = await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Stalled — repeated failures");
  });

  it("calls lifecycle hooks", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "action1",
      handler: "action1",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });

    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      ["action1", async () => ({ action: "done", success: true })],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const hooks: string[] = [];

    await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
      onBeforeAction: async (node) => {
        hooks.push(`before:${node.id}`);
      },
      onAfterAction: async (node) => {
        hooks.push(`after:${node.id}`);
      },
    });

    expect(hooks).toEqual(["before:action1", "after:action1"]);
  });

  it("returns no applicable action when no nodes match predicates", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "conditional",
      handler: "conditional",
      status: "buffered",
      origin: "initial",
      data: { priority: 10, applicable: "neverTrue" },
    });

    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      ["conditional", async () => ({ action: "done", success: true })],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    predicates.register("neverTrue", () => false);

    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const result = await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("No applicable action");
  });

  it("handles action errors with retry strategy", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "flaky",
      handler: "flaky",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });

    let attempts = 0;
    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      [
        "flaky",
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error("Temporary failure");
          }
          return { action: "done", success: true };
        },
      ],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const result = await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
      maxRetries: 3,
      onError: async () => "retry",
    });

    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
    expect(result.metrics.retryCount).toBe(2);
  });

  it("handles action errors with skip strategy", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "error",
      handler: "error",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });
    graph.addNode({
      id: "next",
      handler: "next",
      status: "buffered",
      origin: "initial",
      data: { priority: 5 },
    });

    const executed: string[] = [];
    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      [
        "error",
        async () => {
          executed.push("error");
          throw new Error("Permanent failure");
        },
      ],
      [
        "next",
        async () => {
          executed.push("next");
          return { action: "done", success: true };
        },
      ],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const result = await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
      onError: async () => "skip",
    });

    expect(result.success).toBe(true);
    expect(executed).toEqual(["error", "next"]);
    expect(result.metrics.errorCount).toBe(1);
  });

  it("handles action timeout", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "slow",
      handler: "slow",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });

    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      [
        "slow",
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return { action: "done", success: true };
        },
      ],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const result = await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
      actionTimeout: 100,
      onError: async () => "bail",
    });

    expect(result.success).toBe(false);
    expect(result.reason).toContain("timeout");
  });

  it("emits events during execution", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "action1",
      handler: "action1",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });

    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      ["action1", async () => ({ action: "done", success: true })],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const events: string[] = [];

    await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
      onEvent: async (event) => {
        events.push(event.type);
      },
    });

    expect(events).toContain("action_start");
    expect(events).toContain("action_complete");
  });

  it("provides metrics in result", async () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "action1",
      handler: "action1",
      status: "buffered",
      origin: "initial",
      data: { priority: 10 },
    });

    const registry = new Map<string, ActionHandler<TestSnapshot>>([
      ["action1", async () => ({ action: "done", success: true })],
    ]);

    const predicates = new PredicateRegistry<TestSnapshot>();
    const snapshot: TestSnapshot = { iteration: 1, counter: 0, done: false };

    const result = await converge({
      graph,
      snapshot,
      registry,
      predicates,
      maxActions: 10,
    });

    expect(result.metrics).toBeDefined();
    expect(result.metrics.actionsExecuted).toBe(1);
    expect(result.metrics.actionDurations.has("action1")).toBe(true);
    expect(result.metrics.graphSize.nodes).toBeGreaterThan(0);
  });
});
