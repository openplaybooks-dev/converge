import type { SelectorNode, AtomNode } from "./types.ts";

// --- Manifest types ---

export interface ManifestNode {
  state: string;
  id: string;
  depends_on: string[];
  depended_on_by: string[];
  wbs: { type: string; path: string } | null;
  tags?: string[];
}

export interface Manifest {
  nodes: Record<string, ManifestNode>;
  child_map: Record<string, string[]>;
  parent_map: Record<string, string[]>;
}

export interface FrontierInfo {
  parentId: string;
  reason: string;
}

export interface ResolveResult {
  ids: Set<string>;
  frontiers: FrontierInfo[];
}

// --- Matching ---

function matchByName(value: string, manifest: Manifest): Set<string> {
  const ids = new Set<string>();
  for (const id of Object.keys(manifest.nodes)) {
    if (id === value || id.includes(value)) {
      ids.add(id);
    }
  }
  return ids;
}

function matchByTag(value: string, manifest: Manifest): Set<string> {
  const ids = new Set<string>();
  for (const [id, node] of Object.entries(manifest.nodes)) {
    if (node.tags && node.tags.includes(value)) {
      ids.add(id);
    }
  }
  return ids;
}

function matchAtom(atom: AtomNode, manifest: Manifest): Set<string> {
  switch (atom.method) {
    case "name":
      return matchByName(atom.value, manifest);
    case "tag":
      return matchByTag(atom.value, manifest);
    default:
      return new Set<string>();
  }
}

// --- Traversal ---

function isFrontier(id: string, manifest: Manifest): boolean {
  const node = manifest.nodes[id];
  if (!node) return false;
  return node.state === "frontier" && node.wbs !== null;
}

function walkAncestors(
  startId: string,
  manifest: Manifest,
  maxDepth: number | null,
): ResolveResult {
  const ids = new Set<string>();
  const frontiers: FrontierInfo[] = [];
  if (maxDepth === null) return { ids, frontiers };

  let current = new Set<string>([startId]);
  let depth = 0;

  while (current.size > 0 && (maxDepth === 0 || depth < maxDepth)) {
    const next = new Set<string>();
    for (const id of current) {
      const parents = manifest.parent_map[id] || [];
      for (const parentId of parents) {
        if (!ids.has(parentId)) {
          ids.add(parentId);
          next.add(parentId);
        }
      }
    }
    current = next;
    depth++;
  }

  return { ids, frontiers };
}

function walkDescendants(
  startId: string,
  manifest: Manifest,
  maxDepth: number | null,
): ResolveResult {
  const ids = new Set<string>();
  const frontiers: FrontierInfo[] = [];
  if (maxDepth === null) return { ids, frontiers };

  let current = new Set<string>([startId]);
  let depth = 0;

  while (current.size > 0 && (maxDepth === 0 || depth < maxDepth)) {
    const next = new Set<string>();
    for (const id of current) {
      const children = manifest.child_map[id] || [];
      for (const childId of children) {
        if (isFrontier(childId, manifest)) {
          frontiers.push({ parentId: childId, reason: "unseeded-wbs" });
          continue;
        }
        if (!ids.has(childId)) {
          ids.add(childId);
          next.add(childId);
        }
      }
    }
    current = next;
    depth++;
  }

  return { ids, frontiers };
}

// --- Atom resolution ---

function resolveAtom(atom: AtomNode, manifest: Manifest): ResolveResult {
  const matched = matchAtom(atom, manifest);
  const ids = new Set(matched);
  const frontiers: FrontierInfo[] = [];

  for (const id of matched) {
    if (atom.ancestors !== null) {
      const result = walkAncestors(id, manifest, atom.ancestors);
      for (const aid of result.ids) ids.add(aid);
      frontiers.push(...result.frontiers);
    }

    if (atom.descendants !== null) {
      const result = walkDescendants(id, manifest, atom.descendants);
      for (const did of result.ids) ids.add(did);
      frontiers.push(...result.frontiers);
    }

    if (atom.subgraph) {
      // Task + all ancestors + ancestors of all descendants
      const ancResult = walkAncestors(id, manifest, 0);
      for (const aid of ancResult.ids) ids.add(aid);

      const descResult = walkDescendants(id, manifest, 0);
      for (const did of descResult.ids) ids.add(did);
      frontiers.push(...descResult.frontiers);

      // For each descendant, add its ancestors
      for (const did of descResult.ids) {
        const dancResult = walkAncestors(did, manifest, 0);
        for (const daid of dancResult.ids) ids.add(daid);
      }
      // Also ancestors of frontier descendants
      for (const f of descResult.frontiers) {
        const fancResult = walkAncestors(f.parentId, manifest, 0);
        for (const faid of fancResult.ids) ids.add(faid);
      }
    }
  }

  return { ids, frontiers };
}

// --- Selector resolution ---

export function resolveSelector(
  selector: SelectorNode,
  manifest: Manifest,
  opts?: { exclude?: SelectorNode },
): ResolveResult {
  const result = resolveNode(selector, manifest);

  if (opts?.exclude) {
    const excludeResult = resolveNode(opts.exclude, manifest);
    for (const id of excludeResult.ids) {
      result.ids.delete(id);
    }
  }

  return result;
}

function resolveNode(
  node: SelectorNode,
  manifest: Manifest,
): ResolveResult {
  switch (node.type) {
    case "atom":
      return resolveAtom(node.atom, manifest);

    case "union": {
      const ids = new Set<string>();
      const frontiers: FrontierInfo[] = [];
      for (const operand of node.operands) {
        const r = resolveNode(operand, manifest);
        for (const id of r.ids) ids.add(id);
        frontiers.push(...r.frontiers);
      }
      return { ids, frontiers };
    }

    case "intersection": {
      if (node.operands.length === 0)
        return { ids: new Set(), frontiers: [] };
      let ids = resolveNode(node.operands[0], manifest).ids;
      let frontiers: FrontierInfo[] = [];
      for (let i = 1; i < node.operands.length; i++) {
        const r = resolveNode(node.operands[i], manifest);
        ids = new Set([...ids].filter((id) => r.ids.has(id)));
        frontiers.push(...r.frontiers);
      }
      return { ids, frontiers };
    }
  }
}
