import type { TaskDefinition } from "../config/task-definition.ts";

export type DagNodeStatus = 'pending' | 'ready' | 'running' | 'complete' | 'failed' | 'blocked' | 'pass' | 'seeded';
export type DagNodeType = 'normal' | 'diverge' | 'converge' | 'hook';

export interface DagNode {
  id: string;
  type: DagNodeType;
  /** True when a converge node has no body/prompt — completes immediately. */
  convergePassthrough?: boolean;
  /**
   * Inventory parent — set when this node is a static-nested or runtime-spawned
   * child. The single source of truth for hierarchy. RFC 0049 Phase B.
   *
   * `node.parents[0]` is also populated from this for back-compat with
   * existing seed-spawn wiring; new code should read `parent` directly and
   * use `TaskDag.childrenOf(id)` to derive children.
   */
  parent?: string;
  /**
   * @deprecated Use `parent` and `TaskDag.childrenOf(id)` for hierarchy.
   * `parents`/`children` model a tree relationship that exists parallel
   * to the DAG. All new code should use only depends_on/depended_on_by.
   * These fields remain for backward compatibility with dag-tree.ts and
   * the seed-spawn wiring in addNode()/getReady().
   */
  parents: string[];
  /**
   * @deprecated Use `TaskDag.childrenOf(id)` instead. This is now a
   * build-time snapshot of inventory-derived children, not a mutable
   * reverse-edge list. RFC 0049 Phase B.
   */
  children: string[];
  depends_on: string[];
  depended_on_by: string[];
  taskDef: TaskDefinition;
  path: string;
  status: DagNodeStatus;
  virtual: boolean;
  /**
   * IDs of subtasks spawned from this node at runtime (e.g. by a seed script
   * or `converge spawn task`). Populated lazily by the runner; absent on
   * nodes that never spawn children.
   */
  spawned_children?: string[];
}
