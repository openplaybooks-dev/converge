/**
 * TaskManagerImpl — runtime API surface for task discovery.
 *
 * Before iter-10, `run(taskId)` returned `{ status: "completed" }`
 * without executing anything, lying to any caller that consumed the
 * return value as a real lifecycle signal. The replacement throws with
 * a clear pointer to the proper entry point (`run()` from
 * `packages/core/src/run/index.ts`).
 *
 * `list()` and `get(taskId)` are pure read-only and remain useful.
 */
import { describe, it, expect } from "vitest";
import { TaskManagerImpl } from "../../../src/runtime/task-manager.ts";
import type { EpicDefinition } from "../../../src/task/checks/types.ts";

function makeEpics(): EpicDefinition[] {
  return [
    {
      id: "epic-1",
      title: "Epic One",
      tasks: [
        { id: "task-a", title: "Task A" },
        { id: "task-b", title: "Task B" },
      ],
    },
    {
      id: "epic-2",
      title: "Epic Two",
      tasks: [{ id: "task-c", title: "Task C" }],
    },
  ] as unknown as EpicDefinition[];
}

describe("TaskManagerImpl", () => {
  it("list() flattens tasks across epics", () => {
    const tm = new TaskManagerImpl(makeEpics());
    const all = tm.list();
    expect(all.map((t) => t.id).sort()).toEqual(["task-a", "task-b", "task-c"]);
  });

  it("get(taskId) returns the matching task or undefined", () => {
    const tm = new TaskManagerImpl(makeEpics());
    expect(tm.get("task-b")?.title).toBe("Task B");
    expect(tm.get("nonexistent")).toBeUndefined();
  });

  it("run(missingId) throws 'Task not found'", async () => {
    const tm = new TaskManagerImpl(makeEpics());
    await expect(tm.run("missing")).rejects.toThrow(/Task not found/);
  });

  it("run(existingId) refuses the silent-success placeholder path with a clear diagnostic", async () => {
    const tm = new TaskManagerImpl(makeEpics());
    await expect(tm.run("task-a")).rejects.toThrow(/not implemented/);
    await expect(tm.run("task-a")).rejects.toThrow(
      /@openplaybooks\/converge-core\/run/,
    );
  });
});
