/**
 * Navigator Graph — Graph Implementation
 *
 * The graph is the single source of truth: executed nodes, buffered nodes,
 * and edges. All participants (navigator, actions, planning) read and write it.
 * Serializable to disk for crash-safe checkpointing.
 */

import type { Graph, GraphNode, GraphEdge, NodeStatus } from "./types.js";

export class NavigatorGraph implements Graph {
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];

  /* ---------------------------------------------------------------- */
  /*  Node operations                                                  */
  /* ---------------------------------------------------------------- */

  addNode(node: GraphNode): void {
    if (this.hasNode(node.id)) return; // idempotent
    this.nodes.push(node);
  }

  hasNode(id: string): boolean {
    return this.nodes.some((n) => n.id === id);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.find((n) => n.id === id);
  }

  /* ---------------------------------------------------------------- */
  /*  Edge operations                                                  */
  /* ---------------------------------------------------------------- */

  addEdge(from: string, to: string, meta?: { iteration?: number }): void {
    this.edges.push({
      from,
      to,
      iteration: meta?.iteration ?? 0,
      ts: new Date().toISOString(),
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Queries                                                          */
  /* ---------------------------------------------------------------- */

  getBufferedNodes(): GraphNode[] {
    return this.nodes.filter((n) => n.status === "buffered");
  }

  getNodesByHandler(handler: string): GraphNode[] {
    return this.nodes.filter((n) => n.handler === handler);
  }

  getNodesByStatus(status: NodeStatus): GraphNode[] {
    return this.nodes.filter((n) => n.status === status);
  }

  /** Last node that completed execution, by edge order */
  lastExecuted(): GraphNode | undefined {
    const executed = this.getExecutionOrder();
    return executed.length > 0 ? executed[executed.length - 1] : undefined;
  }

  /** Last N executed nodes in execution order */
  getLastN(n: number): GraphNode[] {
    const executed = this.getExecutionOrder();
    return executed.slice(-n);
  }

  /** Nth node from the end of the execution order (1 = last, 2 = second-to-last) */
  nthFromEnd(n: number): GraphNode | undefined {
    const executed = this.getExecutionOrder();
    const idx = executed.length - n;
    return idx >= 0 ? executed[idx] : undefined;
  }

  /* ---------------------------------------------------------------- */
  /*  Execution order                                                  */
  /* ---------------------------------------------------------------- */

  /** Returns executed nodes (done/failed) ordered by edge timestamps */
  private getExecutionOrder(): GraphNode[] {
    // Build order from edges — each edge 'to' is a node that was executed
    const orderMap = new Map<string, number>();
    for (let i = 0; i < this.edges.length; i++) {
      const e = this.edges[i];
      // Last edge wins for ordering
      orderMap.set(e.to, i);
    }

    return this.nodes
      .filter((n) => n.status === "done" || n.status === "failed")
      .sort((a, b) => (orderMap.get(a.id) ?? -1) - (orderMap.get(b.id) ?? -1));
  }

  /* ---------------------------------------------------------------- */
  /*  Serialization                                                    */
  /* ---------------------------------------------------------------- */

  toJSON(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: this.nodes.map((n) => ({
        ...n,
        // Strip function values from data (not serializable)
        data: n.data
          ? Object.fromEntries(
              Object.entries(n.data).filter(([, v]) => typeof v !== "function"),
            )
          : undefined,
      })),
      edges: [...this.edges],
    };
  }

  static fromJSON(data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  }): NavigatorGraph {
    const g = new NavigatorGraph();
    g.nodes = data.nodes ?? [];
    g.edges = data.edges ?? [];
    return g;
  }
}
