import type { RuntimeLedgerState, RuntimeTask, TaskRuntimeStatus } from "./runtime-ledger.ts";

export interface TopologyLevel {
  index: number;
  tasks: RuntimeTask[];
}

export interface TopologyReadySet {
  level: number;
  tasks: RuntimeTask[];
}

function dependencyIds(task: RuntimeTask): string[] {
  const deps = new Set<string>();
  for (const dep of task.depends_on ?? []) deps.add(dep);
  if (task.parent) deps.add(task.parent);
  return [...deps];
}

function sortTasks(tasks: RuntimeTask[]): RuntimeTask[] {
  return [...tasks].sort((a, b) => a.id.localeCompare(b.id));
}

export class TaskTopology {
  readonly levels: TopologyLevel[] = [];
  private readonly taskById = new Map<string, RuntimeTask>();
  private readonly levelById = new Map<string, number>();
  private readonly spawnTailByParent = new Map<string, number>();

  constructor(tasks: RuntimeTask[] = []) {
    for (const task of tasks) this.taskById.set(task.id, task);
    this.rebuildLevels();
  }

  static fromLedger(state: RuntimeLedgerState): TaskTopology {
    return new TaskTopology(state.tasks);
  }

  addTask(task: RuntimeTask): void {
    this.taskById.set(task.id, task);
    this.rebuildLevels();
  }

  addSpawnedLevel(parentId: string, children: RuntimeTask[]): void {
    const parentLevel = this.levelById.get(parentId);
    if (parentLevel === undefined) {
      throw new Error(`Unknown parent task: ${parentId}`);
    }

    const insertionIndex = (this.spawnTailByParent.get(parentId) ?? parentLevel) + 1;
    const level: TopologyLevel = {
      index: insertionIndex,
      tasks: sortTasks(children),
    };

    for (const child of children) {
      this.taskById.set(child.id, child);
    }

    this.levels.splice(insertionIndex, 0, level);
    this.normalizeLevels();
    this.spawnTailByParent.set(parentId, insertionIndex);
  }

  markComplete(taskId: string): void {
    const task = this.taskById.get(taskId);
    if (!task) return;
    task.status = "done";
  }

  markFailed(taskId: string): void {
    const task = this.taskById.get(taskId);
    if (!task) return;
    task.status = "dropped";
  }

  getReady(): TopologyReadySet | null {
    for (const level of this.levels) {
      const ready = level.tasks.filter((task) => this.isReady(task));
      if (ready.length > 0) {
        return { level: level.index, tasks: ready };
      }
      if (level.tasks.some((task) => this.isTerminal(task.status))) {
        continue;
      }
      if (level.tasks.some((task) => (task.status ?? "todo") !== "done")) {
        return { level: level.index, tasks: ready };
      }
    }
    return null;
  }

  private isReady(task: RuntimeTask): boolean {
    if (this.isTerminal(task.status)) return false;
    const deps = dependencyIds(task);
    return deps.every((depId) => {
      const dep = this.taskById.get(depId);
      return dep ? dep.status === "done" : true;
    });
  }

  private isTerminal(status: TaskRuntimeStatus | undefined): boolean {
    return status === "done" || status === "dropped";
  }

  private rebuildLevels(): void {
    this.levels.length = 0;
    this.levelById.clear();

    const tasks = [...this.taskById.values()];
    const depthById = new Map<string, number>();
    const visiting = new Set<string>();

    const depth = (taskId: string): number => {
      const cached = depthById.get(taskId);
      if (cached !== undefined) return cached;
      if (visiting.has(taskId)) return 0;
      visiting.add(taskId);

      const task = this.taskById.get(taskId);
      if (!task) {
        visiting.delete(taskId);
        depthById.set(taskId, 0);
        return 0;
      }

      let maxDepth = 0;
      for (const depId of dependencyIds(task)) {
        if (!this.taskById.has(depId)) continue;
        maxDepth = Math.max(maxDepth, depth(depId) + 1);
      }

      visiting.delete(taskId);
      depthById.set(taskId, maxDepth);
      return maxDepth;
    };

    for (const task of tasks) depth(task.id);

    const grouped = new Map<number, RuntimeTask[]>();
    for (const task of tasks) {
      const levelIndex = depthById.get(task.id) ?? 0;
      const bucket = grouped.get(levelIndex) ?? [];
      bucket.push(task);
      grouped.set(levelIndex, bucket);
      this.levelById.set(task.id, levelIndex);
    }

    for (const [index, bucket] of [...grouped.entries()].sort((a, b) => a[0] - b[0])) {
      this.levels.push({ index, tasks: sortTasks(bucket) });
    }
    this.normalizeLevels();
  }

  private normalizeLevels(): void {
    for (let i = 0; i < this.levels.length; i++) {
      this.levels[i] = {
        index: i,
        tasks: sortTasks(this.levels[i].tasks),
      };
      for (const task of this.levels[i].tasks) {
        this.levelById.set(task.id, i);
      }
    }
  }
}

