import { topologicalSort } from './topological-sort';
import type { DagNode, DagNodeStatus } from './dag-node';
import type { Manifest } from '../manifest/types';
import type { TaskDefinition } from '../config/task-definition';

export class TaskDag {
  nodes: Map<string, DagNode> = new Map();
  roots: DagNode[] = [];
  playbookName = "";

  /**
   * Memoized result of the last getReady() scan. Invalidated when any
   * node's status changes (markComplete / markFailed / addNode). Within
   * a single quiescent state, repeated getReady() calls return in O(1)
   * instead of re-walking every node. The runner's outer loop calls
   * getReady() at most once per iteration, but several internal paths
   * (the no-progress detector, status checks, replay tooling) call it
   * multiple times; this cache turns those into free re-reads.
   */
  private _readyCache: DagNode[] | null = null;

  /**
   * Called whenever the DAG's mutable state changes. After invalidation,
   * the next getReady() will recompute and re-cache.
   */
  private _invalidateReady(): void {
    this._readyCache = null;
  }

  /**
   * Children indexed by parent id. The single source of truth for hierarchy
   * (RFC 0049 Phase B). Populated in `addNode` from each node's `parent`
   * field. Use `childrenOf(id)` rather than reading `node.children` directly.
   */
  private childrenByParent: Map<string, string[]> = new Map();

  /**
   * Return the inventory-derived children of `id` (rows whose `parent === id`).
   * Empty array if the node has no children or doesn't exist. Stable order:
   * insertion order matches the order `addNode` saw them.
   */
  childrenOf(id: string): string[] {
    return this.childrenByParent.get(id) ?? [];
  }

