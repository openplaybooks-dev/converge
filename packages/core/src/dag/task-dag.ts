import { topologicalSort } from './topological-sort';
import type { DagNode } from './dag-node';
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

  addNode(node: DagNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`);
    }
    this._invalidateReady();
    this.nodes.set(node.id, node);

    // Resolve exact-ID depends_on
    for (const depId of node.depends_on) {
      if (depId.startsWith("tag:")) {
        // Tag dependency — resolved below after node is in the map
        continue;
      }
      const dep = this.nodes.get(depId);
      if (dep) {
        if (!dep.depended_on_by.includes(node.id)) {
          dep.depended_on_by.push(node.id);
        }
        if (!dep.children.includes(node.id)) {
          dep.children.push(node.id);
        }
      }
    }

    // Resolve tag-based depends_on for this node (find existing nodes matching its tags)
    for (const depId of node.depends_on) {
      if (!depId.startsWith("tag:")) continue;
      const tag = depId.substring(4);
      for (const [otherId, other] of this.nodes) {
        if (otherId === node.id) continue;
        const taskDef = other.taskDef as any;
        const otherTags: string[] = taskDef?.tags ?? [];
        if (otherTags.includes(tag)) {
          if (!other.depended_on_by.includes(node.id)) {
            other.depended_on_by.push(node.id);
          }
          if (!other.children.includes(node.id)) {
            other.children.push(node.id);
          }
          if (!node.depends_on.includes(otherId)) {
            node.depends_on.push(otherId);
          }
        }
      }
    }

    // Back-fill: existing nodes that depend on this node by exact ID
    for (const [otherId, other] of this.nodes) {
      if (otherId === node.id) continue;
      if (other.depends_on.includes(node.id)) {
        if (!node.depended_on_by.includes(otherId)) {
          node.depended_on_by.push(otherId);
        }
        if (!node.children.includes(otherId)) {
          node.children.push(otherId);
        }
      }
    }

    // Back-fill: existing nodes that depend on this node's tags
    const nodeTags: string[] = (node.taskDef as any)?.tags ?? [];
    for (const [otherId, other] of this.nodes) {
      if (otherId === node.id) continue;
      for (const depId of other.depends_on) {
        if (!depId.startsWith("tag:")) continue;
        const tag = depId.substring(4);
        if (nodeTags.includes(tag)) {
          if (!node.depended_on_by.includes(otherId)) {
            node.depended_on_by.push(otherId);
          }
          if (!node.children.includes(otherId)) {
            node.children.push(otherId);
          }
          if (!other.depends_on.includes(node.id)) {
            other.depends_on.push(node.id);
          }
        }
      }
    }

    for (const parentId of node.parents) {
      const parent = this.nodes.get(parentId);
      if (parent) {
        parent.spawned_children ??= [];
        if (!parent.spawned_children.includes(node.id)) {
          parent.spawned_children.push(node.id);
        }
      }
    }

    this._recomputeRoots();
  }

  getReady(): DagNode[] {
    if (this._readyCache !== null) return this._readyCache;
    const ready: DagNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.status !== 'pending') continue;
      // A dependency is satisfied when:
      //   - complete/pass: task finished successfully
      //   - seeded: parent spawned its children — children can now run;
      //     but non-child dependents blocked (checked below)
      const depsSatisfied = node.depends_on.every(depId => {
        const dep = this.nodes.get(depId);
        if (!dep) return false; // unresolved dep → block
        if (dep.status === 'complete' || dep.status === 'pass') {
          // If the dependency has children and THIS node is NOT one of them,
          // wait until all children complete. This prevents downstream tasks
          // from starting before a container's children have finished.
          const spawned = dep.spawned_children ?? [];
          if (spawned.length > 0 && !spawned.includes(node.id)) {
            const allSpawnedDone = spawned.every(childId => {
              const child = this.nodes.get(childId);
              return child && (child.status === 'complete' || child.status === 'pass');
            });
            if (!allSpawnedDone) return false;
          }
          return true;
        }
        // "seeded" satisfies deps for the spawned children themselves
        // (they need the parent to have run, which "seeded" proves).
        // Non-child dependents still blocked.
        if (dep.status === 'seeded' && (dep.spawned_children ?? []).includes(node.id)) return true;
        // Hook nodes run after their dependency finishes, even on failure.
        // task:fail hooks need to run after a failed task; task:complete
        // hooks can also inspect the result and decide to no-op.
        if (node.type === 'hook' && dep.status === 'failed') return true;
        return false;
      });
      if (depsSatisfied) {
        ready.push(node);
      }
    }
    // Stable, deterministic ordering: sort ready nodes by id (lex
    // ascending). Previously the order was Map.keys() insertion order
    // — fine for a static playbook, but spawned children registered
    // mid-run insert at the tail, which made the execution order
    // depend on *when* a parent ran. Sorting here guarantees the same
    // playbook + same DAG topology always yields the same execution
    // sequence, regardless of insertion timing. This is the property
    // tests, replay tooling, and dbt-style incremental runs depend on.
    ready.sort((a, b) => a.id.localeCompare(b.id));
    this._readyCache = ready;
    return ready;
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
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    node.status = 'complete';
    this._invalidateReady();
  }

  markFailed(id: string): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    node.status = 'failed';
    this._invalidateReady();
  }

  /**
   * Reset a task back to pending so it will re-execute in the next DAG pass.
   * Used by queue tasks that need to process multiple batches.
   */
  resetToPending(id: string): void {
    const node = this.nodes.get(id);
    if (node) {
      node.status = 'pending';
      this._invalidateReady();
    }
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
        frontmatter_hash: '',
        body_hash: '',
        checks_hash: '',
        inputs_hash: '',
        upstream_hash: '',
        state: 'concrete',
        path: node.path,
        seed: null,
      };
      child_map[id] = [...(node.spawned_children ?? [])];
      parent_map[id] = [...node.parents];
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
      const node: DagNode = {
        id,
        type: "normal",
        parents: [...(m.parent_map[id] ?? [])],
        children: [...(m.child_map[id] ?? [])],
        depends_on: [...((mNode as any).depends_on ?? [])],
        depended_on_by: [...((mNode as any).depended_on_by ?? [])],
        taskDef: { id } as TaskDefinition,
        path: (mNode as any).path ?? '',
        status: 'pending',
        virtual: false,
      };
      dag.nodes.set(id, node);
    }
    dag._recomputeRoots();
    return dag;
  }

  private _recomputeRoots(): void {
    this.roots = [];
    for (const node of this.nodes.values()) {
      // A node is a root iff it has no depends_on AND no parents.
      // The `parents` field is deprecated (in favor of depends_on) but still
      // used by seed-spawn wiring and several tests; honor it here so we
      // don't classify spawned children as roots.
      if (node.depends_on.length === 0 && node.parents.length === 0) {
        this.roots.push(node);
      }
    }
  }
}
