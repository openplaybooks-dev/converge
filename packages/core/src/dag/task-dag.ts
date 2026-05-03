import { topologicalSort } from './topological-sort.js';
import type { DagNode } from './dag-node.js';
import type { Manifest } from '../manifest/types.js';
import type { TaskDefinition } from '../config/task-definition.js';

export class TaskDag {
  nodes: Map<string, DagNode> = new Map();
  roots: DagNode[] = [];

  addNode(node: DagNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`);
    }
    this.nodes.set(node.id, node);

    for (const depId of node.depends_on) {
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

    for (const parentId of node.parents) {
      const parent = this.nodes.get(parentId);
      if (parent && !parent.children.includes(node.id)) {
        parent.children.push(node.id);
      }
    }

    this._recomputeRoots();
  }

  getReady(): DagNode[] {
    const ready: DagNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.status !== 'pending') continue;
      const depsSatisfied = node.depends_on.every(
        depId => this.nodes.get(depId)?.status === 'complete'
      );
      if (depsSatisfied) {
        ready.push(node);
      }
    }
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
  }

  markFailed(id: string): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    node.status = 'failed';
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
        wbs: null,
      };
      child_map[id] = [...node.children];
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
      if (node.parents.length === 0) {
        this.roots.push(node);
      }
    }
  }
}
