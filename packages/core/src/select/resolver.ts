import type { SelectorNode, AtomNode } from "./types.ts";

// --- Manifest types ---

export interface ManifestNode {
  state: string;
  id: string;
  depends_on: string[];
  depended_on_by: string[];
  wbs: { type: string; path: string } | null;
  tags?: string[];
  frontmatter_hash?: string;
  body_hash?: string;
  checks_hash?: string;
  inputs_hash?: string;
  upstream_hash?: string;
  drifted?: string;
}

export interface Manifest {
  nodes: Record<string, ManifestNode>;
  child_map: Record<string, string[]>;
  parent_map: Record<string, string[]>;
  metadata?: { playbook_hash?: string };
}

export interface FrontierInfo {
  parentId: string;
  reason: string;
}

export interface ResolveResult {
  ids: Set<string>;
  frontiers: FrontierInfo[];
}

// --- State:modified sub-methods ---

const SUB_METHODS: Record<string, (a: ManifestNode, b: ManifestNode) => boolean> = {
  body:        (a, b) => a.body_hash !== b.body_hash,
  frontmatter: (a, b) => a.frontmatter_hash !== b.frontmatter_hash && a.checks_hash === b.checks_hash,
  checks:      (a, b) => a.checks_hash !== b.checks_hash,
  inputs:      (a, b) => a.inputs_hash !== b.inputs_hash,
  upstream:    (a, b) => a.upstream_hash !== b.upstream_hash,
  drifted:     (a, b) => a.drifted !== b.drifted,
};

function resolveStateAtom(atom: AtomNode, manifest: Manifest, stateManifest: Manifest): ResolveResult {
  const match = atom.value.match(/^modified\.(.+)$/);
  if (!match) return { ids: new Set(), frontiers: [] };
  const sub = match[1];

  if (sub === "playbook") {
    const prev = stateManifest.metadata?.playbook_hash;
    const curr = manifest.metadata?.playbook_hash;
    if (prev !== undefined && curr !== undefined && prev !== curr) {
      return { ids: new Set(Object.keys(manifest.nodes)), frontiers: [] };
    }
    return { ids: new Set(), frontiers: [] };
  }

  const predicate = SUB_METHODS[sub];
  if (!predicate) return { ids: new Set(), frontiers: [] };

  const ids = new Set<string>();
  for (const [id, node] of Object.entries(manifest.nodes)) {
    const stateNode = stateManifest.nodes[id];
    if (stateNode && predicate(stateNode, node)) {
      ids.add(id);
    }
  }
  return { ids, frontiers: [] };
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
  // Fall back to name matching when no tasks have explicit tags
  if (ids.size === 0) {
    return matchByName(value, manifest);
  }
  return ids;
}

function matchByState(value: string, manifest: Manifest): Set<string> {
  const ids = new Set<string>();
  for (const [id, node] of Object.entries(manifest.nodes)) {
    if (node.state === value) ids.add(id);
  }
  return ids;
}

function matchByGlob(value: string, ids: Iterable<string>): Set<string> {
  if (value === "*" || value === "") return new Set(ids);
  const re = new RegExp("^" + value.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
  const out = new Set<string>();
  for (const id of ids) if (re.test(id)) out.add(id);
  return out;
}

function matchAtom(atom: AtomNode, manifest: Manifest): Set<string> {
  switch (atom.method) {
    case "name":
      return matchByName(atom.value, manifest);
    case "tag":
      return matchByTag(atom.value, manifest);
    case "frontier":
      return matchByGlob(atom.value, matchByState("frontier", manifest));
    case "concrete":
      return matchByGlob(atom.value, matchByState("concrete", manifest));
    case "expected":
      return matchByGlob(atom.value, matchByState("expected", manifest));
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
  opts?: { exclude?: SelectorNode; stateManifest?: Manifest },
): ResolveResult {
  const result = resolveNode(selector, manifest, opts?.stateManifest);

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
  stateManifest?: Manifest,
): ResolveResult {
  switch (node.type) {
    case "atom":
      if (node.atom.method === "state" && stateManifest) {
        return resolveStateAtom(node.atom, manifest, stateManifest);
      }
      return resolveAtom(node.atom, manifest);

    case "union": {
      const ids = new Set<string>();
      const frontiers: FrontierInfo[] = [];
      for (const operand of node.operands) {
        const r = resolveNode(operand, manifest, stateManifest);
        for (const id of r.ids) ids.add(id);
        frontiers.push(...r.frontiers);
      }
      return { ids, frontiers };
    }

    case "intersection": {
      if (node.operands.length === 0)
        return { ids: new Set(), frontiers: [] };
      let ids = resolveNode(node.operands[0], manifest, stateManifest).ids;
      let frontiers: FrontierInfo[] = [];
      for (let i = 1; i < node.operands.length; i++) {
        const r = resolveNode(node.operands[i], manifest, stateManifest);
        ids = new Set([...ids].filter((id) => r.ids.has(id)));
        frontiers.push(...r.frontiers);
      }
      return { ids, frontiers };
    }
  }
}
