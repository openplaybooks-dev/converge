/**
 * Tests for NavigatorGraph
 */

import { describe, it, expect } from "vitest";
import { NavigatorGraph } from "../src/graph.ts";
import type { GraphNode } from "../src/types.ts";

describe("NavigatorGraph", () => {
  it("addNode adds a node", () => {
    const graph = new NavigatorGraph();
    const node: GraphNode = {
      id: "test",
      handler: "test-handler",
      status: "buffered",
      origin: "initial",
    };
    
    graph.addNode(node);
    
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].id).toBe("test");
  });

  it("addNode is idempotent", () => {
    const graph = new NavigatorGraph();
    const node: GraphNode = {
      id: "test",
      handler: "test-handler",
      status: "buffered",
      origin: "initial",
    };
    
    graph.addNode(node);
    graph.addNode(node);
    
    expect(graph.nodes).toHaveLength(1);
  });

  it("hasNode returns true for existing node", () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "test",
      handler: "test-handler",
      status: "buffered",
      origin: "initial",
    });
    
    expect(graph.hasNode("test")).toBe(true);
    expect(graph.hasNode("nonexistent")).toBe(false);
  });

  it("getNode returns node by id", () => {
    const graph = new NavigatorGraph();
    const node: GraphNode = {
      id: "test",
      handler: "test-handler",
      status: "buffered",
      origin: "initial",
    };
    graph.addNode(node);
    
    const found = graph.getNode("test");
    expect(found).toBeDefined();
    expect(found?.id).toBe("test");
  });

  it("addEdge creates edge with timestamp", () => {
    const graph = new NavigatorGraph();
    
    graph.addEdge("a", "b", { iteration: 1 });
    
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].from).toBe("a");
    expect(graph.edges[0].to).toBe("b");
    expect(graph.edges[0].iteration).toBe(1);
    expect(graph.edges[0].ts).toBeDefined();
  });

  it("getBufferedNodes returns only buffered nodes", () => {
    const graph = new NavigatorGraph();
    graph.addNode({ id: "a", handler: "a", status: "buffered", origin: "initial" });
    graph.addNode({ id: "b", handler: "b", status: "done", origin: "initial" });
    graph.addNode({ id: "c", handler: "c", status: "buffered", origin: "initial" });
    
    const buffered = graph.getBufferedNodes();
    
    expect(buffered).toHaveLength(2);
    expect(buffered.map(n => n.id)).toEqual(["a", "c"]);
  });

  it("getNodesByHandler returns nodes with matching handler", () => {
    const graph = new NavigatorGraph();
    graph.addNode({ id: "a", handler: "test", status: "buffered", origin: "initial" });
    graph.addNode({ id: "b", handler: "other", status: "buffered", origin: "initial" });
    graph.addNode({ id: "c", handler: "test", status: "done", origin: "initial" });
    
    const nodes = graph.getNodesByHandler("test");
    
    expect(nodes).toHaveLength(2);
    expect(nodes.map(n => n.id)).toEqual(["a", "c"]);
  });

  it("getNodesByStatus returns nodes with matching status", () => {
    const graph = new NavigatorGraph();
    graph.addNode({ id: "a", handler: "a", status: "done", origin: "initial" });
    graph.addNode({ id: "b", handler: "b", status: "failed", origin: "initial" });
    graph.addNode({ id: "c", handler: "c", status: "done", origin: "initial" });
    
    const done = graph.getNodesByStatus("done");
    
    expect(done).toHaveLength(2);
    expect(done.map(n => n.id)).toEqual(["a", "c"]);
  });

  it("lastExecuted returns last executed node", () => {
    const graph = new NavigatorGraph();
    graph.addNode({ id: "a", handler: "a", status: "done", origin: "initial" });
    graph.addNode({ id: "b", handler: "b", status: "done", origin: "initial" });
    graph.addEdge("_start", "a");
    graph.addEdge("a", "b");
    
    const last = graph.lastExecuted();
    
    expect(last?.id).toBe("b");
  });

  it("getLastN returns last N executed nodes", () => {
    const graph = new NavigatorGraph();
    graph.addNode({ id: "a", handler: "a", status: "done", origin: "initial" });
    graph.addNode({ id: "b", handler: "b", status: "done", origin: "initial" });
    graph.addNode({ id: "c", handler: "c", status: "done", origin: "initial" });
    graph.addEdge("_start", "a");
    graph.addEdge("a", "b");
    graph.addEdge("b", "c");
    
    const last2 = graph.getLastN(2);
    
    expect(last2).toHaveLength(2);
    expect(last2.map(n => n.id)).toEqual(["b", "c"]);
  });

  it("toJSON serializes graph", () => {
    const graph = new NavigatorGraph();
    graph.addNode({ id: "a", handler: "a", status: "done", origin: "initial" });
    graph.addEdge("_start", "a");
    
    const json = graph.toJSON();
    
    expect(json.nodes).toHaveLength(1);
    expect(json.edges).toHaveLength(1);
    expect(json.nodes[0].id).toBe("a");
  });

  it("fromJSON deserializes graph", () => {
    const data = {
      nodes: [{ id: "a", handler: "a", status: "done" as const, origin: "initial" as const }],
      edges: [{ from: "_start", to: "a", iteration: 1, ts: "2026-01-01T00:00:00Z" }],
    };
    
    const graph = NavigatorGraph.fromJSON(data);
    
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(1);
    expect(graph.nodes[0].id).toBe("a");
  });

  it("toJSON strips function values from data", () => {
    const graph = new NavigatorGraph();
    graph.addNode({
      id: "a",
      handler: "a",
      status: "buffered",
      origin: "initial",
      data: {
        priority: 10,
        fn: () => {},
        value: "test",
      },
    });
    
    const json = graph.toJSON();
    
    expect(json.nodes[0].data).toEqual({ priority: 10, value: "test" });
  });
});