  addNode(node: DagNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`);
    }
    this._invalidateReady();
    this.nodes.set(node.id, node);

    // Hierarchy: `parent` registers the node under its parent's
    // `childrenOf` bucket. RFC 0049: this is the ONLY way children get
    // tracked — `node.children` is no longer mutated.
    const parentId = node.parent ?? node.parents?.[0];
    if (parentId) this._registerChild(parentId, node.id);

    // Forward dep resolution: this node declares its own deps.
    for (const depId of node.depends_on) {
      if (depId.startsWith("tag:")) {
        this._resolveForwardTagDep(node, depId.substring(4));
      } else {
        const dep = this.nodes.get(depId);
        if (dep) this._addReverseEdge(dep, node.id);
      }
    }

    // Back-fill: existing nodes already declared this node as a dep
    // (exact ID, then by tag). The forward pass doesn't catch these
    // because it walks `node.depends_on`, not other nodes'.
    for (const [otherId, other] of this.nodes) {
      if (otherId === node.id) continue;
      if (other.depends_on.includes(node.id)) {
        this._addReverseEdge(node, otherId);
        continue;
      }
      for (const depId of other.depends_on) {
        if (depId.startsWith("tag:") && this._hasTag(node, depId.substring(4))) {
          this._addReverseEdge(node, otherId);
          this._addForwardDep(other, node.id);
          break;
        }
      }
    }

    this._recomputeRoots();
  }

  /** Append `childId` to `parent`'s `depended_on_by` if not present. */
  private _addReverseEdge(parent: DagNode, childId: string): void {
    if (!parent.depended_on_by.includes(childId)) {
      parent.depended_on_by.push(childId);
    }
  }

  /** Append `depId` to `node.depends_on` if not present. */
  private _addForwardDep(node: DagNode, depId: string): void {
    if (!node.depends_on.includes(depId)) {
      node.depends_on.push(depId);
    }
  }

  private _hasTag(node: DagNode, tag: string): boolean {
    return ((node.taskDef as any)?.tags ?? []).includes(tag);
  }

  /**
   * Resolve a `tag:foo` dep declared by `node` against the existing
   * DAG. Each existing node whose tags include `tag` becomes a real
   * dep: appended to `node.depends_on` (forward) and to its
   * `depended_on_by` (reverse).
   */
  private _resolveForwardTagDep(node: DagNode, tag: string): void {
    for (const [otherId, other] of this.nodes) {
      if (otherId === node.id) continue;
      if (!this._hasTag(other, tag)) continue;
      this._addReverseEdge(other, node.id);
      this._addForwardDep(node, otherId);
    }
  }

  private _registerChild(parentId: string, childId: string): void {
    let bucket = this.childrenByParent.get(parentId);
    if (!bucket) {
      bucket = [];
      this.childrenByParent.set(parentId, bucket);
    }
    if (!bucket.includes(childId)) bucket.push(childId);
  }

  getReady(): DagNode[] {
    if (this._readyCache !== null) return this._readyCache;
    const ready: DagNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.status !== 'pending') continue;
      const depsSatisfied = node.depends_on.every(depId =>
        this._depSatisfied(node, depId),
      );
      if (depsSatisfied) ready.push(node);
    }
    // Stable ordering by id. The runner calls getReady() once per pass,
    // but several internal paths (no-progress detector, status checks,
    // replay tooling) call it multiple times within a quiescent state;
    // this cache turns those into free re-reads.
    ready.sort((a, b) => a.id.localeCompare(b.id));
    this._readyCache = ready;
    return ready;
  }

  /**
   * Is `node.depends_on[i]` satisfied for `node`?
   *
   * Rule (RFC 0049): a dep with children blocks downstream non-child
   * dependents until every child is terminal. Children themselves
   * unblock on `seeded` (their parent has run). The dep's
   * `depended_on_by` was a conflated reverse-edge list before; that
   * is gone, and `childrenOf` is the only source of truth.
   *
   * Hooks run after their dep finishes on any status (task:fail hooks
   * fire on failure, task:complete hooks can inspect and no-op).
   */
  private _depSatisfied(node: DagNode, depId: string): boolean {
    const dep = this.nodes.get(depId);
    if (!dep) return false; // unresolved dep → block

    if (dep.status === "complete" || dep.status === "pass") {
      return this._childrenAllDoneOrNone(depId, node.id);
    }
    if (dep.status === "seeded") {
      if (this.childrenOf(depId).includes(node.id)) return true;
      return this._childrenAllDoneOrNone(depId, node.id);
    }
    if (node.type === "hook" && dep.status === "failed") return true;
    return false;
  }

  /**
   * True when `depId` has no children, or every child is terminal AND
   * the current node is not one of them. A child of `depId` is exempt
   * from the wait (it triggers via the `seeded` branch in
   * `_depSatisfied`).
   */
  private _childrenAllDoneOrNone(depId: string, nodeId: string): boolean {
    const children = this.childrenOf(depId);
    if (children.length === 0 || children.includes(nodeId)) return true;
    return children.every(childId => {
      const child = this.nodes.get(childId);
      return child != null && (child.status === "complete" || child.status === "pass");
    });
  }

  getDownstream(id: string): DagNode[] {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    return node.depended_on_by
      .map(childId => this.nodes.get(childId))
      .filter((n): n is DagNode => n != null);
  }

  getUpstream(id: string): DagNode[] {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    return node.depends_on
      .map(parentId => this.nodes.get(parentId))
      .filter((n): n is DagNode => n != null);
  }

  markComplete(id: string): void {
    this._setStatus(id, "complete");
  }

  markFailed(id: string): void {
    this._setStatus(id, "failed");
  }

  /**
   * Mark a node's status. The single mutator — direct property writes
   * would skip the ready-cache invalidation. Use the specific helpers
   * (`markComplete`, `markFailed`, `markBlocked`, `markSeeded`) where
   * possible; this is the escape hatch.
   */
  private _setStatus(id: string, status: DagNodeStatus): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    node.status = status;
    this._invalidateReady();
  }

  markBlocked(id: string): void {
    this._setStatus(id, "blocked");
  }

  /**
   * Body has run; the node is waiting for its children (RFC 0049's
   * unified completion rule). Used for both static-nested and
   * runtime-spawned parents.
   */
  markSeeded(id: string): void {
    this._setStatus(id, "seeded");
  }

  /**
   * Reset a task back to pending so it re-executes in the next DAG pass.
   * Silent no-op if the node isn't in the DAG (queue tasks can be reset
   * before they materialise). Use `markBlocked` for the throwing path.
   */
  resetToPending(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    node.status = "pending";
    this._invalidateReady();
  }

  /**
   * Register a runtime-spawned child with its parent. Called by the
   * spawn pipeline when a seed task emits a spawn command. Idempotent.
   * The actual node may or may not be in the DAG yet — the bucket is
   * the source of truth for hierarchy, not `node.parents` (which is
   * deprecated).
   */
  registerSpawnedChild(parentId: string, childId: string): void {
    this._registerChild(parentId, childId);
    this._invalidateReady();
  }

  topologicalOrder(): DagNode[][] {
    const layers = topologicalSort(this.nodes);
    return layers.map(layer => layer.map(id => this.nodes.get(id)!));
  }

  toManifest(): Manifest {
    const nodes: Record<string, any> = {};
    const child_map: Record<string, string[]> = {};
    const parent_map: Record<string, string[]> = {};

    for (const [id, node] of this.nodes) {
      nodes[id] = {
        id: node.id,
        depends_on: [...node.depends_on],
        depended_on_by: [...node.depended_on_by],
        tags: [],
        checks: [],
        inputs: [],
        outputs: [],
        stub: node.taskDef.stub,
        frontmatter_hash: '',
        body_hash: '',
        checks_hash: '',
        inputs_hash: '',
        upstream_hash: '',
        state: 'concrete',
        path: node.path,
        seed: null,
      };
      // RFC 0049: child_map is the inventory hierarchy, not the
      // legacy `spawned_children` field. parent_map is the single
      // `parent` value (with the deprecated `parents` array as
      // fallback for ledgers written before Phase B).
      child_map[id] = [...(this.childrenByParent.get(id) ?? [])];
      parent_map[id] = node.parent ? [node.parent] : [...node.parents];
    }

    return {
      metadata: {
        playbook: '',
        generated_at: new Date().toISOString(),
        converge_version: '0.1.0',
        frontier_count: 0,
      },
      nodes,
      child_map,
      parent_map,
    } as Manifest;
  }

  static fromManifest(m: Manifest): TaskDag {
    const dag = new TaskDag();
    for (const [id, mNode] of Object.entries(m.nodes)) {
      const parents = m.parent_map[id] ?? [];
      dag.nodes.set(id, {
        id,
        type: "normal",
        // `parent` is the RFC 0049 source of truth; fall back to
        // legacy `parents[0]` for manifests written before Phase B.
        parent: parents[0],
        parents: [...parents],
        children: [...(m.child_map[id] ?? [])],
        depends_on: [...((mNode as any).depends_on ?? [])],
        depended_on_by: [...((mNode as any).depended_on_by ?? [])],
        taskDef: { id } as TaskDefinition,
        path: (mNode as any).path ?? '',
        status: 'pending',
        virtual: false,
      });
    }
    // Re-populate `childrenByParent` from each node's `parent` so
    // `childrenOf(id)` works on manifest-restored DAGs.
    for (const node of dag.nodes.values()) {
      if (node.parent) dag._registerChild(node.parent, node.id);
    }
    dag._recomputeRoots();
    return dag;
  }

  private _recomputeRoots(): void {
    this.roots = [];
    for (const node of this.nodes.values()) {
      // Root iff no depends_on AND no parent (`parent` or legacy
      // `parents[0]`). Honor both so spawned children registered with
      // either field aren't misclassified.
      const hasHierarchy = node.parent != null || node.parents.length > 0;
      if (node.depends_on.length === 0 && !hasHierarchy) {
        this.roots.push(node);
      }
    }
  }
}
