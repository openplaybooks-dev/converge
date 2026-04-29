import dagre from "dagre";

export interface LayoutNode {
  id: string;
  width: number;
  height: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

export function layoutDag(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 80, marginx: 32, marginy: 32 });

  for (const node of nodes) {
    g.setNode(node.id, { width: node.width, height: node.height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    const dn = g.node(node.id);
    positions[node.id] = {
      x: dn.x - node.width / 2,
      y: dn.y - node.height / 2,
    };
  }
  return positions;
}
