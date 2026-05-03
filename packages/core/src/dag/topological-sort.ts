import type { DagNode } from "./dag-node.ts";

export function topologicalSort(nodes: Map<string, DagNode>): string[][] {
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const [id] of nodes) {
    inDegree.set(id, 0);
    dependents.set(id, []);
  }

  for (const [id, node] of nodes) {
    for (const dep of node.depends_on) {
      if (!nodes.has(dep)) continue;
      inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
      dependents.get(dep)!.push(id);
    }
  }

  const layers: string[][] = [];
  const remaining = new Set(nodes.keys());

  while (remaining.size > 0) {
    const layer: string[] = [];
    for (const id of remaining) {
      if ((inDegree.get(id) ?? 0) === 0) {
        layer.push(id);
      }
    }

    if (layer.length === 0) {
      const cycle = detectCycle(nodes);
      throw new Error(
        `Cycle detected in DAG: ${cycle?.join(" → ") ?? "unknown"}`
      );
    }

    for (const id of layer) {
      remaining.delete(id);
      for (const dep of dependents.get(id)!) {
        inDegree.set(dep, (inDegree.get(dep) ?? 1) - 1);
      }
    }

    layers.push(layer);
  }

  return layers;
}

export function detectCycle(nodes: Map<string, DagNode>): string[] | null {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string>();

  for (const [id] of nodes) {
    color.set(id, WHITE);
  }

  function dfs(u: string): string[] | null {
    color.set(u, GRAY);
    const node = nodes.get(u)!;
    for (const v of node.depends_on) {
      if (!nodes.has(v)) continue;
      const c = color.get(v)!;
      if (c === GRAY) {
        const cycle: string[] = [v];
        let cur = u;
        while (cur !== v) {
          cycle.push(cur);
          cur = parent.get(cur)!;
        }
        cycle.push(v);
        return cycle;
      }
      if (c === WHITE) {
        parent.set(v, u);
        const result = dfs(v);
        if (result) return result;
      }
    }
    color.set(u, BLACK);
    return null;
  }

  for (const [id] of nodes) {
    if (color.get(id) === WHITE) {
      const result = dfs(id);
      if (result) return result;
    }
  }

  return null;
}
