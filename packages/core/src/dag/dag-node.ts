import type { TaskDefinition } from "../config/task-definition.ts";

export type DagNodeStatus = 'pending' | 'ready' | 'running' | 'complete' | 'failed';

export interface DagNode {
  id: string;
  parents: string[];
  children: string[];
  depends_on: string[];
  depended_on_by: string[];
  taskDef: TaskDefinition;
  path: string;
  status: DagNodeStatus;
  virtual: boolean;
}
