import type { TaskDefinition } from "../config/task-definition.ts";

export type DagNodeStatus = 'pending' | 'ready' | 'running' | 'complete' | 'failed' | 'pass' | 'seeded';
export type DagNodeType = 'normal' | 'diverge' | 'converge' | 'hook';

export interface DagNode {
  id: string;
  type: DagNodeType;
  /** True when a converge node has no body/prompt — completes immediately. */
  convergePassthrough?: boolean;
  /**
   * @deprecated Use depends_on/depended_on_by for DAG edges.
   * `parents`/`children` model a tree relationship that exists parallel
   * to the DAG. All new code should use only depends_on/depended_on_by.
   * These fields remain for backward compatibility with dag-tree.ts and
   * the seed-spawn wiring in addNode()/getReady().
   */
  parents: string[];
  /** @deprecated Use depends_on/depended_on_by instead. */
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
