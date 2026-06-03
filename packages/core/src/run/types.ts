export type RunEvent =
  | { kind: "run-start"; playbook: string; runId: string; projectDir: string }
  | { kind: "compile-start" }
  | { kind: "compile-complete"; nodeCount: number; cachedCount: number }
  | { kind: "compile-error"; errors: { type: string; message: string }[] }
  | {
      kind: "select-applied";
      selected: number;
      skipped: number;
      expression: string;
    }
  | { kind: "dry-run"; pending: string[]; cached: string[]; skipped: string[] }
  | { kind: "task-start"; taskId: string; attempt: number }
  | { kind: "task-cached"; taskId: string }
  | { kind: "task-skipped"; taskId: string; reason: string }
  | { kind: "task-complete"; taskId: string; durationMs: number }
  | { kind: "task-failed"; taskId: string; error: string; durationMs: number }
  | {
      kind: "children-spawned";
      parentId: string;
      children: { id: string; title?: string }[];
    }
  | { kind: "log"; level: "info" | "warn" | "error"; message: string }
  | {
      kind: "run-complete";
      completed: number;
      failed: number;
      durationMs: number;
    }
  | { kind: "run-aborted"; reason: string; message?: string }
  | { kind: "run-paused"; reason: string; message?: string };

export interface Reporter {
  emit(event: RunEvent): void;
}
